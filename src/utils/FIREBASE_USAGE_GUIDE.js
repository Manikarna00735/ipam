/**
 * Firestore Utility Usage Guide
 * 
 * This guide shows how to use the Firestore utility module across your application
 * for org/user data access and real-time operations
 */

// ============================================
// 1. BASIC IMPORTS IN ANY MODULE/CONTROLLER
// ============================================

const { 
  getOrgDetails, 
  getUserDetails, 
  readData, 
  writeData, 
  updateData,
  listenToData,
  queryCollection,
  batchWrite,
  transaction 
} = require('../utils/firebase');

// ============================================
// 2. GET ORGANIZATION DETAILS
// ============================================

// In a controller or route handler:
async function exampleController(req, res, next) {
  try {
    const orgUuid = req.orgid; // From middleware
    const orgDetails = await getOrgDetails(orgUuid);
    
    if (!orgDetails) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Use org details for operations
    const orgName = orgDetails.name;
    const orgEmail = orgDetails.email;
    
    res.json({ 
      message: `Working with ${orgName}`,
      org: orgDetails 
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// 3. GET USER DETAILS
// ============================================

async function getUserInfoController(req, res, next) {
  try {
    const userId = req.user.user_id; // From auth middleware
    const userDetails = await getUserDetails(userId);
    
    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userName = userDetails.name;
    const userEmail = userDetails.email;
    
    res.json({ user: userDetails });
  } catch (err) {
    next(err);
  }
}

// ============================================
// 4. GET MULTIPLE ORGANIZATIONS/USERS
// ============================================

const { getMultipleOrgDetails, getMultipleUserDetails } = require('../utils/firebase');

async function getTeamInfoController(req, res, next) {
  try {
    const userIds = ['user-1', 'user-2', 'user-3'];
    const users = await getMultipleUserDetails(userIds);
    
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

// ============================================
// 5. READ CUSTOM DATA
// ============================================

async function readCustomDataExample() {
  // Read any data from Firebase by path
  const data = await readData('organizations/org-uuid/settings');
  console.log(data);
  
  // Read nested data
  const userPrefs = await readData('users/user-id/preferences');
  console.log(userPrefs);
}

// ============================================
// 6. WRITE/UPDATE DATA
// ============================================

async function writeDataExample() {
  // Write new data (overwrites)
  await writeData('organizations/org-uuid/config', {
    theme: 'dark',
    timezone: 'UTC',
    maxUsers: 100
  });
  
  // Update specific fields (partial update)
  await updateData('organizations/org-uuid/settings', {
    theme: 'light',
    updatedAt: new Date().toISOString()
  });
}

// ============================================
// 7. SEARCH BY FIELD
// ============================================

const { queryOrgsByField, queryUsersByField } = require('../utils/firebase');

async function searchOrgsByNameExample() {
  // Find organizations by name
  const orgs = await queryOrgsByField('name', 'Acme Corp');
  console.log(orgs);
  
  // Find users by email domain
  const users = await queryUsersByField('email', 'user@example.com');
  console.log(users);
}

// ============================================
// 8. REAL-TIME LISTENERS
// ============================================

async function setupRealtimeListenerExample() {
  // Listen to organization changes
  const unsubscribe = listenToData('organizations/org-uuid', (err, data) => {
    if (err) {
      console.error('Error:', err);
      return;
    }
    console.log('Organization updated:', data);
    // React to changes
  });
  
  // Stop listening when needed
  setTimeout(() => {
    unsubscribe();
  }, 60000); // Stop after 1 minute
}

// ============================================
// 9. BATCH OPERATIONS
// ============================================

const { batchWrite } = require('../utils/firebase');

async function batchUpdateExample() {
  const updates = {
    'organizations/org-1/status': 'active',
    'organizations/org-2/status': 'inactive',
    'users/user-1/lastLogin': new Date().toISOString(),
    'users/user-2/role': 'admin'
  };
  
  const success = await batchWrite(updates);
  if (success) {
    console.log('Batch update completed');
  }
}

// ============================================
// 10. USE IN MIDDLEWARE
// ============================================

// Example: Auth middleware that enriches request with Firebase data
async function authMiddlewareWithFirebase(req, res, next) {
  try {
    const userId = req.user.user_id;
    const orgUuid = req.orgid;
    
    // Fetch org and user details from Firebase
    const [orgDetails, userDetails] = await Promise.all([
      getOrgDetails(orgUuid),
      getUserDetails(userId)
    ]);
    
    // Attach to request
    req.org = orgDetails;
    req.userFirebase = userDetails;
    
    next();
  } catch (err) {
    next(err);
  }
}

// ============================================
// 11. USE IN CONTROLLERS - COMPLETE EXAMPLE
// ============================================

async function completeControllerExample(req, res, next) {
  try {
    // Get both org and user details
    const [orgDetails, userDetails] = await Promise.all([
      getOrgDetails(req.orgid),
      getUserDetails(req.user.user_id)
    ]);
    
    if (!orgDetails || !userDetails) {
      return res.status(404).json({ error: 'Invalid org or user' });
    }
    
    // Use them for business logic
    const currentData = await readData(`organizations/${req.orgid}/currentConfig`);
    
    // Update Firebase with new data
    await updateData(`organizations/${req.orgid}/lastModified`, {
      by: userDetails.name,
      at: new Date().toISOString()
    });
    
    res.json({
      org: orgDetails.name,
      user: userDetails.name,
      currentConfig: currentData
    });
  } catch (err) {
    next(err);
  }
}

// ============================================
// 12. AVAILABLE FUNCTIONS REFERENCE
// ============================================

/*
ORGANIZATION OPERATIONS:
- getOrgDetails(orgUuid) - Get org by UUID
- getMultipleOrgDetails(orgUuids) - Get multiple orgs
- getOrgIdByName(orgName) - Find org by name
- queryOrgsByField(fieldName, value) - Query orgs

USER OPERATIONS:
- getUserDetails(userId) - Get user by ID
- getMultipleUserDetails(userIds) - Get multiple users
- getUserIdByEmail(email) - Find user by email
- queryUsersByField(fieldName, value) - Query users

GENERIC CRUD:
- readData(path) - Read any data
- writeData(path, data) - Write/overwrite data
- updateData(path, updates) - Partial update
- deleteData(path) - Delete data

UTILITIES:
- listenToData(path, callback) - Real-time updates
- pathExists(path) - Check if path exists
- batchWrite(updates) - Multiple updates at once
- checkConnection() - Check Firebase connection

ACCESS SDK:
- getAdminSDK() - Get Firebase admin SDK
- getDatabase() - Get database instance
*/

module.exports = {
  exampleController,
  getUserInfoController,
  getTeamInfoController,
  authMiddlewareWithFirebase,
  completeControllerExample
};
