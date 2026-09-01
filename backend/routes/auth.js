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

// Admin endpoint to add another admin
const userQueries = require('../src/db/userQueries');

router.post('/admins', verifyFirebaseToken, authorize('admin'), async (req, res) => {
  try {
    const { email } = req.body;
    let targetUser = await userQueries.findUserByEmail(email);
    if (!targetUser) {
      // Create a stub if they don't exist yet, so when they log in it doesn't overwrite
      await userQueries.insertUserCredentials(`stub_${Date.now()}`, email, 'stub', 'admin');
    } else {
      await userQueries.updateUserRole(targetUser.id, 'admin');
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

// Admin endpoint to remove an admin
router.delete('/admins/:email', verifyFirebaseToken, authorize('admin'), async (req, res) => {
  try {
    const { email } = req.params;
    if (email === 'admin@queuesmart.com') {
      return res.status(400).json({ error: 'Cannot remove master admin' });
    }
    const targetUser = await userQueries.findUserByEmail(email);
    if (targetUser) {
      await userQueries.updateUserRole(targetUser.id, 'user');
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to remove admin' });
  }
});

module.exports = router;
