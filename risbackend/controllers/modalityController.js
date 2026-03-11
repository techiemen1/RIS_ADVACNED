const { pool } = require('../config/postgres');

const getAllModalities = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM modalities ORDER BY name ASC');
        res.json({ data: result.rows });
    } catch (error) {
        console.error('Error fetching modalities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const createModality = async (req, res) => {
    const { name, description, color } = req.body;
    if (!name) return res.status(400).json({ error: 'Modality name is required' });

    try {
        const result = await pool.query(
            'INSERT INTO modalities (name, description, color) VALUES ($1, $2, $3) RETURNING *',
            [name.toUpperCase(), description, color || 'blue']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Modality already exists' });
        }
        console.error('Error creating modality:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateModality = async (req, res) => {
    const { id } = req.params;
    const { body_parts, color, description } = req.body;
    try {
        const result = await pool.query(
            'UPDATE modalities SET body_parts = $1, color = $2, description = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
            [JSON.stringify(body_parts || []), color, description, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating modality:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const deleteModality = async (req, res) => {
    const { id } = req.params;
    try {
        // Ideally check if used in appointments/orders first, but for now allow delete
        await pool.query('DELETE FROM modalities WHERE id = $1', [id]);
        res.json({ message: 'Modality deleted successfully' });
    } catch (error) {
        console.error('Error deleting modality:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllModalities,
    createModality,
    updateModality,
    deleteModality,
};
