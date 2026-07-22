const { usersStore } = require('../data/users');

// @desc    Sync Firebase user with backend in-memory store
// @route   POST /api/auth/sync
// @access  Private (Requires valid Firebase Token)
const syncUser = (req, res) => {
  try {
    const { uid, email } = req.user;
    const { name, role } = req.body;
    
    // Field validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required from token' });
    }

    if (!usersStore[uid]) {
      // First time logging in, create user record in memory
      // If role is passed, we check if it's admin. In a real app we wouldn't let the user just pass 'admin', 
      // but for this assignment we will allow them to pass their desired role or default to 'user'.
      let assignedRole = 'user';
      if (role === 'admin' || role === 'administrator') {
        assignedRole = 'admin';
      }

      usersStore[uid] = {
        uid,
        email,
        name: name || '',
        role: assignedRole,
        createdAt: new Date().toISOString()
      };
    }

    res.status(200).json({
      message: 'User synced successfully',
      user: usersStore[uid]
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Server error while syncing user' });
  }
};

module.exports = {
  syncUser
};
