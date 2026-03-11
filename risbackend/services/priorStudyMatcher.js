/**
 * services/priorStudyMatcher.js
 * 
 * Clinical matching engine to identify relevant historical studies for a patient.
 * Scores studies based on Modality, BodyPart, and Description.
 */

'use strict';

const { pool } = require('../config/postgres');
const dayjs = require('dayjs');

/**
 * Find the most relevant prior studies for a patient.
 * 
 * @param {string} patientID - DICOM Patient ID (MRN)
 * @param {string} currentStudyUID - The study currently being opened (to exclude)
 * @param {Object} currentMetadata - Metadata of the current study for matching
 * @returns {Array} Ranked list of prior studies
 */
async function findPriors(patientID, currentStudyUID, currentMetadata = {}) {
    const { modality, bodyPart, description } = currentMetadata;

    // 1. Fetch all previous studies for this patient from our registry
    const res = await pool.query(
        `SELECT study_instance_uid, modality, body_part, description, study_date, accession_number, patient_name
         FROM pacs_studies 
         WHERE patient_id_dicom = $1 AND study_instance_uid != $2
         ORDER BY study_date DESC`,
        [patientID, currentStudyUID]
    );

    const candidates = res.rows;
    if (candidates.length === 0) return [];

    // 2. Scoring Algorithm
    const scored = candidates.map(prior => {
        let score = 0;

        // A. Modality Match (+30)
        if (modality && prior.modality && prior.modality.toUpperCase() === modality.toUpperCase()) {
            score += 30;
        }

        // B. Body Part Match (+50) - Highest Priority
        if (bodyPart && prior.body_part && prior.body_part.toLowerCase() === bodyPart.toLowerCase()) {
            score += 50;
        }

        // C. Description Keyword Match (+20)
        if (description && prior.description) {
            const currentWords = description.toLowerCase().split(/\s+/);
            const priorDesc = prior.description.toLowerCase();
            const hasKeywordMatch = currentWords.some(word => word.length > 3 && priorDesc.includes(word));
            if (hasKeywordMatch) score += 20;
        }

        // D. Temporal Decay
        // -1 point for every 30 days of age
        if (prior.study_date) {
            const monthsOld = dayjs().diff(dayjs(prior.study_date), 'month');
            score -= Math.min(monthsOld, 20); // Max decay of 20 points
        }

        return { ...prior, relevanceScore: score };
    });

    // 3. Sort by Score descending
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return scored;
}

module.exports = {
    findPriors
};
