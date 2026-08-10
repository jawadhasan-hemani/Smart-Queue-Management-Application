const { query } = require('../../config/db');

// ── Sessions ──

async function createSession(userId, title = 'New Chat') {
  const result = await query(
    `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *`,
    [userId, title]
  );
  return result.rows[0];
}

async function getSessionsByUser(userId) {
  const result = await query(
    `SELECT s.*, 
       (SELECT content FROM chat_messages WHERE session_id = s.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) AS preview
     FROM chat_sessions s
     WHERE s.user_id = $1
     ORDER BY s.updated_at DESC`,
    [userId]
  );
  return result.rows;
}

async function getSessionById(sessionId) {
  const result = await query(
    `SELECT * FROM chat_sessions WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0] || null;
}

async function updateSessionTitle(sessionId, title) {
  const result = await query(
    `UPDATE chat_sessions SET title = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [sessionId, title]
  );
  return result.rows[0] || null;
}

async function deleteSession(sessionId) {
  const result = await query(
    `DELETE FROM chat_sessions WHERE id = $1 RETURNING *`,
    [sessionId]
  );
  return result.rows[0] || null;
}

// ── Messages ──

async function getSessionMessages(sessionId) {
  const result = await query(
    `SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC`,
    [sessionId]
  );
  return result.rows;
}

async function insertChatMessage(userId, sessionId, role, content) {
  // Insert the message
  const result = await query(
    `INSERT INTO chat_messages (user_id, session_id, role, content) VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, sessionId, role, content]
  );

  // Touch the session's updated_at timestamp
  await query(
    `UPDATE chat_sessions SET updated_at = now() WHERE id = $1`,
    [sessionId]
  );

  return result.rows[0];
}

module.exports = {
  createSession,
  getSessionsByUser,
  getSessionById,
  updateSessionTitle,
  deleteSession,
  getSessionMessages,
  insertChatMessage,
};
