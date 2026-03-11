// routes/modalityRoutes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');

// GET all
router.get('/', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM modalities ORDER BY name ASC");
        res.json({ success: true, data: r.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// CREATE
router.post('/', async (req, res) => {
    try {
        const { name, ae_title, ip_address, port, description, color } = req.body;
        console.log("[DEBUG] Creating Modality:", req.body);

        // validation
        if (!name || !ae_title || !ip_address) {
            console.error("[DEBUG] Missing fields:", req.body);
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Force variables to string/int to avoid undefined issues
        const pPort = parseInt(port) || 104;
        const pDesc = description || '';
        const pColor = color || '#3b82f6';

        const q = `
            INSERT INTO modalities (name, ae_title, ip_address, port, description, color, body_parts) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        const params = [name, ae_title, ip_address, pPort, pDesc, pColor, JSON.stringify(req.body.body_parts || [])];
        console.log("[DEBUG] Executing Query:", q);
        console.log("[DEBUG] With Params:", params);

        const r = await pool.query(q, params);
        console.log("[DEBUG] Inserted Row:", r.rows[0]);

        // Also update server whitelist if we were filtering...
        // require('../services/mwlServer').updateWhitelist(); 

        res.status(201).json({ success: true, data: r.rows[0] });
    } catch (err) {
        console.error(err);
        if (err.code === '23505') return res.status(409).json({ success: false, message: "AE Title already exists" });
        res.status(500).json({ success: false, error: err.message });
    }
});

// UPDATE
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, ae_title, ip_address, port, description, color, body_parts } = req.body;

        // Fetch current values first to ensure partial updates don't clear data
        const current = await pool.query("SELECT * FROM modalities WHERE id = $1", [id]);
        if (current.rowCount === 0) return res.status(404).json({ success: false, message: "Not found" });
        const c = current.rows[0];

        const q = `
      UPDATE modalities 
      SET name=$1, ae_title=$2, ip_address=$3, port=$4, description=$5, color=$6, body_parts=$7, updated_at=NOW()
      WHERE id=$8
      RETURNING *
    `;
        const params = [
            name || c.name,
            ae_title || c.ae_title,
            ip_address || c.ip_address,
            port !== undefined ? port : c.port,
            description !== undefined ? description : c.description,
            color || c.color,
            body_parts ? JSON.stringify(body_parts) : JSON.stringify(c.body_parts || []),
            id
        ];
        const r = await pool.query(q, params);
        if (r.rowCount === 0) return res.status(404).json({ success: false, message: "Not found" });

        res.json({ success: true, data: r.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE
router.delete('/:id', async (req, res) => {
    try {
        await pool.query("DELETE FROM modalities WHERE id = $1", [req.params.id]);
        res.json({ success: true, message: "Deleted" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
