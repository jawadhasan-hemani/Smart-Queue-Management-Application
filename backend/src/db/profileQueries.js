const { query } = require('../../config/db');

/**
 * Insert a new user profile.
 * Uses ON CONFLICT on user_id so re-sync is safe.
 */
async function insertUserProfile(userId, fullName, email, phone = null, preferences = {}) {
  const sql = `
    INSERT INTO user_profiles (user_id, full_name, email, phone, preferences)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id) DO UPDATE
      SET full_name   = EXCLUDED.full_name,
          email       = EXCLUDED.email,
          phone       = EXCLUDED.phone,
          preferences = EXCLUDED.preferences,
          updated_at  = NOW()
    RETURNING *;
  `;
  const { rows } = await query(sql, [
    userId,
    fullName,
    email,
    phone,
    JSON.stringify(preferences),
  ]);
  return rows[0];
}

/** Get a profile by user_credentials id. */
async function getProfileByUserId(userId) {
  const sql = 'SELECT * FROM user_profiles WHERE user_id = $1';
  const { rows } = await query(sql, [userId]);
  return rows[0] || null;
}

/** Partial update of a user profile. */
async function updateProfile(userId, fields) {
  const allowed = ['full_name', 'email', 'phone', 'preferences'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(key === 'preferences' ? JSON.stringify(fields[key]) : fields[key]);
      idx++;
    }
  }

  if (sets.length === 0) return getProfileByUserId(userId);

  sets.push(`updated_at = NOW()`);
  values.push(userId);

  const sql = `
    UPDATE user_profiles
    SET ${sets.join(', ')}
    WHERE user_id = $${idx}
    RETURNING *;
  `;
  const { rows } = await query(sql, values);
  return rows[0] || null;
}

module.exports = {
  insertUserProfile,
  getProfileByUserId,
  updateProfile,
};
