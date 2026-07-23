// In-memory data store for user roles and additional profile info
// Structure: { [uid]: { role: 'user' | 'admin', name: 'string', email: 'string' } }

const usersStore = {};

module.exports = {
  usersStore
};
