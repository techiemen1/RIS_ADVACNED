/**
 * Admin PACS Management Routes (CRUD PACS Servers)
 * iPacx RIS Backend — 2025
 */

// routes/pacsAdminRoutes.js
const express = require('express');
const router = express.Router();
const PACSModel = require('../models/pacsModel');

// GET /api/admin/pacs
router.get('/', async (req, res) => {
  try {
    const list = await PACSModel.getAll();
    res.json({ success: true, data: list });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/pacs
router.post('/', async (req, res) => {
  try {
    const created = await PACSModel.create(req.body);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/pacs/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await PACSModel.update(Number(req.params.id), req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const removed = await PACSModel.remove(Number(req.params.id));
    res.json({ success: true, data: removed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
