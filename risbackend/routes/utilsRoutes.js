// routes/utilsRoutes.js
const express = require('express');
const router = express.Router();
const utils = require('../controllers/utilsController');

router.get('/accession/preview', utils.previewAccession);
router.get('/accession/next', utils.nextAccession);
router.post('/uid/reserve', utils.reserveUIDs);

module.exports = router;
