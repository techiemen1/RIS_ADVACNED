const { pool } = require('../config/postgres');

exports.getAllBranches = async () => {
    const res = await pool.query('SELECT * FROM branches ORDER BY id ASC');
    return res.rows;
};

exports.getBranchById = async (id) => {
    const res = await pool.query('SELECT * FROM branches WHERE id = $1', [id]);
    return res.rows[0];
};

exports.createBranch = async (data) => {
    const { name, code, contact_number, email, address } = data;
    const res = await pool.query(
        'INSERT INTO branches (name, code, contact_number, email, address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, code, contact_number, email, address]
    );
    return res.rows[0];
};
