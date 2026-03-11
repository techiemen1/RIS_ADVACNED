const { pool } = require("../config/postgres");

/* ================= LIST (SETTINGS) ================= */
exports.listTemplates = async (req, res) => {
  try {
    const r = await pool.query(
      `
      SELECT id, name, modality, body_part, content, created_at, updated_at
      FROM report_templates
      WHERE is_active = true
      ORDER BY modality NULLS LAST, body_part NULLS LAST, name
      `
    );
    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("listTemplates", err);
    res.status(500).json({ success: false });
  }
};

/* ================= CREATE ================= */
exports.createTemplate = async (req, res) => {
  try {
    const { name, modality, body_part, content, gender } = req.body;

    if (!name || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Name and content required" });
    }

    const r = await pool.query(
      `
      INSERT INTO report_templates
        (name, modality, body_part, content, gender)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [name, modality || null, body_part || null, content, gender || null]
    );

    res.status(201).json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("createTemplate", err);
    res.status(500).json({ success: false });
  }
};

/* ================= UPDATE ================= */
exports.updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, modality, body_part, content, gender } = req.body;

    const r = await pool.query(
      `
      UPDATE report_templates
      SET
        name = $1,
        modality = $2,
        body_part = $3,
        content = $4,
        gender = $5,
        updated_at = now()
      WHERE id = $6
      RETURNING *
      `,
      [name, modality || null, body_part || null, content, gender || null, id]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ success: false });
    }

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("updateTemplate", err);
    res.status(500).json({ success: false });
  }
};

/* ================= SOFT DELETE ================= */
exports.disableTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `
      UPDATE report_templates
      SET is_active = false
      WHERE id = $1
      `,
      [id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("disableTemplate", err);
    res.status(500).json({ success: false });
  }
};

/* ================= MATCH (EDITOR) ================= */
exports.matchTemplates = async (req, res) => {
  try {
    const { modality, bodyPart, gender } = req.query;
    console.log(`🔍 [Template Match] Params: Modality="${modality}", BodyPart="${bodyPart}", Gender="${gender}"`);

    // Advanced Ranking:
    // 1. Exact Match (Modality + BodyPart + Gender)
    // 2. Modality + BodyPart (Gender NULL)
    // 3. Modality Matches (BodyPart NULL, Gender NULL/Match)
    const cleanP = (v) => {
      if (!v) return null;
      const s = String(v).trim();
      if (s === '-' || s === '—' || s.toLowerCase() === 'pending' || s === '') return null;
      return s;
    };

    const m = cleanP(modality);
    const bp = cleanP(bodyPart);
    const g = cleanP(gender);

    const r = await pool.query(
      `
      SELECT id, name, content, modality, body_part, gender
      FROM report_templates
      WHERE is_active = true
        AND ($1::text IS NULL OR modality = $1)
        AND ($2::text IS NULL OR body_part ILIKE $2)
        AND (
             ($3::text IS NULL) OR               -- No gender specified
             (gender IS NULL) OR                 -- Template applies to all
             (gender = $3)                       -- Exact match
            )
      ORDER BY 
        CASE WHEN body_part IS NOT NULL AND gender IS NOT NULL THEN 1
             WHEN body_part IS NOT NULL THEN 2
             WHEN gender IS NOT NULL THEN 3
             ELSE 4
        END,
        name
      `,
      [m, bp, g]
    );

    res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error("matchTemplates", err);
    res.status(500).json({ success: false });
  }
};

