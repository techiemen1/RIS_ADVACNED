// routes/scheduleRoutes.js
const express = require('express');
const router = express.Router();
const { getAllSchedules, createSchedule, updateSchedule, deleteSchedule } = require('../controllers/scheduleController');

// GET all schedules
router.get('/', getAllSchedules);

// POST new schedule
router.post('/', createSchedule);

// PUT update schedule
router.put('/:id', updateSchedule);

// DELETE schedule
router.delete('/:id', deleteSchedule);

module.exports = router;
