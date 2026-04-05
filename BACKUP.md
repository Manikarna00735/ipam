# Database Backup & Restore Guide

## Overview

| Item | Detail |
|---|---|
| **Backup storage** | Firebase Storage — `gs://<bucket>/backups/YYYY-MM-DD/` |
| **Format** | `pg_dump` plain SQL, gzip-compressed (`.sql.gz`) |
| **Retention** | 30 days (older files auto-pruned on each backup run) |
| **RPO** (max data loss) | 24 hours if running daily; less if run more frequently |
| **RTO** (restore time) | ~5–15 minutes depending on database size |

---

## Taking a Manual Backup

Requires `pg_dump` on PATH (comes with PostgreSQL) and env vars set.

```bash
npm run backup
```

Output confirms the storage path:
```
[backup] Dumping database to /tmp/ipam-backup-2026-04-05T...sql.gz …
[backup] Dump complete — 1.23 MB
[backup] Uploading to gs://your-bucket/backups/2026-04-05/ipam-backup-....sql.gz …
[backup] Done. Backup stored at gs://your-bucket/backups/2026-04-05/ipam-backup-....sql.gz
[backup] Pruned 0 old backup(s)
```

---

## Scheduling Automatic Backups

### Option A — Render Cron Job (recommended)
In your Render dashboard, create a **Cron Job** service pointing to this repo:
- **Command:** `node scripts/backup.js`
- **Schedule:** `0 2 * * *` (daily at 2 AM UTC)
- **Environment:** same env vars as the main service (`DATABASE_URL`, `FIREBASE_STORAGE_BUCKET`)

### Option B — System cron (if self-hosted)
```bash
0 2 * * * cd /path/to/ipam && npm run backup >> /var/log/ipam-backup.log 2>&1
```

---

## Restoring from Backup

### Step 1 — Download the backup file

Go to Firebase Console → Storage → `backups/` and download the `.sql.gz` file you want to restore, or use `gsutil`:

```bash
gsutil cp gs://<bucket>/backups/2026-04-05/ipam-backup-2026-04-05T02-00-00-000Z.sql.gz ./restore.sql.gz
```

### Step 2 — Decompress

```bash
gunzip restore.sql.gz
# produces restore.sql
```

### Step 3 — (Optional) Spin up a test database first

Always test the restore against a fresh database before touching production:

```bash
createdb ipam_restore_test
psql ipam_restore_test < restore.sql
```

Spot-check a few tables:
```sql
SELECT COUNT(*) FROM assets;
SELECT COUNT(*) FROM networks;
SELECT COUNT(*) FROM devices;
```

### Step 4 — Restore to target database

**WARNING: This overwrites all existing data in the target database.**

```bash
# Drop and recreate (destructive — confirm before running)
dropdb ipam_production
createdb ipam_production
psql ipam_production < restore.sql
```

Or restore into the existing database without dropping (may cause conflicts on duplicate keys):
```bash
psql "$DATABASE_URL" < restore.sql
```

### Step 5 — Re-run migrations

Ensure the schema is fully up to date after restore:

```bash
npm run migrate
```

### Step 6 — Smoke test

Restart the server and verify the health check:

```bash
curl https://your-app.onrender.com/health
# Expected: { "status": "ok", "database": "ok" }
```

---

## Verifying a Backup is Valid

Run this after every scheduled backup (or after a manual one):

```bash
# 1. Download latest backup
gsutil cp $(gsutil ls gs://<bucket>/backups/ | sort | tail -1)*.sql.gz ./verify.sql.gz

# 2. Decompress
gunzip verify.sql.gz

# 3. Restore into a temp DB
createdb ipam_verify_$(date +%s)
psql ipam_verify_$(date +%s) < verify.sql

# 4. Count rows in key tables
psql ipam_verify_$(date +%s) -c "SELECT 'assets', COUNT(*) FROM assets UNION ALL SELECT 'devices', COUNT(*) FROM devices UNION ALL SELECT 'networks', COUNT(*) FROM networks;"

# 5. Drop temp DB
dropdb ipam_verify_$(date +%s)
```

A backup you have never restored from is not a backup.

---

## Backup Storage Location

All backups are stored in Firebase Storage and visible in the Firebase Console:

```
Firebase Console → Storage → backups/
  └── 2026-04-05/
      └── ipam-backup-2026-04-05T02-00-00-000Z.sql.gz
  └── 2026-04-06/
      └── ipam-backup-2026-04-06T02-00-00-000Z.sql.gz
```

Files older than **30 days** are automatically deleted on the next backup run.
