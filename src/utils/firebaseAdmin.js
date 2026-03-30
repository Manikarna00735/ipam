const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Single source of truth for Firebase Admin SDK initialization.
 * All modules (storage, firestore, auth) must call this before using admin.*.
 */
function ensureInitialized() {
  if (admin.apps.length) return; // Already initialized, nothing to do

  try {
    const renderPath = path.join(process.cwd(), 'firebase-service-account.json');
    const localPath = path.join(__dirname, '../../firebase-service-account.json');
    const finalPath = fs.existsSync(renderPath) ? renderPath : localPath;

    if (!fs.existsSync(finalPath)) {
      throw new Error(`Firebase service account not found at ${finalPath}`);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });

    logger.info('[Firebase] Admin SDK initialized');
  } catch (err) {
    logger.error({ err: err.message }, '[Firebase] Admin SDK initialization failed');
    throw err;
  }
}

module.exports = { ensureInitialized };
