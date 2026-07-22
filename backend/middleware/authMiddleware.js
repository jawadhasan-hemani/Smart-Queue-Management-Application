const admin = require('../config/firebase');
const { usersStore } = require('../data/users');

// Middleware to verify Firebase ID Token
const verifyFirebaseToken = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }

  try {
    // Verify token with Firebase Admin
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // Attach Firebase UID and decoded info to request
    req.user = decodedToken;
    
    // Look up the user in our in-memory store to attach role if exists
    const localUser = usersStore[decodedToken.uid];
    if (localUser) {
      req.user.role = localUser.role;
    } else {
      req.user.role = 'user'; // default role
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(401).json({ error: 'Not authorized, token failed verification' });
  }
};

// Middleware for checking user roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `User role ${req.user ? req.user.role : 'unknown'} is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = { verifyFirebaseToken, authorize };
