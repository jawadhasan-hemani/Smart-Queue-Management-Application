const { query } = require('../../config/db');

/** Return every service, newest first. */
async function getAllServices() {
  const sql = 'SELECT * FROM services ORDER BY created_at DESC';
  const { rows } = await query(sql);
  return rows;
}

/** Find a single service by its UUID. */
async function getServiceById(id) {
  const sql = 'SELECT * FROM services WHERE id = $1';
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

/** Insert a new service and return it. */
async function insertService(name, description, duration, priority, open = true) {
  const sql = `
    INSERT INTO services (name, description, duration, priority, open)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;
  const { rows } = await query(sql, [name, description, duration, priority, open]);
  return rows[0];
}

/**
 * Update a service by id.
 * Only updates the fields provided in the `fields` object.
 */
async function updateService(id, fields) {
  const allowed = ['name', 'description', 'duration', 'priority', 'open'];
  const sets = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${idx}`);
      values.push(fields[key]);
      idx++;
    }
  }

  if (sets.length === 0) return getServiceById(id);

  sets.push(`updated_at = NOW()`);
  values.push(id);

  const sql = `
    UPDATE services
    SET ${sets.join(', ')}
    WHERE id = $${idx}
    RETURNING *;
  `;
  const { rows } = await query(sql, values);
  return rows[0] || null;
}

/** Delete a service by id. */
async function deleteService(id) {
  const sql = 'DELETE FROM services WHERE id = $1 RETURNING *';
  const { rows } = await query(sql, [id]);
  return rows[0] || null;
}

module.exports = {
  getAllServices,
  getServiceById,
  insertService,
  updateService,
  deleteService,
};
