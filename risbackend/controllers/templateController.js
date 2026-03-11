const { pool } = require("../config/postgres");

/* LIST */
exports.listTemplates = async (req, res) => {
  const r = await pool.query(
    `SELECT * FROM report_templates
     WHERE is_active=true
     ORDER BY name`
  );
  res.json({ success: true, data: r.rows });
};

/* CREATE (NO created_by UUID PROBLEM) */
exports.createTemplate = async (req, res) => {
  const { name, modality, body_part, study_description, content } = req.body;

  try {
    const r = await pool.query(
      `
      INSERT INTO report_templates
      (name, modality, body_part, study_description, content)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        name,
        modality || null,
        body_part || null,
        study_description || null,
        content,
      ]
    );

    res.json({ success: true, data: r.rows[0] });
  } catch (err) {
    console.error("createTemplate:", err);
    res.status(500).json({ success: false });
  }
};

/* UPDATE */
exports.updateTemplate = async (req, res) => {
  const { id } = req.params;
  const t = req.body;

  await pool.query(
    `
    UPDATE report_templates
    SET name=$1, modality=$2, body_part=$3,
        study_description=$4, content=$5,
        updated_at=now()
    WHERE id=$6
    `,
    [t.name, t.modality, t.body_part, t.study_description, t.content, id]
  );

  res.json({ success: true });
};

/* DELETE */
exports.deleteTemplate = async (req, res) => {
  await pool.query(`DELETE FROM report_templates WHERE id=$1`, [req.params.id]);
  res.json({ success: true });
};

/* MATCH */
exports.matchTemplates = async (req, res) => {
  const { modality } = req.query;

  const r = await pool.query(
    `
    SELECT * FROM report_templates
    WHERE is_active=true
      AND ($1::text IS NULL OR modality=$1)
    ORDER BY name
    `,
    [modality || null]
  );

  res.json({ success: true, data: r.rows });
};

