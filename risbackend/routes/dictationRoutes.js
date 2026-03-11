// routes/dictationRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DICT_PATH = path.join(__dirname, '../radiology_dictionary.json');

// GET dictionary
router.get('/dictionary', (req, res) => {
    try {
        if (!fs.existsSync(DICT_PATH)) {
            return res.status(404).json({ success: false, message: "Dictionary file not found" });
        }
        const data = fs.readFileSync(DICT_PATH, 'utf8');
        res.json({ success: true, data: JSON.parse(data) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// UPDATE dictionary
router.put('/dictionary', (req, res) => {
    try {
        const newData = req.body;
        fs.writeFileSync(DICT_PATH, JSON.stringify(newData, null, 2), 'utf8');

        // Also sync to public folder if it exists (for frontend direct fetch)
        const publicPath = path.join(__dirname, '../../risfrontend/public/radiology_dictionary.json');
        if (fs.existsSync(path.dirname(publicPath))) {
            fs.writeFileSync(publicPath, JSON.stringify(newData, null, 2), 'utf8');
        }

        res.json({ success: true, message: "Dictionary updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
