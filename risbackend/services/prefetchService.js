/**
 * services/prefetchService.js
 * 
 * Orchestrates WADO-RS prefetching for prior studies.
 */

'use strict';

const matcher = require('./priorStudyMatcher');
const pacsService = require('./pacsService');
const { pool } = require('../config/postgres');

/**
 * Trigger prefetch workflow for a study's priors.
 * 
 * @param {string} studyUID 
 * @param {Object} currentMeta 
 */
async function prefetchPriors(studyUID, currentMeta = {}) {
    const patientID = currentMeta.patientID;
    if (!patientID) return;

    try {
        console.log(`🚀 [Prefetch] Starting prior search for Patient: ${patientID}`);
        
        // 1. Find relevant priors
        const priors = await matcher.findPriors(patientID, studyUID, currentMeta);
        
        if (priors.length === 0) {
            console.log(`ℹ️  [Prefetch] No prior studies found for patient.`);
            return;
        }

        // 2. Select top 2 priors for prefetching
        const topPriors = priors.slice(0, 2);
        
        // 3. Trigger WADO-RS Metadata fetch to warm PACS/Orthanc cache
        // We fetch from all active PACS that might hold these studies
        const pacsServers = await pool.query(`SELECT * FROM pacs_servers WHERE is_active = true`);

        for (const prior of topPriors) {
            console.log(`🛰️  [Prefetch] Warming cache for prior: ${prior.study_instance_uid} (Score: ${prior.relevanceScore})`);
            
            try {
                // retrieveStudy handles the WADO-RS/DIMSE trigger logic
                await pacsService.retrieveStudy(prior.study_instance_uid);
                console.log(`✅ [Prefetch] Cache warmed for prior: ${prior.study_instance_uid}`);
            } catch (err) {
                console.warn(`⚠️  [Prefetch] Warming failed for ${prior.study_instance_uid}:`, err.message);
            }
        }

    } catch (err) {
        console.error("💥 [prefetchService] Prefetch failed:", err.message);
    }
}

module.exports = {
    prefetchPriors
};
