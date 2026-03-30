const admin = require('firebase-admin');
const QRCode = require('qrcode');
const firebaseAdmin = require('./firebaseAdmin');
const logger = require('./logger');

let bucket = null;
let initError = null;

/**
 * Ensure Firebase Storage bucket is ready.
 * Delegates Firebase Admin SDK initialization to firebaseAdmin.js.
 */
function ensureInitialized() {
  if (bucket) return true;
  if (initError) {
    logger.warn({ err: initError }, '[Storage] Firebase not available');
    return false;
  }

  try {
    firebaseAdmin.ensureInitialized();
    bucket = admin.storage().bucket();
    logger.info('[Storage] Firebase Storage initialized successfully');
    return true;
  } catch (err) {
    initError = err.message;
    logger.error({ err: err.message }, '[Storage] Firebase initialization failed');
    return false;
  }
}

/**
 * Upload file to Firebase Storage
 * @param {Buffer} fileBuffer - File content as buffer
 * @param {string} fileName - Original file name
 * @param {string} module - Module name (e.g., 'purchase_orders', 'assets')
 * @param {string} id - Entity ID (PO UUID or Asset UUID)
 * @returns {Promise<string>} Public URL of uploaded file or null
 */
async function uploadFile(fileBuffer, fileName, module, id, mimeType = 'application/octet-stream') {
  try {
    if (!ensureInitialized()) {
      logger.warn('[Storage] Firebase not available, skipping file upload');
      return null;
    }

    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${module}/${id}/${timestamp}_${sanitizedFileName}`;
    
    const file = bucket.file(storagePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          module,
          entityId: id,
          uploadedAt: new Date().toISOString()
        }
      }
    });
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    logger.info({ storagePath }, '[Storage] File uploaded');

    return publicUrl;
  } catch (err) {
    logger.error({ err: err.message }, '[Storage] Upload failed');
    return null;
  }
}

/**
 * Delete file from Firebase Storage
 * @param {string} fileUrl - Public URL of the file
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
async function deleteFile(fileUrl) {
  try {
    if (!ensureInitialized()) {
      logger.warn('[Storage] Firebase not available, skipping file deletion');
      return false;
    }
    
    if (!fileUrl) return false;
    
    // Extract storage path from URL
    // Format: https://storage.googleapis.com/{bucket}/{path}
    const urlParts = fileUrl.split('/');
    const storagePath = urlParts.slice(4).join('/');
    
    const file = bucket.file(storagePath);
    await file.delete();
    
    logger.info({ storagePath }, '[Storage] File deleted');
    return true;
  } catch (err) {
    logger.error({ err: err.message }, '[Storage] Delete failed');
    return false;
  }
}

/**
 * Get file metadata
 * @param {string} fileUrl - Public URL of the file
 * @returns {Promise<object>} File metadata or null
 */
async function getFileMetadata(fileUrl) {
  try {
    if (!ensureInitialized()) {
      logger.warn('[Storage] Firebase not available');
      return null;
    }
    
    if (!fileUrl) return null;
    
    const urlParts = fileUrl.split('/');
    const storagePath = urlParts.slice(4).join('/');
    
    const file = bucket.file(storagePath);
    const [metadata] = await file.getMetadata();
    
    return {
      name: metadata.name,
      size: metadata.size,
      contentType: metadata.contentType,
      updated: metadata.updated,
      timeCreated: metadata.timeCreated
    };
  } catch (err) {
    logger.error({ err: err.message }, '[Storage] Get metadata failed');
    return null;
  }
}

/**
 * Replace old file with new file
 * @param {Buffer} fileBuffer - New file content
 * @param {string} fileName - New file name
 * @param {string} oldFileUrl - Old file URL to delete
 * @param {string} module - Module name
 * @param {string} id - Entity ID
 * @returns {Promise<string>} New file URL or null
 */
async function replaceFile(fileBuffer, fileName, oldFileUrl, module, id) {
  try {
    // Delete old file if exists
    if (oldFileUrl) {
      await deleteFile(oldFileUrl);
    }
    
    // Upload new file
    const newUrl = await uploadFile(fileBuffer, fileName, module, id);
    return newUrl;
  } catch (err) {
    logger.error({ err: err.message }, '[Storage] Replace file failed');
    return null;
  }
}

/**
 * Generate a QR code for an asset UUID and upload it to Firebase Storage
 * @param {string} assetUuid - The asset UUID to encode in the QR
 * @returns {Promise<string>} Public URL of the QR code image or null
 */
async function generateQrCode(assetUuid) {
  try {
    if (!ensureInitialized()) {
      logger.warn('[Storage] Firebase not available, skipping QR code generation');
      return null;
    }

    // Generate QR code as PNG buffer encoding the asset UUID
    const qrBuffer = await QRCode.toBuffer(assetUuid, {
      type: 'png',
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M'
    });

    const storagePath = `assets/qr/${assetUuid}/qr_code.png`;
    const file = bucket.file(storagePath);

    await file.save(qrBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          assetUuid,
          generatedAt: new Date().toISOString()
        }
      }
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    logger.info({ assetUuid }, '[Storage] QR code generated');
    return publicUrl;
  } catch (err) {
    logger.error({ err: err.message }, '[Storage] QR code generation failed');
    return null;
  }
}

module.exports = {
  ensureInitialized,
  uploadFile,
  deleteFile,
  getFileMetadata,
  replaceFile,
  generateQrCode
};
