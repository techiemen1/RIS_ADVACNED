const express = require('express');
const router = express.Router();
const { addItem, getItems, updateItem, deleteItem } = require('../controllers/inventoryController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Admin or staff can add
router.post('/', verifyToken, authorize(['admin','staff']), addItem);

// Get all items
router.get('/', verifyToken, authorize(['admin','staff','radiologist','technologist']), getItems);

// Update item
router.put('/:id', verifyToken, authorize(['admin','staff']), updateItem);

// Delete item
router.delete('/:id', verifyToken, authorize(['admin']), deleteItem);

module.exports = router;
