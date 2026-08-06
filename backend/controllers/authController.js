const userQueries = require('../src/db/userQueries');
const profileQueries = require('../src/db/profileQueries');

// @desc    Sync Firebase user with backend database
// @route   POST /api/auth/sync
// @access  Private (Requires valid Firebase Token)
const syncUser = async (req, res) => {
  try {
    const { uid, email } = req.user;
    const { name, role } = req.body;

    // Field validation
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Valid email is required from token' });
    }

    // Determine role
    let assignedRole = 'user';
    if (role === 'admin' || role === 'administrator') {
      assignedRole = 'admin';
    }

    // Upsert into user_credentials (ON CONFLICT handles re-sync)
    const userRecord = await userQueries.insertUserCredentials(
      uid,
      email,
      uid, // Firebase manages passwords; we hash the UID as placeholder
      assignedRole,
    );

    // Upsert into user_profiles
    await profileQueries.insertUserProfile(
      userRecord.id,
      name || '',
      email,
    );

    res.status(200).json({
      message: 'User synced successfully',
      user: {
        uid: userRecord.firebase_uid,
        email: userRecord.email,
        name: name || '',
        role: userRecord.role,
        createdAt: userRecord.created_at,
      },
    });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Server error while syncing user' });
  }
};

module.exports = {
  syncUser,
};
