const admin = require('firebase-admin');

// We load the service account key from the config folder or environment variable
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Railway/Production: Read from Environment Variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    // Local Development: Read from file
    serviceAccount = require('./serviceAccountKey.json');
  }
} catch (err) {
  console.warn('Firebase credentials not found, using default initialization (might fail token verification without credentials)', err.message);
}

let isInitialized = false;

// Check if firebase admin has been initialized
if (admin.apps === undefined || admin.apps.length === 0) {
  try {
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp();
    }
    isInitialized = true;
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

module.exports = admin;
