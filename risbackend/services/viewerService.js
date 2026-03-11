/**
 * services/viewerService.js
 * 
 * Orchestrates the launching logic for various DICOM viewers.
 * Supports: iPacx Mobile/Desktop/Workstation, OHIF, Weasis, RadiAnt.
 */

'use strict';

const { pool } = require('../config/postgres');
const jwt = require('jsonwebtoken');

/**
 * Generate launch configuration for a given study and viewer type.
 * 
 * @param {string} studyUID 
 * @param {string} viewerType - ohif, weasis, radiant, ipacx_gold, etc.
 * @param {string} profile - mobile, desktop, workstation
 * @returns {Object} Launch configuration
 */
async function getLaunchConfig(studyUID, viewerType = 'ohif', profile = 'desktop', pacsId = null) {
    // 1. Fetch study metadata to find which PACS it belongs to
    const studyRes = await pool.query(
        `SELECT study_instance_uid, accession_number, patient_name, modality 
         FROM pacs_studies 
         WHERE study_instance_uid = $1 
         LIMIT 1`,
        [studyUID]
    );

    // Fallback to study_metadata if not in pacs_studies
    let study = studyRes.rows[0];
    if (!study) {
        const metaRes = await pool.query(
            `SELECT * FROM study_metadata WHERE study_instance_uid = $1 LIMIT 1`,
            [studyUID]
        );
        study = metaRes.rows[0];
    }

    // 2. Get PACS server config
    let pacs;
    if (pacsId) {
        const pRes = await pool.query(`SELECT * FROM pacs_servers WHERE id = $1`, [pacsId]);
        pacs = pRes.rows[0];
    }

    // If no pacsId provided or not found, fallback to primary active PACS
    if (!pacs) {
        const pacsRes = await pool.query(
            `SELECT * FROM pacs_servers WHERE is_active = true ORDER BY id ASC LIMIT 1`
        );
        pacs = pacsRes.rows[0];
    }

    if (!pacs) {
        throw new Error("No active PACS server configured to serve images");
    }

    // If study still not found, we'll create a lightweight dummy object based on what we've seen
    // This allows launching studies directly from PACS proxy before they are "imported"
    if (!study) {
        study = {
            study_instance_uid: studyUID,
            patient_name: "Patient (Registry Pending)",
            patient_id: "N/A",
            modality: "DICOM",
            accession_number: "N/A"
        };
    }

    // 3. Construct WADO-RS URL
    // Standard Orthanc WADO-RS: http://host:port/dicom-web
    // Standard dcm4chee WADO-RS: http://host:port/dcm4chee-arc/aets/DCM4CHEE/rs
    let wadoRsUrl = pacs.wado_rs || (pacs.base_url ? `${pacs.base_url}/dicom-web` : `http://${pacs.host}:${pacs.port}/dicom-web`);

    // 4. Generate specific launch parameters
    const config = {
        studyUID: studyUID,
        patientID: study.patient_id_dicom || study.patient_id,
        patientName: study.patient_name,
        accessionNumber: study.accession_number,
        modality: study.modality,
        bodyPart: study.body_part,
        description: study.description,
        pacsName: pacs.name,
        viewerType: pacs.viewer_type || viewerType
    };

    // 🔥 Clinical Intelligence: Find Top Prior
    const matcher = require('./priorStudyMatcher');
    const priors = await matcher.findPriors(config.patientID, studyUID, config);
    if (priors.length > 0) {
        config.topPrior = priors[0].study_instance_uid;
        config.allRelevantPriors = priors.slice(0, 3).map(p => p.study_instance_uid);
    }

    switch (viewerType.toLowerCase()) {
        case 'ohif':
            // 🔥 Multi-modal loading: Include priors in the URL if found
            let uids = [studyUID];
            if (config.allRelevantPriors) {
                uids = uids.concat(config.allRelevantPriors);
            }

            const activeViewerType = (pacs.viewer_type || viewerType).toLowerCase();

            // Use custom viewer_url from PACS config if provided
            if (pacs.viewer_url) {
                let base = pacs.viewer_url.trim();
                // Normalize: Check if it's missing the /viewer or /viewer/ part for OHIF
                if (activeViewerType === 'ohif' && !base.includes('/viewer')) {
                    base = base.endsWith('/') ? `${base}viewer` : `${base}/viewer`;
                }

                const separator = base.includes('?') ? '&' : '?';
                config.launchUrl = `${base}${separator}StudyInstanceUIDs=${uids.join(',')}`;
            } else {
                config.launchUrl = `/viewer?StudyInstanceUIDs=${uids.join(',')}`;
            }
            
            config.params = {
                wadoRsRoot: wadoRsUrl,
                qidoRsRoot: pacs.qido_rs || wadoRsUrl
            };
            break;

        case 'weasis':
            // Weasis uses a manifest file or base64 config
            const weasisConfig = {
                studyUID: studyUID,
                wadoRoot: wadoRsUrl
            };
            const base64Config = Buffer.from(JSON.stringify(weasisConfig)).toString('base64');
            config.launchUrl = `weasis://config:${base64Config}`;
            break;

        case 'radiant':
            // RadiAnt protocol handler usually takes study UID or a temp file
            config.launchUrl = `radiant://-study "${studyUID}"`;
            break;

        case 'ipacx_mobile':
        case 'mobile_lite':
            config.launchUrl = `/viewer/mobile/${studyUID}`;
            break;

        case 'ipacx_gold':
        case 'gold':
            // Generation of a short-lived viewer token (60 min)
            const token = jwt.sign(
                { studyUID, profile, exp: Math.floor(Date.now() / 1000) + (60 * 60) },
                process.env.JWT_SECRET || 'ris_secret'
            );
            config.launchUrl = `/viewer/gold/${studyUID}?token=${token}`;
            break;

        case 'workstation_pro':
            config.launchUrl = `/viewer/pro/${studyUID}`;
            config.params = {
                highPerformance: true,
                renderMode: 'server_side'
            };
            break;

        default:
            config.launchUrl = `/viewer?StudyInstanceUIDs=${studyUID}`;
    }

    return config;
}

module.exports = {
    getLaunchConfig
};
