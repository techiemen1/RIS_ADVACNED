// routes/appointmentsRoutes.js
const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, appointmentsController.list);
router.get('/:id', verifyToken, appointmentsController.getById);
router.post('/', verifyToken, appointmentsController.create);
router.put('/:id', verifyToken, appointmentsController.update);
router.delete('/:id', verifyToken, appointmentsController.remove);

module.exports = router;
