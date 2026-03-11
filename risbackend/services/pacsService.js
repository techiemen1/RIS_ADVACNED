// services/pacsService.js
const axios = require('axios');
const { pool } = require('../config/postgres');

function normalizeBase(b) {
  if (!b) return null;
  if (/^https?:\/\//i.test(b)) return b.replace(/\/+$/g, '');
  return `http://${b.replace(/\/+$/g, '')}`;
}

function buildAuthHeader(pacs) {
  if (!pacs) return {};
  if (pacs.username && pacs.password) {
    const token = Buffer.from(`${pacs.username}:${pacs.password}`).toString('base64');
    return { Authorization: `Basic ${token}` };
  }
  return {};
}

async function qidoStudies(pacs, opts = {}) {
  if (!pacs) throw new Error('Missing PACS config');
  const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
  const base = normalizeBase(baseCandidate);
  if (!base) throw new Error('Invalid PACS base URL');

  const candidates = [
    `${base}/qido/studies`,
    `${base}/dcm4chee-arc/rs/studies`,
    `${base}/dicom-web/studies`,
    `${base}/studies`,
    `${base}/dicom-web/qido/studies`
  ];

  const headers = buildAuthHeader(pacs);
  const timeout = opts.timeout || 15000;
  let lastErr = null;

  const queryParams = new URLSearchParams();

  // Date Filtering: Skip default if specific identifiers are provided
  const hasSpecificFilter = opts.StudyInstanceUID || opts.AccessionNumber || opts.PatientID;

  if (opts.StudyDate) {
    queryParams.append('StudyDate', opts.StudyDate);
  } else if (opts.startDate || opts.endDate) {
    const s = opts.startDate ? opts.startDate.replace(/-/g, '') : '';
    const e = opts.endDate ? opts.endDate.replace(/-/g, '') : '';
    queryParams.append('StudyDate', `${s}-${e}`);
  } else if (!hasSpecificFilter) {
    // DEFAULT: Last 7 days if no filter provided AND no specific ID provided
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 7);
    const formatDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
    queryParams.append('StudyDate', `${formatDate(past)}-${formatDate(today)}`);
  }

  if (opts.StudyInstanceUID) queryParams.append('StudyInstanceUID', opts.StudyInstanceUID);
  if (opts.AccessionNumber) queryParams.append('AccessionNumber', opts.AccessionNumber);
  if (opts.PatientID) queryParams.append('PatientID', opts.PatientID);
  if (opts.limit) queryParams.append('limit', opts.limit);

  // Ensure we get critical fields
  queryParams.append('includefield', '00081030'); // StudyDescription
  queryParams.append('includefield', '00080061'); // ModalitiesInStudy
  queryParams.append('includefield', '00180015'); // BodyPart
  queryParams.append('includefield', '00080020'); // StudyDate
  queryParams.append('includefield', '00100010'); // PatientName
  queryParams.append('includefield', '00100020'); // PatientID
  queryParams.append('includefield', '00080050'); // AccessionNumber
  queryParams.append('includefield', '00100040'); // PatientSex
  queryParams.append('includefield', '00101010'); // PatientAge
  queryParams.append('includefield', '00080090'); // ReferringPhysicianName

  const queryString = queryParams.toString();

  for (const urlBase of candidates) {
    try {
      const fullUrl = queryString ? `${urlBase}?${queryString}` : urlBase;
      console.log(`📡 Fetching PACS: ${fullUrl}`);

      const res = await axios.get(fullUrl, { headers, timeout });
      if (res.status === 200 || res.status === 204) {
        return Array.isArray(res.data) ? res.data : (res.data?.data ?? res.data);
      }
    } catch (err) {
      lastErr = err;
      if (err.response && err.response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
    }
  }

  const e = new Error('NOT_FOUND');
  e.detail = lastErr && (lastErr.message || (lastErr.response && lastErr.response.statusText));
  throw e;
}

/**
 * Fetch series level DICOM tags to find Modality/BodyPart if study level fails
 */
async function qidoSeries(pacs, studyUID) {
  if (!pacs) throw new Error('Missing PACS config');
  const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
  const base = normalizeBase(baseCandidate);

  // Series level QIDO
  const url = `${base}/studies/${studyUID}/series?includefield=00080060&includefield=00180015`;
  const headers = buildAuthHeader(pacs);

  try {
    const res = await axios.get(url, { headers, timeout: 5000 });
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.warn(`Series fetch failed for ${studyUID}`, err.message);
    return [];
  }
}

/**
 * Advanced logic to scrape deep tags from instance level if needed
 * Fetches almost all relevant patient/study tags for a complete header
 */
async function getDeepMetadata(pacs, studyUID) {
  try {
    const baseCandidate = pacs.base_url || `${pacs.host}:${pacs.port}`;
    const base = normalizeBase(baseCandidate);
    const headers = buildAuthHeader(pacs);
    const finalData = {};

    // --- CONFIG: Critical Tags Mapping ---
    const TAG_MAP = {
      patientName: '00100010',
      patientID: '00100020',
      accessionNumber: '00080050',
      studyDate: '00080020',
      studyDescription: '00081030',
      referringPhysician: '00080090',
      patientSex: '00100040',
      patientAge: '00101010',
      modality: '00080060',
      bodyPartExamined: '00180015',
      institutionName: '00080080'
    };

    // --- HELPER: Robust DICOM Value Parser ---
    const getValue = (obj, tag) => {
      if (!obj || !obj[tag]) return null;
      const el = obj[tag];
      if (el.Value && el.Value.length > 0) {
        const val = el.Value[0];
        if (typeof val === 'object' && val !== null) {
          if (val.Alphabetic) return val.Alphabetic;
          if (val.Ideographic) return val.Ideographic;
          if (val.Phonetic) return val.Phonetic;
          return val;
        }
        return val;
      }
      if (typeof el === 'string' || typeof el === 'number') return el;
      return null;
    };

    // Helper: Fill any missing tags from a source object
    const fillMissing = (source) => {
      Object.entries(TAG_MAP).forEach(([key, tag]) => {
        if (!finalData[key]) {
          const val = getValue(source, tag);
          if (val) finalData[key] = val;
        }
      });
    };

    // Helper: Is this a "real" image modality?
    const isImageModality = (m) => {
      if (!m) return false;
      const weak = ['SR', 'PR', 'KO', 'OT', 'DOC', 'TXT', 'SEG', 'REG'];
      return !weak.includes(m.toUpperCase());
    };

    // Helper: Parse ModalitiesInStudy which can be a string or array
    const parseModalitiesInStudy = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') return val.split(/[\\\/]/);
      return [];
    };

    console.log(`📡 [DeepMeta] Starting scrape for ${studyUID}`);

    // ============================================
    // LAYER 1: Study Level Tags (Fastest)
    // ============================================
    try {
      const studyUrl = `${base}/studies`;
      const res = await axios.get(studyUrl, {
        headers,
        params: {
          StudyInstanceUID: studyUID,
          includefield: Object.values(TAG_MAP).concat(['00080061']) // All tags + ModalitiesInStudy
        },
        timeout: 5000
      });
      const study = Array.isArray(res.data) ? res.data[0] : (res.data?.data?.[0] || null);

      if (study) {
        // 1. Fill everything we can find directly
        fillMissing(study);

        // 2. Special Logic for Modality (Preferred Strong)
        const modsInStudyRaw = getValue(study, '00080061');
        const modsList = parseModalitiesInStudy(modsInStudyRaw);

        const strongMod = modsList.find(m => isImageModality(m));
        if (strongMod) {
          finalData.modality = strongMod; // Override with strong
        } else if (modsList.length > 0 && !finalData.modality) {
          finalData.modality = modsList[0];
        }
      }
    } catch (err) {
      console.warn("Layer 1 Study Level failed:", err.message);
    }

    // ============================================
    // LAYER 2: Series Scan (If key fields missing or weak modality)
    // ============================================
    // Check if we are missing ANY critical keys (except maybe Institution which varies)
    const missingCritical = !finalData.patientID || !finalData.accessionNumber || !finalData.bodyPartExamined;
    const weakModality = finalData.modality && !isImageModality(finalData.modality);

    if (missingCritical || !finalData.modality || weakModality) {
      console.log("🔄 [DeepMeta] Layer 1 incomplete. Trying Layer 2 (Series Scan)...");
      try {
        const seriesUrl = `${base}/studies/${studyUID}/series`;
        const seriesRes = await axios.get(seriesUrl, {
          headers,
          // Request all tags that might be at series level (Modality, BodyPart, maybe others depending on PACS)
          params: { includefield: ['00080060', '00180015', '00080050', '0020000E'] },
          timeout: 6000
        });
        const seriesList = Array.isArray(seriesRes.data) ? seriesRes.data : [];

        for (const ser of seriesList) {
          // Opportunistically fill missing BodyPart or Accession if present on Series
          fillMissing(ser);

          // Modality Hunt: Look for Strong
          const m = getValue(ser, '00080060');
          if (m && isImageModality(m)) {
            finalData.modality = m;
            console.log(`✅ [DeepMeta] Layer 2 found strong modality: ${m}`);
            break;
          }
        }

        // Fallback for Modality if still empty
        if (!finalData.modality && seriesList.length > 0) {
          finalData.modality = getValue(seriesList[0], '00080060');
        }
      } catch (err) {
        console.warn("Layer 2 Series Scan failed:", err.message);
      }
    }

    // ============================================
    // LAYER 3: Instance/Metadata (Heavy Dump - Gold Standard for missing tags)
    // ============================================
    // Re-evaluate missing keys
    const stillMissingCritical = !finalData.patientID || !finalData.accessionNumber || !finalData.bodyPartExamined || !finalData.referringPhysician;
    const stillWeakModality = finalData.modality && !isImageModality(finalData.modality);

    if (stillMissingCritical || !finalData.modality || stillWeakModality) {
      try {
        console.log("🔄 [DeepMeta] Still missing data. Trying Layer 3 (Instance Dump)...");
        const qidoUrl = `${base}/studies/${studyUID}/instances`;
        const res = await axios.get(qidoUrl, {
          headers,
          params: {
            limit: 1,
            includefield: Object.values(TAG_MAP) // Request EVERYTHING
          },
          timeout: 5000
        });

        const instance = Array.isArray(res.data) ? res.data[0] : null;
        if (instance) {
          fillMissing(instance);

          // Modality specific override: If we have a weak one, and instance gives a strong one, take it.
          // OR if instance gives a strong one and we have nothing.
          // But wait, if instance is just one, it might be the SR instance.
          // So we only override if what we have is WRONG/MISSING.
          // Actually, usually 'instances' endpoint returns the *first* instance, which is random.
          // But if we specifically want Modality, we trust our Layer 1/2 more for the *Study* modality unless they failed.

          const m = getValue(instance, '00080060');
          if (m && isImageModality(m) && (!finalData.modality || !isImageModality(finalData.modality))) {
            finalData.modality = m;
          }
        }
      } catch (err) {
        console.warn("Layer 3 Instance Dump failed:", err.message);
      }
    }

    // ============================================
    // LAYER 4: Study Description Heuristic (Last Resort)
    // ============================================
    if (!finalData.modality || !isImageModality(finalData.modality)) {
      try {
        const d = String(finalData.studyDescription || "").toUpperCase();
        if (d) {
          console.log(`🔍 [DeepMeta] Layer 4 Heuristic checking desc: "${d}"`);

          let inferred = null;
          if (/\bCT\b/.test(d)) inferred = 'CT';
          else if (/\bMR\b/.test(d) || /\bMRI\b/.test(d)) inferred = 'MR';
          else if (/\bXR\b/.test(d) || /\bX-RAY\b/.test(d) || /\bXRAY\b/.test(d)) inferred = 'XR';
          else if (/\bUS\b/.test(d) || /\bUSG\b/.test(d) || /\bULTRASOUND\b/.test(d)) inferred = 'US';
          else if (/\bCR\b/.test(d)) inferred = 'CR';
          else if (/\bDX\b/.test(d)) inferred = 'DX';
          else if (/\bMG\b/.test(d) || /\bMAMMO\b/.test(d)) inferred = 'MG';
          else if (/\bPT\b/.test(d) || /\bPET\b/.test(d)) inferred = 'PT';
          else if (/\bNM\b/.test(d)) inferred = 'NM';

          if (inferred) {
            finalData.modality = inferred;
            console.log(`✅ [DeepMeta] Layer 4 Heuristic assigned: ${inferred}`);
          }
        }
      } catch (err) {
        console.warn("Layer 4 Heuristic failed:", err.message);
      }
    }

    return finalData;

  } catch (err) {
    console.error("getDeepMetadata (Global) failed", err.message);
    return {};
  }
}


async function updateLastConnected(pacsId) {
  if (!pacsId) return;
  try {
    await pool.query('UPDATE pacs_servers SET last_connected = NOW(), updated_at = NOW() WHERE id=$1', [pacsId]);
  } catch (err) {
    console.warn('updateLastConnected failed', err.message || err);
  }
}

const { Client, requests } = require('dcmjs-dimse');
const { CEchoRequest } = requests;

async function testConnection(pacs) {
  // 1. DIMSE C-ECHO
  if (pacs.protocol === 'DIMSE' || pacs.type === 'DIMSE') {
    return new Promise((resolve) => {
      try {
        const client = new Client();
        const req = new CEchoRequest();

        // Use RIS_AET from env or default
        const localAet = process.env.RIS_AE_TITLE || 'RIS_MWL';

        let status = 'Failed';
        let details = '';

        client.addRequest(req);

        client.on('networkError', (e) => {
          status = 'Error';
          details = e.message;
          resolve({ ok: false, message: 'Network Error', detail: e.message });
        });

        client.on('response', (response) => {
          if (response.getStatus() === 0) { // Success
            status = 'Success';
            resolve({ ok: true, message: 'DICOM Echo Successful (Active)', detail: 'C-ECHO Response: 0 (Success)' });
          } else {
            resolve({ ok: false, message: 'Association Rejected or Failed', detail: `Status: ${response.getStatus()}` });
          }
        });

        // Timeout fallback
        setTimeout(() => {
          if (status !== 'Success') resolve({ ok: false, message: 'Timeout', detail: 'No response from PACS' });
        }, 8000);

        client.send(pacs.host, pacs.port, pacs.aetitle, localAet);
      } catch (err) {
        resolve({ ok: false, message: 'Client Error', detail: err.message });
      }
    });
  }

  // 2. DICOMWEB QIDO
  try {
    const studies = await qidoStudies(pacs, { timeout: 8000, limit: 1 });
    await updateLastConnected(pacs.id);
    return { ok: true, message: 'Connected (QIDO-RS)', sampleCount: Array.isArray(studies) ? studies.length : 0 };
  } catch (err) {
    if (err.message === 'UNAUTHORIZED') {
      return { ok: false, message: 'Unauthorized', detail: 'Check username/password' };
    }
    if (err.message === 'NOT_FOUND') {
      return { ok: false, message: 'Endpoint Not Found', detail: 'Check URL paths' };
    }
    return { ok: false, message: 'Connection failed', detail: err.message || null };
  }
}

async function normalizeStudyForDB(s) {
  const uid =
    s.StudyInstanceUID ||
    s["0020000D"]?.Value?.[0];

  if (!uid) return null;

  return {
    study_instance_uid: uid,
    patient_name:
      (s.PatientName?.Alphabetic ||
        s["00100010"]?.Value?.[0]?.Alphabetic ||
        "")?.replace(/\^/g, ' ').trim() ||
      null,
    patient_id:
      s.PatientID ||
      s["00100020"]?.Value?.[0] ||
      null,
    modality:
      s.ModalitiesInStudy?.[0] ||
      s["00080060"]?.Value?.[0] ||
      null,
    accession_number:
      s.AccessionNumber ||
      s["00080050"]?.Value?.[0] ||
      null,
    study_date:
      s.StudyDate ||
      s["00080020"]?.Value?.[0] ||
      null,
    referring_physician:
      s.ReferringPhysicianName?.Alphabetic ||
      s["00080090"]?.Value?.[0]?.Alphabetic ||
      s["00080090"]?.Value?.[0] ||
      null,
    patient_sex:
      s.PatientSex ||
      s["00100040"]?.Value?.[0] ||
      null,
    patient_age:
      s.PatientAge ||
      s["00101010"]?.Value?.[0] ||
      null,
  };
}

async function syncPacsStudies(pacs) {
  const studies = await qidoStudies(pacs);
  const rows = [];

  for (const s of studies) {
    const n = await normalizeStudyForDB(s);
    if (n) rows.push(n);
  }

  return rows;
}

const { CMoveRequest } = requests;

async function retrieveStudy(studyUID) {
  try {
    const q = 'SELECT * FROM pacs_servers WHERE is_active = TRUE LIMIT 1';
    const r = await pool.query(q);
    if (r.rowCount === 0) return false;

    const pacs = r.rows[0];
    const localAet = process.env.RIS_AET || 'RIS_MWL';
    const destinationAet = process.env.RIS_AE_TITLE || 'RIS_MWL'; // Where PACS should send images

    // 1. DIMSE C-MOVE Implementation
    if (pacs.protocol === 'DIMSE' || pacs.type === 'DIMSE') {
      return new Promise((resolve) => {
        const client = new Client();
        const req = new CMoveRequest(destinationAet, {
          level: 'STUDY',
          StudyInstanceUID: studyUID
        });

        client.addRequest(req);
        client.on('networkError', (e) => {
          console.error(`❌ [Prefetch] C-MOVE Network Error for ${studyUID}:`, e.message);
          resolve(false);
        });

        client.on('response', (response) => {
          if (response.getStatus() === 0) {
            console.log(`✅ [Prefetch] C-MOVE Success trigger for ${studyUID}`);
            resolve(true);
          } else if (response.getStatus() === 0xFF00) {
            // Pending: normal during move
          } else {
            console.warn(`⚠️ [Prefetch] C-MOVE warning status: 0x${response.getStatus().toString(16)}`);
            resolve(false);
          }
        });

        client.send(pacs.host, pacs.port, pacs.aetitle, localAet);
      });
    }

    // 2. DICOMweb Retrieve Implementation
    const base = normalizeBase(pacs.base_url || `${pacs.host}:${pacs.port}`);
    const headers = buildAuthHeader(pacs);

    // Trigger DICOMweb pre-indexing or bulk retrieve if supported by PACS
    // Standard WADO-RS retrieve usually returns bytes, but some PACS have /retrieve extension
    // Here we'll fire a HEAD or GET to study level metadata to "warm" their internal cache
    try {
      await axios.get(`${base}/studies/${studyUID}`, { headers, timeout: 10000 });
      console.log(`✅ [Prefetch] DICOMweb warmed for ${studyUID}`);
      return true;
    } catch (err) {
      console.error(`❌ [Prefetch] DICOMweb Warm failed for ${studyUID}:`, err.message);
      return false;
    }

  } catch (err) {
    console.warn(`[PACS] Retrieval logic failed for ${studyUID}`, err.message);
    return false;
  }
}

module.exports = {
  qidoStudies,
  qidoSeries,
  getDeepMetadata,
  testConnection,
  buildAuthHeader,
  updateLastConnected,
  syncPacsStudies,
  retrieveStudy
};
