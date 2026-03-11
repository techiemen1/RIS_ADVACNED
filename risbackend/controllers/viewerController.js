/**
 * controllers/viewerController.js
 * 
 * Handles requests for launching DICOM viewers.
 */

'use strict';

const viewerService = require('../services/viewerService');

/**
 * GET /api/viewer/launch/:studyUID
 * Returns a viewer launch configuration or URL.
 */
exports.launchStudy = async (req, res) => {
    try {
        const { studyUID } = req.params;
        const { viewerType, profile, pacsId } = req.query;

        console.log(`📡 [Viewer] Requesting launch for ${studyUID} | Viewer: ${viewerType || 'default'} | Profile: ${profile || 'desktop'} | PACS: ${pacsId || 'default'}`);

        const config = await viewerService.getLaunchConfig(
            studyUID, 
            viewerType || 'ohif', 
            profile || 'desktop',
            pacsId || null
        );

        // 🔥 Clinical Intelligence: Trigger prefetch of priors in background
        const prefetchService = require('../services/prefetchService');
        prefetchService.prefetchPriors(studyUID, {
            patientID: config.patientID,
            modality: config.modality,
            bodyPart: config.bodyPart,
            description: config.description
        }).catch(err => console.error("📡 [Viewer] Background prefetch triggered:", err.message));

        return res.json({
            success: true,
            data: config
        });

    } catch (err) {
        console.error('💥 [viewerController] launchStudy failed:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Failed to generate viewer launch configuration',
            error: err.message
        });
    }
};
