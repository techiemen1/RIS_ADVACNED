// routes/pacsRoutes.js
const express = require('express');
const router = express.Router();
const pacsController = require('../controllers/pacsController');
const auth = require("../middleware/auth");   // ✅ THIS WAS MISSING
const audit = require("../middleware/auditLogger"); // optional, if you use it
const PACSModel = require('../models/pacsModel');

const { requireBranchContext } = require('../middleware/branchMiddleware');

// List
router.get('/', auth, requireBranchContext, pacsController.list);

// Create
router.post('/', auth, audit('CREATE', 'PACS'), pacsController.create);

// Get by ID
router.get('/:id', auth, pacsController.getById);

// Update
router.put('/:id', auth, audit('UPDATE', 'PACS'), pacsController.update);

// Delete
router.delete('/:id', auth, audit('DELETE', 'PACS'), pacsController.remove);

// proxy QIDO studies
router.get('/:id/studies', pacsController.getStudies);

// test endpoint
router.post('/:id/test', pacsController.testPacs);

router.post(
  "/:id/sync",
  auth,
  pacsController.syncStudies
);


module.exports = router;
