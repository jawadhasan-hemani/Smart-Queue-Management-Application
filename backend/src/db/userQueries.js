const { query } = require('../../config/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

/**
 * Insert a new user into user_credentials.
 * Uses ON CONFLICT to make the call idempotent (re-sync safe).
 */
async function insertUserCredentials(firebaseUid, email, rawPassword, role = 'user') {
  const passwordHash = await bcrypt.hash(rawPassword || firebaseUid, SALT_ROUNDS);
  const sql = `
    INSERT INTO user_credentials (firebase_uid, email, password_hash, role)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (firebase_uid) DO UPDATE
      SET email      = EXCLUDED.email,
          updated_at = NOW()
    RETURNING *;
  `;
  const { rows } = await query(sql, [firebaseUid, email, passwordHash, role]);
  return rows[0];
}

/** Find a user_credentials row by Firebase UID. */
async function findUserByFirebaseUid(firebaseUid) {
  const sql = 'SELECT * FROM user_credentials WHERE firebase_uid = $1';
  const { rows } = await query(sql, [firebaseUid]);
  return rows[0] || null;
}

/** Find a user_credentials row by email. */
async function findUserByEmail(email) {
  const sql = 'SELECT * FROM user_credentials WHERE email = $1';
  const { rows } = await query(sql, [email]);
  return rows[0] || null;
}

/** Update a user's role. */
async function updateUserRole(id, role) {
  const sql = `
    UPDATE user_credentials
    SET role = $2, updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;
  const { rows } = await query(sql, [id, role]);
  return rows[0] || null;
}

module.exports = {
  insertUserCredentials,
  findUserByFirebaseUid,
  findUserByEmail,
  updateUserRole,
};
