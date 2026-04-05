/**
 * Database Backup Script
 *
 * Dumps the PostgreSQL database using pg_dump and uploads the compressed
 * backup file to Firebase Storage under backups/{YYYY-MM-DD}/.
 *
 * Usage:
 *   node scripts/backup.js
 *
 * Required env vars (same as the main app):
 *   DATABASE_URL              — postgres connection string
 *   FIREBASE_STORAGE_BUCKET   — Firebase Storage bucket name
 *
 * Firebase credentials are read from firebase-service-account.json
 * (searched at process.cwd() then src/../../ — same as the main app).
 *
 * Requires pg_dump to be installed and on PATH (standard with PostgreSQL).
 */

'use strict';

require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// ── Validate env ──────────────────────────────────────────────────────────────

const DATABASE_URL = process.env.DATABASE_URL;
const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET;

if (!DATABASE_URL) {
  console.error('[backup] ERROR: DATABASE_URL is not set in environment');
  process.exit(1);
}
if (!STORAGE_BUCKET) {
  console.error('[backup] ERROR: FIREBASE_STORAGE_BUCKET is not set in environment');
  process.exit(1);
}

// ── Resolve Firebase service account ─────────────────────────────────────────

const candidates = [
  path.join(process.cwd(), 'firebase-service-account.json'),
  path.join(__dirname, '..', '..', 'firebase-service-account.json'),
];
const serviceAccountPath = candidates.find(p => fs.existsSync(p));
if (!serviceAccountPath) {
  console.error('[backup] ERROR: firebase-service-account.json not found');
  process.exit(1);
}

// ── Init Firebase Admin ───────────────────────────────────────────────────────

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    storageBucket: STORAGE_BUCKET,
  });
}
const bucket = admin.storage().bucket();

// ── Run backup ────────────────────────────────────────────────────────────────

async function run() {
  const now = new Date();
  const datestamp = now.toISOString().slice(0, 10);               // YYYY-MM-DD
  const timestamp = now.toISOString().replace(/[:.]/g, '-');      // for filename
  const filename  = `ipam-backup-${timestamp}.sql.gz`;
  const localPath = path.join('/tmp', filename);

  // ── Step 1: pg_dump → gzip ────────────────────────────────────────────────
  console.log(`[backup] Dumping database to ${localPath} …`);
  try {
    execSync(`pg_dump "${DATABASE_URL}" | gzip > "${localPath}"`, { stdio: 'inherit' });
  } catch (err) {
    console.error('[backup] pg_dump failed:', err.message);
    process.exit(1);
  }

  const stat = fs.statSync(localPath);
  const sizeMb = (stat.size / 1024 / 1024).toFixed(2);
  console.log(`[backup] Dump complete — ${sizeMb} MB`);

  // ── Step 2: Upload to Firebase Storage ───────────────────────────────────
  const storagePath = `backups/${datestamp}/${filename}`;
  console.log(`[backup] Uploading to gs://${STORAGE_BUCKET}/${storagePath} …`);
  try {
    await bucket.upload(localPath, {
      destination: storagePath,
      metadata: {
        contentType: 'application/gzip',
        metadata: {
          createdAt: now.toISOString(),
          sourceDb: DATABASE_URL.replace(/:[^@]+@/, ':***@'), // redact password
        },
      },
    });
  } catch (err) {
    console.error('[backup] Upload failed:', err.message);
    fs.unlinkSync(localPath);
    process.exit(1);
  }

  // ── Step 3: Clean up local file ──────────────────────────────────────────
  fs.unlinkSync(localPath);
  console.log(`[backup] Done. Backup stored at gs://${STORAGE_BUCKET}/${storagePath}`);

  // ── Step 4: Prune backups older than 30 days ─────────────────────────────
  console.log('[backup] Pruning backups older than 30 days …');
  try {
    const [files] = await bucket.getFiles({ prefix: 'backups/' });
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let pruned = 0;
    for (const file of files) {
      const created = new Date(file.metadata.timeCreated).getTime();
      if (created < cutoff) {
        await file.delete();
        console.log(`[backup] Deleted old backup: ${file.name}`);
        pruned++;
      }
    }
    console.log(`[backup] Pruned ${pruned} old backup(s)`);
  } catch (err) {
    // Pruning failure is non-fatal — backup already succeeded
    console.warn('[backup] WARNING: Pruning failed:', err.message);
  }

  process.exit(0);
}

run();
