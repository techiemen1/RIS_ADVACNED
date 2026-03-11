/**
 * PACS Admin Controller
 * Handles CRUD operations for PACS servers
 */

const PACSModel = require('../models/pacsModel');

// --- GET: List all PACS servers ---
exports.listServers = async (req, res) => {
  try {
    const list = await PACSModel.getAll();
    res.json(list);
  } catch (err) {
    console.error('❌ PACS list error:', err);
    res.status(500).json({ error: 'Failed to list PACS servers' });
  }
};

// --- POST: Create a new PACS server ---
exports.createServer = async (req, res) => {
  try {
    const data = req.body;
    const created = await PACSModel.create(data);
    res.status(201).json(created);
  } catch (err) {
    console.error('❌ PACS create error:', err);
    res.status(500).json({ error: 'Failed to create PACS server' });
  }
};

// --- PUT: Update PACS server ---
exports.updateServer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = (await PACSModel.getAll()).find((p) => p.id === id);
    if (!existing)
      return res.status(404).json({ error: 'PACS server not found' });

    const updateData = req.body;
    const updated = await PACSModel.update(id, updateData);
    res.json(updated);
  } catch (err) {
    console.error('❌ PACS update error:', err);
    res.status(500).json({ error: 'Failed to update PACS server' });
  }
};

// --- DELETE: Remove PACS server ---
exports.deleteServer = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const removed = await PACSModel.remove(id);
    if (!removed)
      return res.status(404).json({ error: 'PACS server not found' });
    res.json({ message: 'Deleted', server: removed });
  } catch (err) {
    console.error('❌ PACS delete error:', err);
    res.status(500).json({ error: 'Failed to delete PACS server' });
  }
};
