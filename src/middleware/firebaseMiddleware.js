/**
 * Firestore Middleware - Enriches request with org and user details from Firestore
 * 
 * Usage in your routes:
 *   app.use(firebaseOrgMiddleware);
 *   app.use(firebaseUserMiddleware);
 */

const { getOrgDetails, getUserDetails } = require('../utils/firebase');

/**
 * Middleware to attach organization details from Firebase to request
 * Requires req.orgid to be set (from org middleware)
 */
async function firebaseOrgMiddleware(req, res, next) {
  try {
    if (!req.orgid) {
      return next();
    }
    
    const orgDetails = await getOrgDetails(req.orgid);
    if (orgDetails) {
      req.orgDetails = orgDetails;
      req.orgName = orgDetails.name || 'Unknown Org';
      
      // Optional: Add commonly used fields directly
      req.orgEmail = orgDetails.email;
      req.orgSettings = orgDetails.settings || {};
      req.orgMetadata = orgDetails.metadata || {};
    }
    
    next();
  } catch (err) {
    console.error('[Firebase Middleware] Error fetching org details:', err.message);
    // Continue without org details rather than blocking
    next();
  }
}

/**
 * Middleware to attach user details from Firebase to request
 * Requires req.user.user_id to be set (from auth middleware)
 */
async function firebaseUserMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.user_id) {
      return next();
    }
    
    const userDetails = await getUserDetails(req.user.user_id);
    if (userDetails) {
      req.userDetails = userDetails;
      req.userName = userDetails.name || userDetails.email || 'Unknown User';
      
      // Optional: Add commonly used fields directly
      req.userEmail = userDetails.email;
      req.userRole = userDetails.role;
      req.userPermissions = userDetails.permissions || [];
      req.userPreferences = userDetails.preferences || {};
    }
    
    next();
  } catch (err) {
    console.error('[Firebase Middleware] Error fetching user details:', err.message);
    // Continue without user details rather than blocking
    next();
  }
}

/**
 * Combined middleware - fetches both org and user details in parallel
 */
async function firebaseEnrichMiddleware(req, res, next) {
  try {
    const promises = [];
    
    // Fetch org details if orgid exists
    if (req.orgid) {
      promises.push(
        getOrgDetails(req.orgid)
          .then(org => { req.orgDetails = org; })
          .catch(err => console.error('[Firebase] Org fetch error:', err.message))
      );
    }
    
    // Fetch user details if user exists
    if (req.user && req.user.user_id) {
      promises.push(
        getUserDetails(req.user.user_id)
          .then(user => { req.userDetails = user; })
          .catch(err => console.error('[Firebase] User fetch error:', err.message))
      );
    }
    
    // Execute in parallel
    if (promises.length > 0) {
      await Promise.all(promises);
    }
    
    next();
  } catch (err) {
    console.error('[Firebase Middleware] Error in enrich middleware:', err.message);
    next();
  }
}

/**
 * Optional: Caching middleware to reduce Firebase calls
 * Cache org/user details for a short time (default 5 minutes)
 */
const entityCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function clearCache(type, id) {
  entityCache.delete(`${type}:${id}`);
}

function clearAllCache() {
  entityCache.clear();
}

async function firebaseOrgMiddlewareWithCache(req, res, next) {
  try {
    if (!req.orgid) {
      return next();
    }
    
    const cacheKey = `org:${req.orgid}`;
    const cached = entityCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      req.orgDetails = cached.data;
      req.orgName = cached.data.name || 'Unknown Org';
      return next();
    }
    
    const orgDetails = await getOrgDetails(req.orgid);
    if (orgDetails) {
      entityCache.set(cacheKey, { data: orgDetails, timestamp: Date.now() });
      req.orgDetails = orgDetails;
      req.orgName = orgDetails.name || 'Unknown Org';
    }
    
    next();
  } catch (err) {
    console.error('[Firebase Middleware] Error fetching org details:', err.message);
    next();
  }
}

async function firebaseUserMiddlewareWithCache(req, res, next) {
  try {
    if (!req.user || !req.user.user_id) {
      return next();
    }
    
    const cacheKey = `user:${req.user.user_id}`;
    const cached = entityCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      req.userDetails = cached.data;
      req.userName = cached.data.name || cached.data.email || 'Unknown User';
      return next();
    }
    
    const userDetails = await getUserDetails(req.user.user_id);
    if (userDetails) {
      entityCache.set(cacheKey, { data: userDetails, timestamp: Date.now() });
      req.userDetails = userDetails;
      req.userName = userDetails.name || userDetails.email || 'Unknown User';
    }
    
    next();
  } catch (err) {
    console.error('[Firebase Middleware] Error fetching user details:', err.message);
    next();
  }
}

module.exports = {
  // Basic middleware
  firebaseOrgMiddleware,
  firebaseUserMiddleware,
  firebaseEnrichMiddleware,
  
  // Middleware with caching
  firebaseOrgMiddlewareWithCache,
  firebaseUserMiddlewareWithCache,
  
  // Cache utilities
  clearCache,
  clearAllCache
};

/**
 * USAGE IN index.js or main app file:
 * 
 * const { firebaseEnrichMiddleware } = require('./middleware/firebaseMiddleware');
 * 
 * // Add after auth and org middleware
 * app.use(requireAuth);
 * app.use(requireOrg);
 * app.use(firebaseEnrichMiddleware);  // Fetch Firebase details for all routes
 * 
 * // Now in your controllers:
 * async function myController(req, res, next) {
 *   const orgName = req.orgDetails?.name;  // Safely access
 *   const userName = req.userDetails?.name;
 * }
 */
