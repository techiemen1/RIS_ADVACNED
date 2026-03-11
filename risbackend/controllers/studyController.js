// controllers/studyController.js
const pacsService = require("../services/pacsService");
const { pool } = require("../config/postgres");
const { processStudyArrival } = require("../services/studyArrivalService");

/* ═══════════════════════════════════════════════════════════
   STUDY ARRIVED  (Orthanc Webhook Handler)
   POST /api/studies/arrived
   ─────────────────────────────────────────────────────────
   Called by Orthanc when a study becomes stable.
   No JWT required — Orthanc doesn't send auth headers.
   IP allowlist is enforced at the nginx / firewall level.

   Orthanc configuration (OrthancWebHooks plugin or built-in):
     {
       "RemoteServer": "http://localhost:5000/api/studies/arrived",
       "Events": ["StableStudy"]
     }
═══════════════════════════════════════════════════════════ */
exports.studyArrived = async (req, res) => {
  try {
    const body = req.body;

    // Minimal validation — a valid Orthanc payload always has at least one identifier
    if (!body || typeof body !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid webhook payload' });
    }

    const hasIdentifier =
      body.ID || body.id ||
      body.StudyInstanceUID ||
      (body.Tags && body.Tags.StudyInstanceUID);

    if (!hasIdentifier) {
      return res.status(400).json({
        success: false,
        error: 'Payload must contain ID, StudyInstanceUID, or Tags.StudyInstanceUID',
      });
    }

    // Delegate all business logic to the service
    const result = await processStudyArrival(body);

    // Orthanc expects a 2xx response quickly — respond before long processing
    return res.status(200).json({
      success:         true,
      studyUID:        result.parsed.studyUID,
      accessionNumber: result.parsed.accessionNumber,
      modality:        result.parsed.modality,
      matched:         result.matched,
      matchedBy:       result.matchedBy,
      orderId:         result.orderId,
      isUnscheduled:   result.isUnscheduled,
      pacsStudyId:     result.pacsStudy.id,
      radiologist:     result.radiologist,
      message:         result.isUnscheduled
        ? 'UNSCHEDULED study recorded — no matching RIS order found'
        : `Study matched to order #${result.orderId} — status set to ARRIVED`,
    });

  } catch (err) {
    console.error('💥 [studyArrived] Error:', err.message);
    return res.status(500).json({
      success: false,
      error:   'Study arrival processing failed',
      detail:  process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
};

/**
 * GET /api/studies/arrivals
 * List recent study arrivals with order matching status.
 * Used by the Radiology Worklist dashboard.
 */
exports.listArrivals = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT
         ps.id,
         ps.study_instance_uid,
         ps.accession_number,
         ps.modality,
         ps.patient_name,
         ps.patient_id_dicom,
         ps.study_date,
         ps.series_count,
         ps.instance_count,
         ps.arrival_status,
         ps.order_id,
         ps.urgency_score,
         ps.priority,
         o.status AS order_status,
         u.full_name AS radiologist_name,
         u.username  AS radiologist_username
       FROM pacs_studies ps
       LEFT JOIN orders o ON o.id = ps.order_id
       LEFT JOIN users  u ON u.id = ps.assigned_radiologist
       WHERE 1=1 ${req.applyBranchScope ? req.applyBranchScope('ps') : ''}
       ORDER BY ps.urgency_score DESC NULLS LAST, ps.arrived_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countRes = await pool.query('SELECT COUNT(*) FROM pacs_studies');
    const total    = parseInt(countRes.rows[0].count);

    return res.json({
      success: true,
      data:    result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });

  } catch (err) {
    console.error('listArrivals error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to list arrivals' });
  }
};



// Helper to sanitize DICOM names
const cleanName = (name) => {
  if (!name) return "";
  // If name contains carets, it might be raw DICOM like "LAST^FIRST^MIDDLE"
  // We replace carets with spaces
  let cleaned = name.replace(/\^/g, " ").replace(/\s+/g, " ").trim();

  // Heuristic: If name ends with something like " 43Y F" or " 43Y/F", it might be embedded demographics
  // for now just return the cleaned name string to be readable
  return cleaned;
};

// Start of getStudyMeta
exports.getStudyMeta = async (req, res) => {
  const { studyUID } = req.params;

  try {
    let pacsMeta = {};
    let localMeta = {};

    // 1. Fetch Local Overrides First
    try {
      const dbRes = await pool.query(
        `SELECT * FROM study_metadata WHERE study_instance_uid = $1`,
        [studyUID]
      );

      if (dbRes.rows[0]) {
        const r = dbRes.rows[0];
        localMeta = {
          patientName: r.patient_name,
          patientID: r.patient_id,
          modality: r.modality,
          accessionNumber: r.accession_number,
          studyDate: r.study_date ? new Date(r.study_date).toISOString().slice(0, 10).replace(/-/g, '') : undefined,
          patientSex: r.patient_sex,
          patientAge: r.patient_age,
          referringPhysician: r.referring_physician,
          bodyPart: r.body_part,
          created_at: r.created_at
        };

        // ENHANCEMENT: Fetch Clinical/Pregnancy Data from Patients Table
        if (r.patient_id) {
          try {
            // match MRN or maybe just ID if numeric? Let's try MRN first as that is the standard
            const patRes = await pool.query(
              `SELECT lmp_date, pregnancy_status, husband_name, relationship_name, indication_for_scan 
               FROM patients WHERE mrn = $1 OR id::text = $1`,
              [r.patient_id]
            );

            if (patRes.rows.length > 0) {
              const p = patRes.rows[0];
              localMeta.clinical = {
                isPregnant: p.pregnancy_status === 'YES' || p.pregnancy_status === true,
                lmp: p.lmp_date,
                husbandName: p.husband_name || (['W/O', 'H/O'].includes(p.relationship_type) ? p.relationship_name : ''),
                indication: p.indication_for_scan
              };
            }
          } catch (patErr) {
            console.warn("Clinical data lookup failed", patErr.message);
          }
        }
      }
    } catch (e) {
      console.warn("Local meta fetch failed", e.message);
    }

    // 2. Fetch PACS Data (Loop through all active servers if needed)
    try {
      const pacsServers = await pool.query(`SELECT * FROM pacs_servers WHERE is_active = true ORDER BY id`);

      for (const pacs of pacsServers.rows) {
        try {
          // Fetch from QIDO
          const studies = await pacsService.qidoStudies(pacs, { StudyInstanceUID: studyUID });
          const match = studies?.find(
            (s) => s.StudyInstanceUID === studyUID || s["0020000D"]?.Value?.[0] === studyUID
          );

          if (!match) continue; // Try next server

          const val = (tag, key) => {
            if (!match) return undefined;
            if (match[key] !== undefined) return match[key];
            if (match[tag]?.Value?.[0]?.Alphabetic) return match[tag].Value[0].Alphabetic;
            if (match[tag]?.Value?.[0]) return match[tag].Value[0];
            return undefined;
          };

          // Helper to check for strong image modalities
          const isImageModality = (m) => {
            if (!m) return false;
            const weak = ['SR', 'PR', 'KO', 'OT', 'DOC', 'TXT', 'SEG', 'REG'];
            return !weak.includes(m.toUpperCase());
          };

          let pName = cleanName(val("00100010", "PatientName"));
          let pID = val("00100020", "PatientID");
          let pSex = val("00100040", "PatientSex");
          let pAge = val("00101010", "PatientAge");
          let accession = val("00080050", "AccessionNumber");
          let studyDate = val("00080020", "StudyDate");
          let refPhys = cleanName(val("00080090", "ReferringPhysicianName"));

          // Improved Modality Selection from Initial List
          let rawMods = (match && (match.ModalitiesInStudy || match["00080061"]?.Value));
          let modality = null;

          if (Array.isArray(rawMods)) {
            // Try to find a strong one in the list
            modality = rawMods.find(m => isImageModality(m)) || rawMods[0];
          } else if (rawMods) {
            modality = rawMods;
          } else {
            modality = val("00080060", "Modality");
          }

          let bodyPart = val("00180015", "BodyPartExamined");

          // Deep Scrape Fallback
          // Trigger if missing critical data OR if modality is "weak" (e.g. SR/PR)
          let deepMatch = null;
          if (!modality || !isImageModality(modality) || !bodyPart || !pSex || !pAge || !refPhys || !accession) {
            console.log(`🔍 Deep Scraping DICOM for ${studyUID} on server ${pacs.aetitle} (Modality: ${modality}, BodyPart: ${bodyPart})...`);
            deepMatch = await pacsService.getDeepMetadata(pacs, studyUID);
            if (deepMatch) {
              // Override if we have no modality OR if current is weak and new is strong
              if (deepMatch.modality) {
                if (!modality || (isImageModality(deepMatch.modality) && !isImageModality(modality))) {
                  modality = deepMatch.modality;
                }
              }
              if (!bodyPart) bodyPart = deepMatch.bodyPartExamined;
              if (!pName) pName = cleanName(deepMatch.patientName);
              if (!pID) pID = deepMatch.patientID;
              if (!pSex) pSex = deepMatch.patientSex;
              if (!pAge) pAge = deepMatch.patientAge;
              if (!refPhys) refPhys = cleanName(deepMatch.referringPhysician);
              if (!accession) accession = deepMatch.accessionNumber;
              if (!studyDate) studyDate = deepMatch.studyDate;
            }
          }

          pacsMeta = {
            patientName: pName,
            patientID: pID,
            modality: modality,
            accessionNumber: accession,
            studyDate: studyDate,
            patientSex: pSex,
            patientAge: pAge,
            referringPhysician: refPhys,
            bodyPart: bodyPart,
            debug: { server: pacs.aetitle, found: true, deep: !!deepMatch }
          };
          break; // Found it, stop looping servers
        } catch (innerE) {
          console.warn(`Fetch from PACS ${pacs.aetitle} failed:`, innerE.message);
        }
      }
    } catch (e) {
      console.warn("PACS servers query failed", e.message);
    }

    // 3. Merge: Local > PACS
    const final = {};
    const keys = ["patientName", "patientID", "modality", "accessionNumber", "studyDate", "patientSex", "patientAge", "referringPhysician", "bodyPart", "created_at", "debug"];

    keys.forEach(k => {
      if (localMeta[k] !== undefined && localMeta[k] !== null && localMeta[k] !== "") {
        final[k] = localMeta[k];
      } else {
        final[k] = pacsMeta[k] || "";
      }
    });

    // 4. Instant Caching
    if (Object.keys(pacsMeta).length > 0) {
      try {
        await pool.query(
          `INSERT INTO study_metadata 
           (study_instance_uid, patient_name, patient_id, modality, accession_number, study_date, patient_sex, patient_age, referring_physician, body_part)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (study_instance_uid) 
           DO UPDATE SET
             patient_name = COALESCE(NULLIF(study_metadata.patient_name, ''), EXCLUDED.patient_name),
             patient_id = COALESCE(NULLIF(study_metadata.patient_id, ''), EXCLUDED.patient_id),
             modality = COALESCE(NULLIF(study_metadata.modality, ''), EXCLUDED.modality),
             accession_number = COALESCE(NULLIF(study_metadata.accession_number, ''), EXCLUDED.accession_number),
             study_date = COALESCE(study_metadata.study_date, EXCLUDED.study_date),
             patient_sex = COALESCE(NULLIF(study_metadata.patient_sex, ''), EXCLUDED.patient_sex),
             patient_age = COALESCE(NULLIF(study_metadata.patient_age, ''), EXCLUDED.patient_age),
             referring_physician = COALESCE(NULLIF(study_metadata.referring_physician, ''), EXCLUDED.referring_physician),
             body_part = COALESCE(NULLIF(study_metadata.body_part, ''), EXCLUDED.body_part)
          `,
          [studyUID, final.patientName, final.patientID, final.modality, final.accessionNumber, final.studyDate || null, final.patientSex, final.patientAge, final.referringPhysician, final.bodyPart]
        );
      } catch (cacheErr) {
        console.warn("Instant caching failed", cacheErr.message);
      }
    }

    // Date post-processing
    if (!final.studyDate && localMeta.created_at) {
      const d = new Date(localMeta.created_at);
      if (!isNaN(d.getTime())) {
        final.studyDate = d.toISOString().slice(0, 10).replace(/-/g, '');
      }
    }
    if (final.studyDate && typeof final.studyDate === 'string') {
      final.studyDate = final.studyDate.replace(/-/g, '').slice(0, 8);
    }

    res.set("Cache-Control", "no-store");
    res.json({ success: true, data: final });

  } catch (err) {
    console.error("getStudyMeta error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /api/studies/:studyUID/dicom-tags
 * Specific endpoint for deep scraping tags for the report header
 */
exports.getDicomTags = async (req, res) => {
  const { studyUID } = req.params;
  try {
    const pacsServers = await pool.query(`SELECT * FROM pacs_servers WHERE is_active = true ORDER BY id`);
    let tags = null;

    for (const pacs of pacsServers.rows) {
      try {
        console.log(`🔍 Deep Scraping Tags for ${studyUID} on ${pacs.aetitle}...`);
        const result = await pacsService.getDeepMetadata(pacs, studyUID);
        if (result && Object.keys(result).length > 0) {
          tags = result;
          break;
        }
      } catch (e) {
        console.warn(`Deep scrape failed on ${pacs.aetitle}`, e.message);
      }
    }

    // 2. Fallback/Merge with local metadata (VERY IMPORTANT for Modality/Accession/BodyPart)
    const local = await pool.query('SELECT * FROM study_metadata WHERE study_instance_uid = $1', [studyUID]);
    const localRow = local.rows[0] || {};

    if (tags || localRow.study_instance_uid) {
      // Map and prioritize local data if it exists
      const merged = { ...tags };
      if (localRow.modality && localRow.modality !== "") merged.modality = localRow.modality;
      if (localRow.patient_name) merged.patientName = localRow.patient_name;
      if (localRow.patient_id) merged.patientID = localRow.patient_id;
      if (localRow.accession_number) merged.accessionNumber = localRow.accession_number;
      if (localRow.study_date) merged.studyDate = localRow.study_date;
      if (localRow.patient_sex) merged.patientSex = localRow.patient_sex;
      if (localRow.patient_age) merged.patientAge = localRow.patient_age;
      if (localRow.referring_physician) merged.referringPhysician = localRow.referring_physician;
      if (localRow.body_part) merged.bodyPartExamined = localRow.body_part;

      const mappedTags = {
        patientName: cleanName(merged.patientName),
        patientID: merged.patientID,
        modality: merged.modality || "—",
        accessionNumber: merged.accessionNumber,
        studyDate: merged.studyDate,
        patientSex: merged.patientSex,
        patientAge: merged.patientAge,
        referringPhysician: cleanName(merged.referringPhysician),
        bodyPart: merged.bodyPartExamined
      };
      return res.json({ success: true, tags: mappedTags });
    }

    res.status(404).json({ success: false, message: "Tags not found" });
  } catch (err) {
    console.error("getDicomTags error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /api/studies/:studyUID/meta
 * Update/Override Study Metadata manually
 */
exports.updateStudyMeta = async (req, res) => {
  const { studyUID } = req.params;
  const {
    patientName,
    patientID,
    modality,
    accessionNumber,
    studyDate,
    patientSex,
    patientAge,
    referringPhysician,
    bodyPart
  } = req.body;

  try {
    // Upsert into study_metadata
    // We clean the name before saving
    const cleanedName = cleanName(patientName);
    const cleanedRefPhys = cleanName(referringPhysician);

    // Fix empty date string crashing Postgres
    const validStudyDate = studyDate ? studyDate : null;

    await pool.query(
      `INSERT INTO study_metadata 
       (study_instance_uid, patient_name, patient_id, modality, accession_number, study_date, patient_sex, patient_age, referring_physician, body_part)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (study_instance_uid) 
       DO UPDATE SET
         patient_name = EXCLUDED.patient_name,
         patient_id = EXCLUDED.patient_id,
         modality = EXCLUDED.modality,
         accession_number = EXCLUDED.accession_number,
         study_date = EXCLUDED.study_date,
         patient_sex = EXCLUDED.patient_sex,
         patient_age = EXCLUDED.patient_age,
         referring_physician = EXCLUDED.referring_physician,
         body_part = EXCLUDED.body_part
      `,
      [studyUID, cleanedName, patientID, modality, accessionNumber, validStudyDate, patientSex, patientAge, cleanedRefPhys, bodyPart]
    );

    res.json({ success: true, message: "Metadata updated" });
  } catch (err) {
    console.error("updateStudyMeta error:", err);
    res.status(500).json({ success: false, message: "Failed to update metadata" });
  }
};

/**
 * GET /api/studies
 * Fetch recent studies from the default PACS server
 */
exports.getAllStudies = async (req, res) => {
  try {
    // 1. Get the first active PACS server
    const pacsRes = await pool.query(`SELECT * FROM pacs_servers WHERE is_active = true ORDER BY id LIMIT 1`);
    const pacs = pacsRes.rows[0];

    if (!pacs) {
      return res.status(404).json({ success: false, message: "No active PACS server configured" });
    }

    // 2. Fetch studies (default to last 30 days if no date range provided)
    const { startDate, endDate } = req.query;

    // Simple date calculation if not provided (YYYYMMDD)
    let studyDateQuery = "";
    if (startDate && endDate) {
      const s = startDate.replace(/-/g, '');
      const e = endDate.replace(/-/g, '');
      studyDateQuery = `${s}-${e}`;
    } else {
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const format = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
      studyDateQuery = `${format(thirtyDaysAgo)}-${format(now)}`;
    }

    const studies = await pacsService.qidoStudies(pacs, { StudyDate: studyDateQuery });

    // 3. FETCH LOCAL CACHE: Get all metadata we've already scraped for these studies
    const uids = (studies || []).map(s => s.StudyInstanceUID || s["0020000D"]?.Value?.[0]).filter(Boolean);
    let localCacheMap = {};
    if (uids.length > 0) {
      const cacheRes = await pool.query(
        `SELECT study_instance_uid, modality, body_part, patient_name, patient_id, 
                accession_number, study_date, patient_sex, patient_age, referring_physician
         FROM study_metadata 
         WHERE study_instance_uid = ANY($1)`,
        [uids]
      );
      cacheRes.rows.forEach(r => {
        localCacheMap[r.study_instance_uid] = r;
      });
    }

    // 4. Clean and Merge
    const cleanedStudies = (studies || []).map(s => {
      const uid = s.StudyInstanceUID || s["0020000D"]?.Value?.[0];
      const cached = localCacheMap[uid] || {};

      return {
        ...s,
        // Override with cached values if PACS is missing them
        PatientName: cached.patient_name || cleanName(s.PatientName || (s["00100010"]?.Value?.[0]?.Alphabetic) || (s["00100010"]?.Value?.[0])),
        PatientID: cached.patient_id || s.PatientID || s["00100020"]?.Value?.[0],
        Modality: cached.modality || s.Modality || (Array.isArray(s.ModalitiesInStudy) && s.ModalitiesInStudy[0]) || s["00080060"]?.Value?.[0],
        BodyPartExamined: cached.body_part || s.BodyPartExamined || s["00180015"]?.Value?.[0],
        AccessionNumber: cached.accession_number || s.AccessionNumber || s["00080050"]?.Value?.[0],
        StudyDate: cached.study_date || s.StudyDate || s["00080020"]?.Value?.[0],
        PatientSex: cached.patient_sex || s.PatientSex || s["00100040"]?.Value?.[0],
        PatientAge: cached.patient_age || s.PatientAge || s["00101010"]?.Value?.[0],
        ReferringPhysicianName: cached.referring_physician || s.ReferringPhysicianName || s["00080090"]?.Value?.[0],
      };
    });

    res.json({ success: true, data: cleanedStudies });
  } catch (err) {
    console.error("getAllStudies error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch studies from PACS" });
  }
};

/**
 * GET /api/studies/patient/:patientID/priors
 * Fetch all previous studies for a specific patient
 */
exports.getPatientPriors = async (req, res) => {
  const { patientID } = req.params;
  const { currentStudyUID } = req.query;

  try {
    // 1. Get first active PACS server
    const pacsRes = await pool.query(`SELECT * FROM pacs_servers WHERE is_active = true ORDER BY id LIMIT 1`);
    const pacs = pacsRes.rows[0];

    if (!pacs) {
      return res.status(404).json({ success: false, message: "No active PACS server" });
    }

    // 2. Fetch all studies for this patient from PACS
    // We don't use a date limit here to get the full history
    const studies = await pacsService.qidoStudies(pacs, {
      PatientID: patientID,
      StudyDate: "" // Explicitly empty to override any default date filtering
    });

    if (!studies || !Array.isArray(studies)) {
      return res.json({ success: true, data: [] });
    }

    // 3. Filter out the current study and sanitize
    const uids = [];
    const sanitized = studies
      .map(s => {
        const uid = s.StudyInstanceUID || s["0020000D"]?.Value?.[0];
        if (!uid || uid === currentStudyUID) return null;
        uids.push(uid);
        return {
          studyUID: uid,
          accession: s.AccessionNumber || s["00080050"]?.Value?.[0] || "—",
          modality: s.Modality || (Array.isArray(s.ModalitiesInStudy) ? s.ModalitiesInStudy[0] : s["00080060"]?.Value?.[0]) || "—",
          description: s.StudyDescription || s["00081030"]?.Value?.[0] || "No Description",
          date: s.StudyDate || s["00080020"]?.Value?.[0] || ""
        };
      })
      .filter(Boolean);

    // 4. Cross-reference with Reports database
    let reportMap = {};
    if (uids.length > 0) {
      const reports = await pool.query(
        `SELECT study_instance_uid, status FROM pacs_reports WHERE study_instance_uid = ANY($1)`,
        [uids]
      );
      reports.rows.forEach(r => {
        reportMap[r.study_instance_uid] = r.status;
      });
    }

    // 5. Final Merge
    const finalData = sanitized.map(s => ({
      ...s,
      reportStatus: reportMap[s.studyUID] || null
    }));

    // Sort by date (newest first)
    finalData.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    res.json({ success: true, data: finalData });

  } catch (err) {
    console.error("getPatientPriors error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch priors" });
  }
};


