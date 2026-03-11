/**
 * controllers/prefetchController.js
 * 
 * Controller for DICOM prefetch operations.
 */

'use strict';

const prefetchService = require('../services/prefetchService');
const { pool } = require('../config/postgres');

/**
 * Trigger prefetch for a study's priors.
 * POST /api/prefetch/priors/:studyUID
 */
exports.triggerPrefetch = async (req, res) => {
    try {
        const { studyUID } = req.params;
        const { patientID, modality, bodyPart, description } = req.body;

        if (!patientID) {
            return res.status(400).json({ success: false, message: "PatientID is required for prefetch" });
        }

        // Run prefetch in background
        prefetchService.prefetchPriors(studyUID, {
            patientID,
            modality,
            bodyPart,
            description
        }).catch(err => console.error("Background prefetch error:", err));

        return res.json({
            success: true,
            message: "Prefetch triggered in background"
        });

    } catch (err) {
        console.error("prefetchController.triggerPrefetch", err);
        return res.status(500).json({ success: false, error: err.message });
    }
};
