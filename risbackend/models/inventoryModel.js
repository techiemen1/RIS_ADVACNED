const { pool } = require('../db');

// Add new inventory item
exports.addItem = async (data) => {
  const { name, category, quantity, unit_price, modality, created_by } = data;

  const result = await pool.query(
    `INSERT INTO inventory
      (name, category, quantity, unit_price, modality, created_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)
     RETURNING *`,
    [name, category, quantity, unit_price, modality || 'ALL', created_by]
  );

  return result.rows[0];
};

// Get all inventory items
exports.getItems = async () => {
  const result = await pool.query(`SELECT * FROM inventory ORDER BY name`);
  return result.rows;
};

// Update an item
exports.updateItem = async (id, data) => {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((key, i) => `${key}=$${i + 1}`).join(',');

  const result = await pool.query(
    `UPDATE inventory SET ${setClause}, updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length + 1} RETURNING *`,
    [...values, id]
  );

  return result.rows[0];
};

// Delete an item
exports.deleteItem = async (id) => {
  const result = await pool.query(`DELETE FROM inventory WHERE id=$1 RETURNING *`, [id]);
  return result.rows[0];
};
