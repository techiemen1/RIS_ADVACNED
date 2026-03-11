const express = require('express');
const router = express.Router();
const branchController = require('../controllers/branchController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

router.get('/', verifyToken, branchController.listBranches);
router.post('/', verifyToken, authorize(['admin']), branchController.createBranch);

module.exports = router;
