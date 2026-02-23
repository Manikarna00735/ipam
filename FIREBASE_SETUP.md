# Firestore Integration Setup Guide

This guide explains how to set up and use Firestore with your Node.js server.

## Overview

The Firestore integration provides:
- ✅ Organization and user details retrieval
- ✅ Firestore collection read/write operations
- ✅ Query and search capabilities
- ✅ Real-time listeners and snapshot updates
- ✅ Batch operations support
- ✅ Transactions and atomic operations
- ✅ Pagination support
- ✅ Middleware for automatic data enrichment
- ✅ Optional caching to reduce API calls

## Installation

### 1. Install Firebase Admin SDK

```bash
npm install firebase-admin
```

### 2. Set Up Firestore and Service Account

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Create a Firestore database (if not already created)
   - Go to **Firestore Database** → **Create Database**
   - Choose production or test mode
   - Select a location
4. Go to **Project Settings** → **Service Accounts**
5. Click "Generate New Private Key"
6. Save the JSON file as `firebase-service-account.json` in your project root
7. **Add to `.gitignore`**: Never commit this file!

### 3. Configure Environment Variables

Create/update your `.env` file:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

Note: Project ID is automatically extracted from the service account JSON file.

## File Structure

```
src/
├── utils/
│   ├── firebase.js              # Main Firebase utility
│   └── FIREBASE_USAGE_GUIDE.js  # Comprehensive usage examples
├── middleware/
│   └── firebaseMiddleware.js    # Middleware for auto-enrichment
└── ...
```

## Quick Start

### Basic Usage in a Controller

```javascript
const { getOrgDetails, getUserDetails } = require('../utils/firebase');

async function myController(req, res, next) {
  try {
    // Fetch organization details
    const org = await getOrgDetails(req.orgid);
    
    // Fetch user details
    const user = await getUserDetails(req.user.user_id);
    
    res.json({ org, user });
  } catch (err) {
    next(err);
  }
}
```

### Using Middleware (Recommended)

Add to your `index.js`:

```javascript
const { firebaseEnrichMiddleware } = require('./middleware/firebaseMiddleware');

// After your auth and org middleware
app.use(requireAuth);
app.use(requireOrg);
app.use(firebaseEnrichMiddleware);  // Enriches all requests with Firebase data

// Now in your controllers, just use:
async function controller(req, res) {
  const orgName = req.orgDetails?.name;
  const userName = req.userDetails?.name;
  // ...
}
```

## Available Functions

### Organization Operations

```javascript
const { 
  getOrgDetails,
  getMultipleOrgDetails,
  getOrgIdByName,
  queryOrgsByField 
} = require('../utils/firebase');

// Get single org
const org = await getOrgDetails('org-uuid-123');

// Get multiple orgs
const orgs = await getMultipleOrgDetails(['org-1', 'org-2']);

// Find org by name
const orgId = await getOrgIdByName('Acme Corp');

// Query orgs
const activeOrgs = await queryOrgsByField('status', 'active');
```

### User Operations

```javascript
const { 
  getUserDetails,
  getMultipleUserDetails,
  getUserIdByEmail,
  queryUsersByField 
} = require('../utils/firebase');

// Get single user
const user = await getUserDetails('user-id-123');

// Get multiple users
const users = await getMultipleUserDetails(['user-1', 'user-2']);

// Find user by email
const userId = await getUserIdByEmail('john@example.com');

// Query users
const admins = await queryUsersByField('role', 'admin');
```

### Generic CRUD Operations

```javascript
const { 
  readData,
  writeData,
  updateData,
  deleteData 
} = require('../utils/firebase');

// Read
const data = await readData('organizations/org-123/settings');

// Write (overwrites)
await writeData('organizations/org-123/config', { theme: 'dark' });

// Update (partial update)
await updateData('organizations/org-123/settings', { theme: 'light' });

// Delete
await deleteData('organizations/org-123/tempData');
```

### Real-Time Listeners

```javascript
const { listenToData } = require('../utils/firebase');

// Listen to changes
const unsubscribe = listenToData('organizations/org-123', (err, data) => {
  if (err) console.error(err);
  else console.log('Org updated:', data);
});

// Stop listening
unsubscribe();
```

### Batch Operations

```javascript
const { batchWrite } = require('../utils/firebase');

const updates = {
  'organizations/org-1/status': 'active',
  'users/user-1/lastLogin': new Date().toISOString(),
  'users/user-2/role': 'admin'
};

await batchWrite(updates);
```

## Firestore Database Structure

Expected structure in Firestore:

```
Collections:
├── organizations (collection)
│   └── {org-uuid} (document)
│       ├── name: string
│       ├── email: string
│       ├── status: string (active/inactive)
│       ├── settings: object
│       └── metadata: object
│
└── users (collection)
    └── {user-id} (document)
        ├── name: string
        ├── email: string
        ├── role: string (admin/user/etc)
        ├── permissions: array
        └── preferences: object
```

### Creating Collections in Firestore Console

1. Go to **Firestore Database**
2. Click **Create Collection**
3. Name it "organizations"
4. Add a document with ID as the org UUID and matching fields
5. Repeat for "users" collection

Or use the SDK to automatically create collections on first write:

```javascript
const { writeData } = require('../utils/firebase');

// This automatically creates the collection if it doesn't exist
await writeData('organizations/org-123', {
  name: 'Acme Corp',
  email: 'contact@acme.com',
  status: 'active'
});
```

## Integration Examples

### Example 1: Activity Logger with Firebase

```javascript
async function logActivity(event, req) {
  const org = await getOrgDetails(req.orgid);
  const user = await getUserDetails(req.user.user_id);
  
  const log = {
    orgName: org?.name,
    userName: user?.name,
    ...event,
    timestamp: new Date().toISOString()
  };
  
  await writeData(`logs/${req.orgid}/${event.id}`, log);
}
```

### Example 2: Device Controller with Firebase

```javascript
async function createDevice(req, res, next) {
  try {
    const org = await getOrgDetails(req.orgid);
    
    // Create device in PostgreSQL
    const result = await db.query('INSERT INTO devices... RETURNING *');
    
    // Also log to Firebase
    await writeData(`organizations/${req.orgid}/devices/${result.rows[0].uuid}`, {
      name: result.rows[0].name,
      createdBy: req.user.user_id,
      createdAt: new Date().toISOString()
    });
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
```

### Example 3: Middleware for Organization Name Injection

```javascript
const { firebaseOrgMiddlewareWithCache } = require('./middleware/firebaseMiddleware');

// In index.js
app.use(requireAuth);
app.use(requireOrg);
app.use(firebaseOrgMiddlewareWithCache);  // With caching

// In any controller
async function controller(req, res) {
  // req.orgDetails is automatically populated
  console.log(`Working for: ${req.orgName}`);
}
```

## Performance Optimization

### Use Middleware Caching

The Firebase utility includes built-in caching (5 minutes TTL) to reduce unnecessary calls:

```javascript
const { firebaseOrgMiddlewareWithCache } = require('./middleware/firebaseMiddleware');

app.use(firebaseOrgMiddlewareWithCache);  // Includes 5-min cache
```

### Batch Fetch Multiple Items

```javascript
// Instead of individual calls
const user1 = await getUserDetails('id-1');
const user2 = await getUserDetails('id-2');

// Use batch fetch
const users = await getMultipleUserDetails(['id-1', 'id-2']);
```

### Use Parallel Promises

```javascript
const [org, user] = await Promise.all([
  getOrgDetails(req.orgid),
  getUserDetails(req.user.user_id)
]);
```

## Error Handling

All Firebase functions handle errors gracefully:

```javascript
const org = await getOrgDetails('invalid-id');
// Returns: null (not error thrown)

const data = await readData('non-existent-path');
// Returns: null
```

For operations that should not fail:

```javascript
const success = await writeData(path, data);
if (!success) {
  console.log('Write failed');
}
```

## Troubleshooting

### Firebase Connection Issues

```javascript
const { checkConnection } = require('../utils/firebase');

const connected = await checkConnection();
console.log(`Firebase connected: ${connected}`);
```

### Invalid Service Account

- Ensure `firebase-service-account.json` exists in project root
- Check file permissions
- Verify JSON content is valid

### Incorrect Database URL

- Get correct URL from: Firebase Console → Project Settings → Realtime Database
- Format: `https://project-name.firebaseio.com`

## Related Files

- 📄 [Usage Guide](./FIREBASE_USAGE_GUIDE.js) - Comprehensive examples
- 📄 [Firebase Utility](./firebase.js) - Main module
- 📄 [Middleware](../middleware/firebaseMiddleware.js) - Auto-enrichment
- 📄 [.env.example](./.env.example) - Configuration template

## Security Notes

1. **Keep service account private** - Never commit to version control
2. **Use environment variables** - Store paths/URLs in `.env` 
3. **Implement Firebase Security Rules** - Control database access
4. **Validate data** - Check Firebase responses in controllers
5. **Use middleware** - Centralize authentication checks

## Next Steps

1. Set up Firebase Service Account
2. Add environment variables to `.env`
3. Add Firebase middleware to `index.js`
4. Import Firebase utility in your controllers
5. See `FIREBASE_USAGE_GUIDE.js` for specific use cases
