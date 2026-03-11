/**
 * services/aiClinicalContextService.js
 * 
 * Aggregates study metadata, prior reports, and historical studies
 * to feed into the Groq AI engine for contextual intelligence.
 */

const { pool } = require("../config/postgres");
const { findPriors } = require("./priorStudyMatcher");
const { getReport } = require("../models/reportModel");
const { generateText } = require("./aiService");

/**
 * Ensures the exact format requested by the AI context processor.
 */
exports.generateContext = async (studyUID) => {
    // 1. Fetch current study metadata
    const studyRes = await pool.query(
        "SELECT patient_id_dicom, modality, body_part, description, study_date FROM pacs_studies WHERE study_instance_uid = $1",
        [studyUID]
    );
    
    if (studyRes.rows.length === 0) {
        throw new Error("Study not found in local registry for AI context generation.");
    }
    
    const study = studyRes.rows[0];
    const patientID = study.patient_id_dicom || '';

    // 2. Fetch prior studies (using existing matcher logic)
    const priors = patientID ? await findPriors(patientID, studyUID, study) : [];
    
    // 3. Find the latest report text
    const report = await getReport(studyUID);

    // 4. Construct AI context
    const aiContextObject = {
        study_metadata: {
            modality: study.modality || "Unknown",
            body_part: study.body_part || "Unknown",
            description: study.description || "None provided",
            date: study.study_date || "Unknown"
        },
        prior_studies: priors.slice(0, 3).map(p => ({
            date: p.study_date,
            description: p.description,
            modality: p.modality
        })),
        report_text: report ? report.content : null,
        modality: study.modality || "Unknown",
        body_part: study.body_part || "Unknown"
    };

    // 5. Send to AI
    const prompt = `
    You are an AI Clinical Assistant functioning within a RIS/PACS workspace.
    Analyze the following clinical context for a radiological study:
    
    ${JSON.stringify(aiContextObject, null, 2)}
    
    Respond STRICTLY in JSON format with the following keys:
    - "findings": A brief bulleted list of suggested observations based on the modality and body region. If report text is provided, summarize abnormalities from it.
    - "comparisons": Specific hints on what to compare in the current study versus the prior studies listed.
    - "alerts": Any critical warnings (e.g. contrast contraindications, urgent anomalies based on text or matching flags).
    
    Output nothing except valid JSON.
    `;

    const aiResult = await generateText({ context: prompt, type: "impression" });
    let parsedAI;
    
    try {
        // Handle markdown block wrapping if the LLM returned it
        const cleanedText = aiResult.text.replace(/```(json)?/gi, '').trim();
        parsedAI = JSON.parse(cleanedText);
    } catch (e) {
        console.warn("AI returned malformed JSON, using fallback parsed output.", aiResult.text);
        parsedAI = {
            findings: aiResult.text,
            comparisons: "See findings text for details.",
            alerts: "Syntax parser error."
        };
    }

    const { findings, comparisons, alerts } = parsedAI;
    
    const findingsStr = typeof findings === "string" ? findings : JSON.stringify(findings);
    const comparisonsStr = typeof comparisons === "string" ? comparisons : JSON.stringify(comparisons);
    const alertsStr = typeof alerts === "string" ? alerts : JSON.stringify(alerts);

    // 6. Save or Update in database
    const upsertQuery = `
        INSERT INTO ai_clinical_context 
        (study_instance_uid, patient_id, modality, body_part, suggested_findings, comparison_hints, abnormality_alerts)
        VALUES 
        ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (study_instance_uid) 
        DO UPDATE SET 
            suggested_findings = EXCLUDED.suggested_findings,
            comparison_hints = EXCLUDED.comparison_hints,
            abnormality_alerts = EXCLUDED.abnormality_alerts,
            created_at = NOW()
        RETURNING *
    `;

    const result = await pool.query(upsertQuery, [
        studyUID, 
        patientID, 
        study.modality, 
        study.body_part, 
        findingsStr, 
        comparisonsStr, 
        alertsStr
    ]);

    return result.rows[0];
};
