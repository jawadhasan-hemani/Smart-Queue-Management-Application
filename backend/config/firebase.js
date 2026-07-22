const admin = require('firebase-admin');

// We load the service account key from the config folder
let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (err) {
  console.warn('serviceAccountKey.json not found, using default initialization (might fail token verification without credentials)');
}

let isInitialized = false;

if (!admin.apps.length) {
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
