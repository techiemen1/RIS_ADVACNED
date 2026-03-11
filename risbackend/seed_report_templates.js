/**
 * Seed Script — Insert Demo Radiology Templates
 * Run:
 *   node seed_report_templates.js
 */

const { pool } = require("./config/postgres");

const templates = [
  {
    name: "XR Chest - Routine",
    modality: "CR",
    content:
      "<h3>Findings</h3><p>Cardiomediastinal silhouette within normal limits. Lungs clear.</p><h3>Impression</h3><ol><li>No acute cardiopulmonary disease.</li></ol>",
  },
  {
    name: "Chest X-Ray - Consolidation",
    modality: "CR",
    content:
      "<h3>History</h3><p>Fever, cough.</p><h3>Findings</h3><p>Patchy opacity RLL.</p><h3>Impression</h3><li>RLL consolidation.</li>",
  },
  {
    name: "CT Head - Non-contrast",
    modality: "CT",
    content:
      "<h3>Technique</h3><p>Non-contrast CT Head.</p><h3>Findings</h3><p>No hemorrhage, no mass effect.</p><h3>Impression</h3><li>No acute abnormality.</li>",
  },
  {
    name: "CT Abdomen/Pelvis",
    modality: "CT",
    content:
      "<h3>Technique</h3><p>Contrast CT AP.</p><h3>Findings</h3><p>No free fluid or free air.</p><h3>Impression</h3><li>No acute process.</li>",
  },
  {
    name: "US Abdomen - Complete",
    modality: "US",
    content:
      "<h3>Findings</h3><p>Liver normal. GB without stones.</p><h3>Impression</h3><li>No acute cholecystitis.</li>",
  },
  {
    name: "MRI Brain",
    modality: "MR",
    content:
      "<h3>Technique</h3><p>MRI brain w/wo contrast.</p><h3>Findings</h3><p>No abnormal enhancement.</p><h3>Impression</h3><li>No acute findings.</li>",
  },
  {
    name: "Spine XR - Cervical",
    modality: "CR",
    content:
      "<h3>Findings</h3><p>Alignment preserved.</p><h3>Impression</h3><li>No acute cervical fracture.</li>",
  },
  {
    name: "Echocardiogram Limited",
    modality: "US",
    content:
      "<h3>Findings</h3><p>Normal LV function.</p><h3>Impression</h3><li>Normal LV systolic function.</li>",
  },
  {
    name: "Doppler LE Venous",
    modality: "US",
    content:
      "<h3>Findings</h3><p>No DVT.</p><h3>Impression</h3><li>No evidence of DVT.</li>",
  },
  {
    name: "Mammography Screening",
    modality: "MG",
    content:
      "<h3>Findings</h3><p>No suspicious mass or calcifications.</p><h3>Impression</h3><li>Negative for malignancy.</li>",
  },
];

(async () => {
  try {
    console.log("🔄 Inserting report templates...");

    for (const t of templates) {
      const exists = await pool.query(
        "SELECT id FROM report_templates WHERE name=$1 LIMIT 1",
        [t.name]
      );

      if (exists.rows.length === 0) {
        await pool.query(
          "INSERT INTO report_templates (name, modality, content) VALUES ($1,$2,$3)",
          [t.name, t.modality, t.content]
        );
        console.log(`✅ Inserted: ${t.name}`);
      } else {
        console.log(`⏩ Skipped (already exists): ${t.name}`);
      }
    }

    console.log("🎉 Template seeding completed.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed Error:", err);
    process.exit(1);
  }
})();
