// @deprecated – This in-memory store is kept only for backward compatibility.
// The PostgreSQL database is now the single source of truth for user data.
// Use backend/src/db/userQueries.js and backend/src/db/profileQueries.js instead.
// Structure: { [uid]: { role: 'user' | 'admin', name: 'string', email: 'string' } }

const usersStore = {};

module.exports = {
  usersStore
};
