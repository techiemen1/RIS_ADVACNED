/**
 * scripts/test_prior_matching.js
 * 
 * Verifies the prior matching scoring logic.
 */

'use strict';

const matcher = require('../services/priorStudyMatcher');

async function test() {
    console.log("🧪 Testing Prior Study Matching Logic...");

    const currentMeta = {
        modality: 'CT',
        bodyPart: 'CHEST',
        description: 'CT CHEST WITH CONTRAST'
    };

    // We'll mock the findPriors to test the score assignment logic if possible, 
    // but here we just want to ensure it connects and runs.
    try {
        const priors = await matcher.findPriors("TEST-PATIENT-001", "1.2.3.4.5.6", currentMeta);
        console.log(`✅ Found ${priors.length} priors.`);
        if (priors.length > 0) {
            console.log("Top Prior Score:", priors[0].relevanceScore);
        }
        process.exit(0);
    } catch (err) {
        console.error("❌ Test failed:", err.message);
        process.exit(1);
    }
}

test();
