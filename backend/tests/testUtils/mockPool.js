const pool = { query: jest.fn() };

function resetMockPool() {
  pool.query.mockReset();
}

module.exports = { pool, resetMockPool };
