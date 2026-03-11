const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const { requireBranchContext } = require('../middleware/branchMiddleware');

router.post('/', verifyToken, requireBranchContext, authorize(['admin', 'staff', 'receptionist', 'doctor']), orderController.createOrder);
router.get('/', verifyToken, requireBranchContext, orderController.getOrders);
router.get('/patient/:patientId', verifyToken, requireBranchContext, orderController.getPatientOrders);

module.exports = router;
