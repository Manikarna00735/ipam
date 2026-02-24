const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let bucket = null;
let initError = null;

/**
 * Initialize Firebase Storage
 * Abstracted storage layer - can be swapped with Azure Blob Storage in future
 */
function ensureInitialized() {
  if (bucket) return true;
  if (initError) {
    console.warn('[Storage] Firebase not available:', initError);
    return false;
  }
  
  try {
    const renderPath = path.join(process.cwd(), 'firebase-service-account.json');
    const localPath = path.join(__dirname, '../../firebase-service-account.json');
    
    // Determine which path to use
    const finalPath = fs.existsSync(renderPath) ? renderPath : localPath;
    // const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
    
    if (!fs.existsSync(finalPath)) {
      throw new Error(`Service account file not found at ${finalPath}`);
    }
    
    // Initialize if not already done
    if (!admin.apps.length) {
      const serviceAccount = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
    }
    
    bucket = admin.storage().bucket();
    console.log('[Storage] Firebase Storage initialized successfully');
    return true;
  } catch (err) {
    initError = err.message;
    console.error('[Storage] Firebase initialization failed:', err.message);
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
      console.warn('[Storage] Firebase not available, skipping file upload');
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
    console.log(`[Storage] File uploaded: ${storagePath}`);
    
    return publicUrl;
  } catch (err) {
    console.error('[Storage] Upload failed:', err.message);
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
      console.warn('[Storage] Firebase not available, skipping file deletion');
      return false;
    }
    
    if (!fileUrl) return false;
    
    // Extract storage path from URL
    // Format: https://storage.googleapis.com/{bucket}/{path}
    const urlParts = fileUrl.split('/');
    const storagePath = urlParts.slice(4).join('/');
    
    const file = bucket.file(storagePath);
    await file.delete();
    
    console.log(`[Storage] File deleted: ${storagePath}`);
    return true;
  } catch (err) {
    console.error('[Storage] Delete failed:', err.message);
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
      console.warn('[Storage] Firebase not available');
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
    console.error('[Storage] Get metadata failed:', err.message);
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
    console.error('[Storage] Replace file failed:', err.message);
    return null;
  }
}

module.exports = {
  ensureInitialized,
  uploadFile,
  deleteFile,
  getFileMetadata,
  replaceFile
};
