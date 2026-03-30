const admin = require('firebase-admin');
const firebaseAdmin = require('./firebaseAdmin');
const logger = require('./logger');

/**
 * Firestore Utility Module
 * Handles all Firestore database operations for organizations and users
 * 
 * Usage:
 *   const { getOrgDetails, getUserDetails, writeData, readData } = require('../utils/firebase');
 *   const org = await getOrgDetails('org-uuid');
 *   const user = await getUserDetails('user-id');
 */

// Initialize Firebase Admin SDK
let db;
let initError = null;

function initializeFirebase() {
  try {
    firebaseAdmin.ensureInitialized();
    db = admin.firestore();
    logger.info('[Firestore] Initialized successfully');
    return db;
  } catch (err) {
    initError = err;
    logger.error({ err: err.message }, '[Firestore] Initialization failed');
    return null;
  }
}

/**
 * Ensure Firestore is initialized before any operation
 */
function ensureInitialized() {
  if (initError) {
    logger.warn('[Firestore] Firebase not properly initialized - skipping operation');
    return null;
  }
  if (!db) {
    return initializeFirebase();
  }
  return db;
}

/**
 * Get organization details by UUID (document ID)
 * @param {string} orgUuid - Organization UUID/document ID
 * @returns {Promise<Object|null>} Organization details or null if not found
 */
async function getOrgDetails(orgUuid) {
  try {
    const firestore = ensureInitialized();
    if (!firestore) {
      logger.warn('[Firestore] Firebase not initialized, returning null for org details');
      return null;
    }

    const docRef = firestore.collection('organizations').doc(orgUuid);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn({ orgUuid }, '[Firestore] Organization not found');
      return null;
    }

    return {
      uuid: orgUuid,
      ...docSnap.data()
    };
  } catch (err) {
    logger.error({ err: err.message }, '[Firestore] Error fetching org details');
    return null;
  }
}

/**
 * Get user details by user ID (document ID)
 * @param {string} userId - User ID/document ID
 * @returns {Promise<Object|null>} User details or null if not found
 */
async function getUserDetails(userId) {
  try {
    const firestore = ensureInitialized();
    if (!firestore) {
      logger.warn('[Firestore] Firebase not initialized, returning null for user details');
      return null;
    }

    const docRef = firestore.collection('users').doc(userId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.warn({ userId }, '[Firestore] User not found');
      return null;
    }

    return {
      user_id: userId,
      ...docSnap.data()
    };
  } catch (err) {
    logger.error({ err: err.message }, '[Firestore] Error fetching user details');
    return null;
  }
}

// /**
//  * Get multiple organization details
//  * @param {string[]} orgUuids - Array of organization UUIDs
//  * @returns {Promise<Object>} Object with org UUIDs as keys and details as values
//  */
// async function getMultipleOrgDetails(orgUuids) {
//   try {
//     const db = ensureInitialized();
//     const orgs = {};

//     for (const uuid of orgUuids) {
//       const details = await getOrgDetails(uuid);
//       if (details) {
//         orgs[uuid] = details;
//       }
//     }

//     return orgs;
//   } catch (err) {
//     console.error('[Firestore] Error fetching multiple org details:', err.message);
//     return {};
//   }
// }

// /**
//  * Get multiple user details
//  * @param {string[]} userIds - Array of user IDs
//  * @returns {Promise<Object>} Object with user IDs as keys and details as values
//  */
// async function getMultipleUserDetails(userIds) {
//   try {
//     const db = ensureInitialized();
//     const users = {};

//     for (const id of userIds) {
//       const details = await getUserDetails(id);
//       if (details) {
//         users[id] = details;
//       }
//     }

//     return users;
//   } catch (err) {
//     console.error('[Firestore] Error fetching multiple user details:', err.message);
//     return {};
//   }
// }

// /**
//  * Generic read operation from Firestore
//  * @param {string} path - Firestore path (e.g., 'organizations/org-id' or 'organizations/org-id/config')
//  * @returns {Promise<Object|null>} Data at path or null if not found
//  */
// async function readData(path) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot read:', path);
//       return null;
//     }

//     const pathParts = path.split('/');
    
//     let ref = firestore;
//     for (let i = 0; i < pathParts.length; i++) {
//       if (i % 2 === 0) {
//         ref = ref.collection(pathParts[i]);
//       } else {
//         ref = ref.doc(pathParts[i]);
//       }
//     }

//     // If path ends with a collection, get all docs
//     if (pathParts.length % 2 === 1) {
//       const snapshot = await ref.get();
//       const data = {};
//       snapshot.forEach(doc => {
//         data[doc.id] = doc.data();
//       });
//       return Object.keys(data).length > 0 ? data : null;
//     }

//     // If path ends with a doc
//     const snapshot = await ref.get();
//     return snapshot.exists ? snapshot.data() : null;
//   } catch (err) {
//     console.error(`[Firestore] Error reading from ${path}:`, err.message);
//     return null;
//   }
// }

// /**
//  * Generic write operation to Firestore
//  * @param {string} path - Firestore path (e.g., 'organizations/org-id')
//  * @param {Object} data - Data to write
//  * @param {boolean} merge - If true, merges with existing data; if false, overwrites
//  * @returns {Promise<boolean>} True if successful, false otherwise
//  */
// async function writeData(path, data, merge = false) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot write to:', path);
//       return false;
//     }

//     const pathParts = path.split('/');

//     let ref = firestore;
//     for (let i = 0; i < pathParts.length; i++) {
//       if (i % 2 === 0) {
//         ref = ref.collection(pathParts[i]);
//       } else {
//         ref = ref.doc(pathParts[i]);
//       }
//     }

//     await ref.set(data, { merge });
//     console.log(`[Firestore] Successfully wrote to ${path}`);
//     return true;
//   } catch (err) {
//     console.error(`[Firestore] Error writing to ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Generic update operation to Firestore (partial update)
//  * @param {string} path - Firestore path (e.g., 'organizations/org-id')
//  * @param {Object} updates - Updates to merge
//  * @returns {Promise<boolean>} True if successful, false otherwise
//  */
// async function updateData(path, updates) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot update:', path);
//       return false;
//     }

//     const pathParts = path.split('/');

//     let ref = firestore;
//     for (let i = 0; i < pathParts.length; i++) {
//       if (i % 2 === 0) {
//         ref = ref.collection(pathParts[i]);
//       } else {
//         ref = ref.doc(pathParts[i]);
//       }
//     }

//     await ref.update(updates);
//     console.log(`[Firestore] Successfully updated ${path}`);
//     return true;
//   } catch (err) {
//     console.error(`[Firestore] Error updating ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Delete operation in Firestore
//  * @param {string} path - Firestore path (e.g., 'organizations/org-id')
//  * @returns {Promise<boolean>} True if successful, false otherwise
//  */
// async function deleteData(path) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot delete:', path);
//       return false;
//     }

//     const pathParts = path.split('/');

//     let ref = firestore;
//     for (let i = 0; i < pathParts.length; i++) {
//       if (i % 2 === 0) {
//         ref = ref.collection(pathParts[i]);
//       } else {
//         ref = ref.doc(pathParts[i]);
//       }
//     }

//     await ref.delete();
//     console.log(`[Firestore] Successfully deleted ${path}`);
//     return true;
//   } catch (err) {
//     console.error(`[Firestore] Error deleting ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Query documents from a collection with conditions
//  * @param {string} collectionPath - Collection path (e.g., 'organizations')
//  * @param {Array} conditions - Array of [field, operator, value] conditions
//  * @returns {Promise<Object>} Documents matching the query
//  * @example
//  *   queryCollection('organizations', [['status', '==', 'active']])
//  *   queryCollection('users', [['role', '==', 'admin'], ['email', '==', 'user@example.com']])
//  */
// async function queryCollection(collectionPath, conditions = []) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot query:', collectionPath);
//       return {};
//     }

//     let query = firestore.collection(collectionPath);

//     for (const [field, operator, value] of conditions) {
//       query = query.where(field, operator, value);
//     }

//     const snapshot = await query.get();
//     const results = {};
//     snapshot.forEach(doc => {
//       results[doc.id] = { id: doc.id, ...doc.data() };
//     });

//     return results;
//   } catch (err) {
//     console.error(`[Firestore] Error querying ${collectionPath}:`, err.message);
//     return {};
//   }
// }

// /**
//  * Query organizations by a specific field
//  * @param {string} fieldName - Field name to query
//  * @param {*} value - Value to match
//  * @returns {Promise<Object>} Matching organizations with IDs as keys
//  */
// async function queryOrgsByField(fieldName, value) {
//   try {
//     return await queryCollection('organizations', [[fieldName, '==', value]]);
//   } catch (err) {
//     console.error(`[Firestore] Error querying orgs by ${fieldName}:`, err.message);
//     return {};
//   }
// }

// /**
//  * Query users by a specific field
//  * @param {string} fieldName - Field name to query
//  * @param {*} value - Value to match
//  * @returns {Promise<Object>} Matching users with IDs as keys
//  */
// async function queryUsersByField(fieldName, value) {
//   try {
//     return await queryCollection('users', [[fieldName, '==', value]]);
//   } catch (err) {
//     console.error(`[Firestore] Error querying users by ${fieldName}:`, err.message);
//     return {};
//   }
// }

// /**
//  * Listen for real-time updates
//  * @param {string} path - Firestore path to listen to
//  * @param {Function} callback - Callback function when data changes
//  * @returns {Function} Unsubscribe function to stop listening
//  */
// function listenToData(path, callback) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot listen to:', path);
//       callback(new Error('Firebase not initialized'), null);
//       return () => {};
//     }

//     const pathParts = path.split('/');

//     let ref = firestore;
//     for (let i = 0; i < pathParts.length; i++) {
//       if (i % 2 === 0) {
//         ref = ref.collection(pathParts[i]);
//       } else {
//         ref = ref.doc(pathParts[i]);
//       }
//     }

//     // If path ends with a collection, listen to all docs
//     if (pathParts.length % 2 === 1) {
//       return ref.onSnapshot(
//         (snapshot) => {
//           const data = {};
//           snapshot.forEach(doc => {
//             data[doc.id] = doc.data();
//           });
//           callback(null, data);
//         },
//         (err) => {
//           console.error(`[Firestore] Error listening to ${path}:`, err.message);
//           callback(err, null);
//         }
//       );
//     }

//     // If path ends with a doc
//     return ref.onSnapshot(
//       (snapshot) => {
//         const data = snapshot.exists ? snapshot.data() : null;
//         callback(null, data);
//       },
//       (err) => {
//         console.error(`[Firestore] Error listening to ${path}:`, err.message);
//         callback(err, null);
//       }
//     );
//   } catch (err) {
//     console.error(`[Firestore] Error setting up listener for ${path}:`, err.message);
//     return () => {};
//   }
// }

// /**
//  * Check if a document exists in Firestore
//  * @param {string} path - Firestore path
//  * @returns {Promise<boolean>} True if path exists
//  */
// async function pathExists(path) {
//   try {
//     const data = await readData(path);
//     return data !== null;
//   } catch (err) {
//     console.error(`[Firestore] Error checking path ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Batch write operations
//  * @param {Object} updates - Object with paths as keys and data as values
//  * @returns {Promise<boolean>} True if successful
//  */
// async function batchWrite(updates) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot batch write');
//       return false;
//     }

//     const batch = firestore.batch();

//     for (const [path, data] of Object.entries(updates)) {
//       const pathParts = path.split('/');
//       let ref = firestore;
      
//       for (let i = 0; i < pathParts.length; i++) {
//         if (i % 2 === 0) {
//           ref = ref.collection(pathParts[i]);
//         } else {
//           ref = ref.doc(pathParts[i]);
//         }
//       }

//       batch.set(ref, data, { merge: true });
//     }

//     await batch.commit();
//     console.log('[Firestore] Batch write completed');
//     return true;
//   } catch (err) {
//     console.error('[Firestore] Error in batch write:', err.message);
//     return false;
//   }
// }

// /**
//  * Get organization ID by name (search in Firestore)
//  * @param {string} orgName - Organization name to search
//  * @returns {Promise<string|null>} Organization UUID or null if not found
//  */
// async function getOrgIdByName(orgName) {
//   try {
//     const orgs = await queryOrgsByField('name', orgName);
//     const orgId = Object.keys(orgs)[0];
//     return orgId || null;
//   } catch (err) {
//     console.error('[Firestore] Error finding org by name:', err.message);
//     return null;
//   }
// }

// /**
//  * Get user ID by email (search in Firestore)
//  * @param {string} email - User email to search
//  * @returns {Promise<string|null>} User ID or null if not found
//  */
// async function getUserIdByEmail(email) {
//   try {
//     const users = await queryUsersByField('email', email);
//     const userId = Object.keys(users)[0];
//     return userId || null;
//   } catch (err) {
//     console.error('[Firestore] Error finding user by email:', err.message);
//     return null;
//   }
// }

// /**
//  * Check Firestore connection
//  * @returns {Promise<boolean>} True if connected
//  */
// async function checkConnection() {
//   try {
//     const db = ensureInitialized();
//     // Try a simple read to test connection
//     await db.collection('_test').limit(1).get();
//     return true;
//   } catch (err) {
//     console.error('[Firestore] Connection check failed:', err.message);
//     return false;
//   }
// }

// /**
//  * Transaction support - Execute multiple operations atomically
//  * @param {Function} transactionFn - Function that receives transaction object and performs operations
//  * @returns {Promise<*>} Result of the transaction function
//  */
// async function transaction(transactionFn) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot start transaction');
//       throw new Error('Firebase not initialized');
//     }
    
//     return await firestore.runTransaction(transactionFn);
//   } catch (err) {
//     console.error('[Firestore] Transaction failed:', err.message);
//     throw err;
//   }
// }

// /**
//  * Get all documents from a collection
//  * @param {string} collectionPath - Collection path
//  * @returns {Promise<Object>} All documents with IDs as keys
//  */
// async function getAllDocuments(collectionPath) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot get all documents from:', collectionPath);
//       return {};
//     }

//     const snapshot = await firestore.collection(collectionPath).get();
//     const results = {};
    
//     snapshot.forEach(doc => {
//       results[doc.id] = { id: doc.id, ...doc.data() };
//     });

//     return results;
//   } catch (err) {
//     console.error(`[Firestore] Error getting all documents from ${collectionPath}:`, err.message);
//     return {};
//   }
// }

// /**
//  * Paginated query
//  * @param {string} collectionPath - Collection path
//  * @param {number} pageSize - Number of documents per page
//  * @param {Object} startAfter - Optional starting point (last document)
//  * @returns {Promise<Object>} Paginated documents
//  */
// async function paginatedQuery(collectionPath, pageSize = 10, startAfter = null) {
//   try {
//     const firestore = ensureInitialized();
//     if (!firestore) {
//       console.warn('[Firestore] Firebase not initialized, cannot paginate:', collectionPath);
//       return { documents: {}, lastDoc: null };
//     }

//     let query = firestore.collection(collectionPath).limit(pageSize);

//     if (startAfter) {
//       query = query.startAfter(startAfter);
//     }

//     const snapshot = await query.get();
//     const results = {};
    
//     snapshot.forEach(doc => {
//       results[doc.id] = { id: doc.id, ...doc.data() };
//     });

//     return {
//       documents: results,
//       lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
//     };
//   } catch (err) {
//     console.error(`[Firestore] Error in paginated query for ${collectionPath}:`, err.message);
//     return { documents: {}, lastDoc: null };
//   }
// }

// module.exports = {
//   // Initialization
//   initializeFirebase,
//   ensureInitialized,
//   checkConnection,

//   // Organization operations
//   getOrgDetails,
//   getMultipleOrgDetails,
//   getOrgIdByName,
//   queryOrgsByField,

//   // User operations
//   getUserDetails,
//   getMultipleUserDetails,
//   getUserIdByEmail,
//   queryUsersByField,

//   // Generic CRUD operations
//   readData,
//   writeData,
//   updateData,
//   deleteData,

//   // Query operations
//   queryCollection,
//   getAllDocuments,
//   paginatedQuery,

//   // Real-time operations
//   listenToData,

//   // Utility operations
//   pathExists,
//   batchWrite,
//   transaction,

//   // Direct access to admin SDK if needed
//   getAdminSDK: () => admin,
//   getDatabase: () => ensureInitialized()
// };


// /**
//  * Ensure Firebase is initialized before any operation
//  */
// function ensureInitialized() {
//   if (!db) {
//     return initializeFirebase();
//   }
//   return db;
// }

// /**
//  * Get organization details by UUID
//  * @param {string} orgUuid - Organization UUID
//  * @returns {Promise<Object|null>} Organization details or null if not found
//  */
// async function getOrgDetails(orgUuid) {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref(`organizations/${orgUuid}`).once('value');
//     const data = snapshot.val();
    
//     if (!data) {
//       console.warn(`[Firebase] Organization not found: ${orgUuid}`);
//       return null;
//     }
    
//     return {
//       uuid: orgUuid,
//       ...data
//     };
//   } catch (err) {
//     console.error('[Firebase] Error fetching org details:', err.message);
//     return null;
//   }
// }

// /**
//  * Get user details by user ID
//  * @param {string} userId - User ID
//  * @returns {Promise<Object|null>} User details or null if not found
//  */
// async function getUserDetails(userId) {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref(`users/${userId}`).once('value');
//     const data = snapshot.val();
    
//     if (!data) {
//       console.warn(`[Firebase] User not found: ${userId}`);
//       return null;
//     }
    
//     return {
//       user_id: userId,
//       ...data
//     };
//   } catch (err) {
//     console.error('[Firebase] Error fetching user details:', err.message);
//     return null;
//   }
// }

// /**
//  * Get multiple organization details
//  * @param {string[]} orgUuids - Array of organization UUIDs
//  * @returns {Promise<Object>} Object with org UUIDs as keys and details as values
//  */
// async function getMultipleOrgDetails(orgUuids) {
//   try {
//     const db = ensureInitialized();
//     const orgs = {};
    
//     for (const uuid of orgUuids) {
//       const details = await getOrgDetails(uuid);
//       if (details) {
//         orgs[uuid] = details;
//       }
//     }
    
//     return orgs;
//   } catch (err) {
//     console.error('[Firebase] Error fetching multiple org details:', err.message);
//     return {};
//   }
// }

// /**
//  * Get multiple user details
//  * @param {string[]} userIds - Array of user IDs
//  * @returns {Promise<Object>} Object with user IDs as keys and details as values
//  */
// async function getMultipleUserDetails(userIds) {
//   try {
//     const db = ensureInitialized();
//     const users = {};
    
//     for (const id of userIds) {
//       const details = await getUserDetails(id);
//       if (details) {
//         users[id] = details;
//       }
//     }
    
//     return users;
//   } catch (err) {
//     console.error('[Firebase] Error fetching multiple user details:', err.message);
//     return {};
//   }
// }

// /**
//  * Generic read operation from Firebase
//  * @param {string} path - Firebase path (e.g., 'organizations/org-id')
//  * @returns {Promise<Object|null>} Data at path or null if not found
//  */
// async function readData(path) {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref(path).once('value');
//     return snapshot.val();
//   } catch (err) {
//     console.error(`[Firebase] Error reading from ${path}:`, err.message);
//     return null;
//   }
// }

// /**
//  * Generic write operation to Firebase
//  * @param {string} path - Firebase path (e.g., 'organizations/org-id')
//  * @param {Object} data - Data to write
//  * @returns {Promise<boolean>} True if successful, false otherwise
//  */
// async function writeData(path, data) {
//   try {
//     const db = ensureInitialized();
//     await db.ref(path).set(data);
//     console.log(`[Firebase] Successfully wrote to ${path}`);
//     return true;
//   } catch (err) {
//     console.error(`[Firebase] Error writing to ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Generic update operation to Firebase (partial update)
//  * @param {string} path - Firebase path (e.g., 'organizations/org-id')
//  * @param {Object} updates - Updates to merge
//  * @returns {Promise<boolean>} True if successful, false otherwise
//  */
// async function updateData(path, updates) {
//   try {
//     const db = ensureInitialized();
//     await db.ref(path).update(updates);
//     console.log(`[Firebase] Successfully updated ${path}`);
//     return true;
//   } catch (err) {
//     console.error(`[Firebase] Error updating ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Delete operation in Firebase
//  * @param {string} path - Firebase path (e.g., 'organizations/org-id')
//  * @returns {Promise<boolean>} True if successful, false otherwise
//  */
// async function deleteData(path) {
//   try {
//     const db = ensureInitialized();
//     await db.ref(path).remove();
//     console.log(`[Firebase] Successfully deleted ${path}`);
//     return true;
//   } catch (err) {
//     console.error(`[Firebase] Error deleting ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Listen for real-time updates
//  * @param {string} path - Firebase path to listen to
//  * @param {Function} callback - Callback function when data changes
//  * @returns {Function} Unsubscribe function to stop listening
//  */
// function listenToData(path, callback) {
//   try {
//     const db = ensureInitialized();
//     const ref = db.ref(path);
    
//     ref.on('value', (snapshot) => {
//       const data = snapshot.val();
//       callback(null, data);
//     }, (err) => {
//       console.error(`[Firebase] Error listening to ${path}:`, err.message);
//       callback(err, null);
//     });
    
//     // Return unsubscribe function
//     return () => ref.off();
//   } catch (err) {
//     console.error(`[Firebase] Error setting up listener for ${path}:`, err.message);
//     return () => {};
//   }
// }

// /**
//  * Query organizations by a specific field
//  * @param {string} fieldName - Field name to query
//  * @param {*} value - Value to match
//  * @returns {Promise<Object>} Matching organizations
//  */
// async function queryOrgsByField(fieldName, value) {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref('organizations')
//       .orderByChild(fieldName)
//       .equalTo(value)
//       .once('value');
//     return snapshot.val() || {};
//   } catch (err) {
//     console.error(`[Firebase] Error querying orgs by ${fieldName}:`, err.message);
//     return {};
//   }
// }

// /**
//  * Query users by a specific field
//  * @param {string} fieldName - Field name to query
//  * @param {*} value - Value to match
//  * @returns {Promise<Object>} Matching users
//  */
// async function queryUsersByField(fieldName, value) {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref('users')
//       .orderByChild(fieldName)
//       .equalTo(value)
//       .once('value');
//     return snapshot.val() || {};
//   } catch (err) {
//     console.error(`[Firebase] Error querying users by ${fieldName}:`, err.message);
//     return {};
//   }
// }

// /**
//  * Check if a path exists in Firebase
//  * @param {string} path - Firebase path
//  * @returns {Promise<boolean>} True if path exists
//  */
// async function pathExists(path) {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref(path).once('value');
//     return snapshot.exists();
//   } catch (err) {
//     console.error(`[Firebase] Error checking path ${path}:`, err.message);
//     return false;
//   }
// }

// /**
//  * Get organization ID by name (search in Firebase)
//  * @param {string} orgName - Organization name to search
//  * @returns {Promise<string|null>} Organization UUID or null if not found
//  */
// async function getOrgIdByName(orgName) {
//   try {
//     const orgs = await queryOrgsByField('name', orgName);
//     const orgId = Object.keys(orgs)[0];
//     return orgId || null;
//   } catch (err) {
//     console.error('[Firebase] Error finding org by name:', err.message);
//     return null;
//   }
// }

// /**
//  * Get user ID by email (search in Firebase)
//  * @param {string} email - User email to search
//  * @returns {Promise<string|null>} User ID or null if not found
//  */
// async function getUserIdByEmail(email) {
//   try {
//     const users = await queryUsersByField('email', email);
//     const userId = Object.keys(users)[0];
//     return userId || null;
//   } catch (err) {
//     console.error('[Firebase] Error finding user by email:', err.message);
//     return null;
//   }
// }

// /**
//  * Batch write operations
//  * @param {Object} updates - Object with paths as keys and data as values
//  * @returns {Promise<boolean>} True if successful
//  */
// async function batchWrite(updates) {
//   try {
//     const db = ensureInitialized();
//     await db.ref().update(updates);
//     console.log('[Firebase] Batch write completed');
//     return true;
//   } catch (err) {
//     console.error('[Firebase] Error in batch write:', err.message);
//     return false;
//   }
// }

// /**
//  * Check Firebase connection
//  * @returns {Promise<boolean>} True if connected
//  */
// async function checkConnection() {
//   try {
//     const db = ensureInitialized();
//     const snapshot = await db.ref('.info/connected').once('value');
//     return snapshot.val() === true;
//   } catch (err) {
//     console.error('[Firebase] Connection check failed:', err.message);
//     return false;
//   }
// }

module.exports = {
  // Initialization
  initializeFirebase,
  ensureInitialized,
//   checkConnection,
  
  // Organization operations
  getOrgDetails,
//   getMultipleOrgDetails,
//   getOrgIdByName,
//   queryOrgsByField,
  
  // User operations
  getUserDetails,
//   getMultipleUserDetails,
//   getUserIdByEmail,
//   queryUsersByField,
  
//   // Generic CRUD operations
//   readData,
//   writeData,
//   updateData,
//   deleteData,
  
//   // Real-time operations
//   listenToData,
  
//   // Utility operations
//   pathExists,
//   batchWrite,
  
  // Direct access to admin SDK if needed
  getAdminSDK: () => admin,
  getDatabase: () => ensureInitialized()
};
