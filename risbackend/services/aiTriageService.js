/**
 * services/aiTriageService.js
 * 
 * Intelligent Triage Engine for Radiology Studies.
 * Analyzes study metadata to automatically assign an urgency score and priority level,
 * ensuring critical findings (Stroke, Trauma) are surfaced to radiologists immediately.
 */

'use strict';

/**
 * Keywords indicating high clinical urgency.
 */
const CRITICAL_KEYWORDS = [
    'STAT', 'URGENT', 'TRAUMA', 'STROKE', 'CODE', 'ER', 'EMERGENCY', 'MVA', 'MVI',
    'HEMORRHAGE', 'BAM', 'CRITICAL', 'RAPID', 'DISSECTION', 'ANEU', 'RUPTURE', 'RED'
];

/**
 * Keywords indicating moderate urgency.
 */
const URGENT_KEYWORDS = [
    'ASAP', 'FAST', 'SUSPECTED', 'RULE OUT', 'R/O', 'SEVERE PAIN', 'ACUTE',
    'POST-OP', 'PRE-OP', 'YELLOW', 'PRIORITY'
];

/**
 * Modality base weighting.
 */
const MODALITY_WEIGHTS = {
    'CT': 20,
    'MR': 15, // MRI
    'PT': 25, // PET
    'XA': 30, // Angiography
    'US': 5,
    'CR': 5,
    'DX': 5,
    'MG': 10 // Mammography
};

/**
 * Analyze a study and return its calculated urgency.
 * 
 * @param {Object} studyData
 * @param {string} studyData.studyDescription
 * @param {string} studyData.modality
 * @param {string|number} studyData.patientAge
 * @returns {{ score: number, priority: string }}
 */
function analyzeStudy(studyData) {
    let score = 0;
    
    const desc = (studyData.studyDescription || '').toUpperCase();
    const mod = (studyData.modality || '').toUpperCase();
    
    // 1. Keyword Analysis (Text Mining)
    let foundCritical = false;
    for (const kw of CRITICAL_KEYWORDS) {
        if (desc.includes(kw)) {
            score += 60; // Huge bump for critical keywords
            foundCritical = true;
            break; // Max one bump per tier
        }
    }
    
    if (!foundCritical) {
        for (const kw of URGENT_KEYWORDS) {
            if (desc.includes(kw)) {
                score += 30; // Medium bump
                break;
            }
        }
    }
    
    // 2. Modality Analysis (Acrhuity baseline)
    if (MODALITY_WEIGHTS[mod]) {
        score += MODALITY_WEIGHTS[mod];
    } else {
        // Broad matches for multi-modality strings (e.g. "CT, PT")
        if (mod.includes('CT')) score += 20;
        else if (mod.includes('MR')) score += 15;
    }
    
    // 3. Demographic Analysis (Extremes of age increase risk slightly)
    const ageMatch = studyData.patientAge ? String(studyData.patientAge).match(/\d+/) : null;
    if (ageMatch) {
       const age = parseInt(ageMatch[0], 10);
       const unit = String(studyData.patientAge).toUpperCase();
       
       let ageInYears = age;
       if (unit.includes('M') && !unit.includes('Y')) ageInYears = age / 12; // Months
       if (unit.includes('D')) ageInYears = age / 365; // Days
       
       // Pediatric (<5) or Geriatric (>80) get a slight bump
       if (ageInYears <= 5) {
           score += 10;
       } else if (ageInYears >= 80) {
           score += 10;
       }
    }
    
    // Cap score at 100
    score = Math.min(score, 100);
    
    // Determine Priority Tier
    let priority = 'NORMAL';
    if (score >= 80) {
        priority = 'CRITICAL';
    } else if (score >= 50) {
        priority = 'URGENT';
    }
    
    return {
        score: Math.round(score),
        priority: priority
    };
}

module.exports = {
    analyzeStudy
};
