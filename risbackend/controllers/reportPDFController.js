// controllers/reportPDFController.js
// Refactored: all images loaded from filesystem as base64 data URIs.
// No internal HTTP calls — no JWT authentication required for PDF generation.

const pdfService = require("../services/pdfService");
const { pool } = require("../config/postgres");
const dayjs = require("dayjs");
const HospitalSettingsModel = require("../models/hospitalSettingsModel");
const path = require("path");
const fs = require("fs");

/**
 * UPLOADS_ROOT — absolute path to the uploads directory.
 * Key images are at: UPLOADS_ROOT/keyimages/<file_path>
 */
const UPLOADS_ROOT = path.resolve(__dirname, "../uploads");

/**
 * imageToDataUri(filePath)
 *
 * Reads an image from the filesystem and returns a base64 data URI.
 * Supports: jpg, jpeg, png, webp, gif, bmp, svg.
 * Returns null if the file does not exist or cannot be read.
 *
 * @param {string} filePath - Absolute path to the image file
 * @returns {string|null}   - data:image/png;base64,... or null
 */
function imageToDataUri(filePath) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;

    const ext = path.extname(filePath).toLowerCase().replace(".", "");
    const mimeMap = {
      jpg:  "image/jpeg",
      jpeg: "image/jpeg",
      png:  "image/png",
      webp: "image/webp",
      gif:  "image/gif",
      bmp:  "image/bmp",
      svg:  "image/svg+xml",
    };
    const mime = mimeMap[ext] || "image/jpeg";

    const buffer = fs.readFileSync(filePath);
    const base64 = buffer.toString("base64");
    return `data:${mime};base64,${base64}`;
  } catch (err) {
    console.warn(`[PDF] imageToDataUri failed for ${filePath}:`, err.message);
    return null;
  }
}

/**
 * resolveLogoDataUri(logoPath)
 *
 * Hospital logo may be stored as:
 *  - A filesystem path  (e.g. /home/.../uploads/logos/logo.png)
 *  - A relative path    (e.g. uploads/logos/logo.png)
 *  - An HTTP URL        (external — skip base64 conversion; PDFs using Puppeteer
 *                        can resolve external URLs — leave as-is)
 *  - A data URI already (pass through)
 *
 * @param {string} logoPath
 * @returns {string|null}
 */
function resolveLogoDataUri(logoPath) {
  if (!logoPath) return null;

  // Already a data URI — pass straight through
  if (logoPath.startsWith("data:")) return logoPath;

  // External URL — return as-is (Puppeteer/html-pdf can fetch it during render)
  if (/^https?:\/\//i.test(logoPath)) return logoPath;

  // Resolve relative paths against UPLOADS_ROOT
  const absPath = path.isAbsolute(logoPath)
    ? logoPath
    : path.resolve(UPLOADS_ROOT, logoPath);

  return imageToDataUri(absPath);
}

/**
 * resolveKeyImageDataUri(filePath)
 *
 * Key images are stored in: uploads/keyimages/<filePath>
 * The DB column `file_path` stores only the filename (e.g. "1711234567890-scan.jpg").
 *
 * @param {string} filePath - value from report_key_images.file_path
 * @returns {string|null}
 */
function resolveKeyImageDataUri(filePath) {
  if (!filePath) return null;

  // Prevent path traversal
  const safe = path.basename(filePath);
  const absPath = path.join(UPLOADS_ROOT, "keyimages", safe);
  return imageToDataUri(absPath);
}

/* =========================================================
   MAIN EXPORT
========================================================= */
exports.generatePdf = async (req, res) => {
  try {
    const studyId = req.params.studyId;

    // ── 1. Fetch Report Data ─────────────────────────────
    const qReport = `
      SELECT study_instance_uid, content, status, patient_name, patient_id,
             accession_number, modality, study_date, created_by, created_at, report_title
      FROM pacs_reports
      WHERE study_instance_uid = $1
      ORDER BY updated_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `;
    const rReport = await pool.query(qReport, [studyId]);
    if (rReport.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }
    const rep = rReport.rows[0];

    // ── 2. Fetch Hospital Settings ───────────────────────
    const settings = (await HospitalSettingsModel.get()) || {};

    // ── 3. Fetch Key Images ──────────────────────────────
    const qImages = `
      SELECT file_path
      FROM report_key_images
      WHERE study_instance_uid = $1
      ORDER BY created_at ASC
    `;
    const rImages = await pool.query(qImages, [studyId]);
    const keyImages = rImages.rows;

    // ── 4. Dates ─────────────────────────────────────────
    const studyDate  = rep.study_date  ? dayjs(rep.study_date).format("DD-MMM-YYYY") : "";
    const reportDate = rep.created_at  ? dayjs(rep.created_at).format("DD-MMM-YYYY HH:mm") : "";

    // ── 5. Logo → base64 data URI ────────────────────────
    // No HTTP call — read from filesystem or pass external URL through.
    const logoUri = resolveLogoDataUri(settings.logo_path);
    const logoHtml = logoUri
      ? `<img src="${logoUri}" style="height:60px; max-width:200px;" alt="Logo"/>`
      : `<div style="font-size:24px; font-weight:bold; color:#0056b3;">${settings.name || "RADIOLOGY CENTER"}</div>`;

    // ── 6. Key Images → base64 data URIs ────────────────
    // Converts each image file from disk to a data URI.
    // No HTTP calls, no JWT required.
    let userImagesHtml = "";
    if (keyImages.length > 0) {
      const imageBlocks = keyImages
        .map((img) => {
          const dataUri = resolveKeyImageDataUri(img.file_path);

          if (!dataUri) {
            // File missing or unreadable — show a placeholder box
            return `
              <div style="width:48%; margin-bottom:10px; border:1px solid #eee; padding:5px;
                          display:inline-flex; align-items:center; justify-content:center;
                          height:210px; background:#f5f5f5; color:#aaa; font-size:10pt;">
                [Image unavailable]
              </div>`;
          }

          return `
            <div style="width:48%; margin-bottom:10px; border:1px solid #eee; padding:5px; display:inline-block;">
              <img src="${dataUri}"
                   style="width:100%; height:200px; object-fit:contain;" />
            </div>`;
        })
        .join("");

      userImagesHtml = `
        <div class="page-break-before"></div>
        <div class="key-images-section">
          <h3 style="border-bottom:1px solid #ccc; padding-bottom:5px;">Key Images</h3>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            ${imageBlocks}
          </div>
        </div>`;
    }

    // ── 7. Sanitize Report Content ───────────────────────
    const safeContent = rep.content || "<p><em>No report content</em></p>";

    // ── 8. Build HTML ────────────────────────────────────
    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Report - ${rep.patient_name || ""}</title>
        <style>
          @page { margin: 20mm 15mm 25mm 15mm; }
          body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }

          /* Header */
          .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0056b3; padding-bottom: 15px; margin-bottom: 20px; }
          .hospital-info { text-align: right; }
          .hospital-name { font-size: 18pt; font-weight: bold; color: #0056b3; margin-bottom: 4px; }
          .hospital-details { font-size: 9pt; color: #555; }

          /* Patient Meta Grid */
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #eee; margin-bottom: 25px; font-size: 10pt; }
          .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
          .meta-label { font-weight: bold; color: #555; width: 100px; }
          .meta-value { font-weight: 600; color: #000; flex: 1; }

          /* Content */
          .report-title { text-align: center; text-transform: uppercase; font-size: 14pt; font-weight: bold; margin-bottom: 20px; text-decoration: underline; color: #000; }
          .report-content { min-height: 300px; text-align: justify; }

          /* Images */
          .key-images-section { margin-top: 20px; }

          /* Footer */
          .footer { position: fixed; bottom: 0; left: 0; right: 0; height: 50px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 8pt; color: #777; display: flex; justify-content: space-between; }
          .disclaimer { font-size: 7pt; margin-top: 5px; color: #999; text-align: justify; }

          .signature-block { margin-top: 40px; text-align: right; page-break-inside: avoid; }
          .sign-line { display: inline-block; border-top: 1px solid #000; padding-top: 5px; min-width: 200px; text-align: center; font-weight: bold; }

          .page-break-before { page-break-before: always; }
        </style>
      </head>
      <body>

        <!-- Header -->
        <div class="header-container">
          <div class="logo-area">
            ${logoHtml}
          </div>
          <div class="hospital-info">
            <div class="hospital-name">${settings.name || "RAD CLINIC"}</div>
            <div class="hospital-details">
              ${settings.address || "Address Line 1"}<br/>
              ${settings.phone ? `Ph: ${settings.phone}` : ""} ${settings.email ? `| Email: ${settings.email}` : ""}
            </div>
          </div>
        </div>

        <!-- Patient Demographics -->
        <div class="meta-grid">
          <div>
            <div class="meta-row"><span class="meta-label">Patient Name:</span> <span class="meta-value">${rep.patient_name || "—"}</span></div>
            <div class="meta-row"><span class="meta-label">Patient ID:</span>   <span class="meta-value">${rep.patient_id || "—"}</span></div>
            <div class="meta-row"><span class="meta-label">Age/Gender:</span>   <span class="meta-value">—</span></div>
          </div>
          <div>
            <div class="meta-row"><span class="meta-label">Modality:</span>  <span class="meta-value">${rep.modality || "—"}</span></div>
            <div class="meta-row"><span class="meta-label">Date:</span>      <span class="meta-value">${studyDate}</span></div>
            <div class="meta-row"><span class="meta-label">Accession:</span> <span class="meta-value">${rep.accession_number || "—"}</span></div>
          </div>
        </div>

        <!-- Report Body -->
        <div class="report-title">${rep.report_title || "RADIOLOGY REPORT"}</div>
        <div class="report-content">
          ${safeContent}
        </div>

        <!-- Signature -->
        <div class="signature-block">
          <div class="sign-line">
            ${rep.created_by || "Radiologist"}<br/>
            <span style="font-weight:normal; font-size:9pt;">Verified on ${reportDate}</span>
          </div>
        </div>

        <!-- Key Images (base64 embedded — no HTTP) -->
        ${userImagesHtml}

        <!-- Footer -->
        <div class="footer">
          <div>
            Printed on: ${dayjs().format("DD-MMM-YYYY HH:mm")}<br/>
            Generated by RIS
          </div>
          <div style="max-width:60%; text-align:right;">
            <div class="disclaimer">
              ${settings.footer_text || "This report is electronically generated. Please correlate clinically. Not valid for medico-legal purposes."}
            </div>
            Page <span class="pageNumber"></span>
          </div>
        </div>

      </body>
      </html>
    `;

    // ── 9. Generate PDF Buffer ───────────────────────────
    const buffer = await pdfService.generatePdfBuffer(html);
    const safeName = (rep.patient_name || "Report").replace(/[^a-z0-9]/gi, "_");
    const acc = rep.accession_number || "000";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="report_${safeName}_${acc}.pdf"`);
    return res.send(buffer);

  } catch (err) {
    console.error("generatePdf error", err);
    return res.status(500).json({ success: false, message: err.message || String(err) });
  }
};
