const express = require('express');
const router = express.Router();
const { syncUser } = require('../controllers/authController');
const { verifyFirebaseToken } = require('../middleware/authMiddleware');

// Route for syncing user info and role from Firebase to backend
router.post('/sync', verifyFirebaseToken, syncUser);

// Example of a protected admin route just to show role handling works
const { authorize } = require('../middleware/authMiddleware');
router.get('/admin-only', verifyFirebaseToken, authorize('admin'), (req, res) => {
  res.json({ message: 'Welcome Admin' });
});

module.exports = router;
