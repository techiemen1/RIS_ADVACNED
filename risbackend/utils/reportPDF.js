// utils/reportPDF.js
const PDFDocument = require("pdfkit");
const axios = require("axios");
const stream = require("stream");
const fs = require("fs");
const path = require("path");

/**
 * createReportPDF(report, options)
 *  - report: { patientName, patientId, studyDescription, findings, impression, keyImages: [urls], signedByPath }
 *  - options: { hospital: {name, address, logo_path}, fonts: {family, size, headingSize}, footerText }
 *
 * returns Buffer (PDF)
 */
async function createReportPDF(report, options = {}) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const buffers = [];
  doc.on("data", (b) => buffers.push(b));
  const finishPromise = new Promise((res) => doc.on("end", () => res(Buffer.concat(buffers))));

  const fontsDir = path.join(__dirname, "..", "fonts");
  // allow custom fonts folder fallback to standard fonts
  try {
    if (fs.existsSync(fontsDir)) {
      doc.registerFont("Custom", path.join(fontsDir, "Inter-Regular.ttf"));
    }
  } catch (e) {
    // ignore
  }

  const hospital = options.hospital || {};
  const fonts = options.fonts || { family: "Helvetica", size: 11, headingSize: 14 };

  // Header (logo + hospital)
  if (hospital.logo_path) {
    try {
      const imgBuf = await fetchBuffer(hospital.logo_path);
      if (imgBuf) {
        doc.image(imgBuf, { fit: [80, 80], align: "left" });
      }
    } catch (e) {
      // ignore
    }
  }
  doc.fontSize(14).font(fonts.family).text(hospital.name || "", 120, 40, { continued: false });
  if (hospital.address) {
    doc.fontSize(9).text(hospital.address, { align: "left" });
  }
  doc.moveDown(1);

  // Patient info block
  doc.fontSize(10).font(fonts.family);
  doc.text(`Patient: ${report.patientName || "-"}`, { continued: true }).text(`    ID: ${report.patientId || "-"}`, { align: "right" });
  doc.text(`Study: ${report.studyDescription || "-"}`);
  doc.text(`Date: ${report.date || new Date().toISOString().slice(0,10)}`);
  doc.moveDown(0.5);

  // Findings
  doc.fontSize(fonts.headingSize).text("FINDINGS", { underline: true });
  doc.moveDown(0.2);
  doc.fontSize(fonts.size).text(report.findings || "-", { align: "left" });
  doc.moveDown(0.5);

  // Impression
  doc.fontSize(fonts.headingSize).text("IMPRESSION", { underline: true });
  doc.moveDown(0.2);
  doc.fontSize(fonts.size).text(report.impression || "-", { align: "left" });
  doc.moveDown(0.5);

  // Key images — fetch and place thumbnails (up to 4)
  if (Array.isArray(report.keyImages) && report.keyImages.length > 0) {
    doc.fontSize(12).text("Key Images");
    const imgs = report.keyImages.slice(0, 6);
    const startX = doc.x;
    let x = startX;
    let y = doc.y + 5;
    const thumbW = 130;
    const thumbH = 100;
    for (let i = 0; i < imgs.length; ++i) {
      try {
        const buf = await fetchBuffer(imgs[i]);
        if (buf) {
          doc.image(buf, x, y, { fit: [thumbW, thumbH], align: "center" });
        } else {
          doc.rect(x, y, thumbW, thumbH).stroke();
        }
      } catch (e) {
        doc.rect(x, y, thumbW, thumbH).stroke();
      }
      x += thumbW + 10;
      if (x + thumbW > doc.page.width - doc.page.margins.right) {
        x = startX;
        y += thumbH + 10;
      }
    }
    doc.moveDown(6);
  }

  // Signature block
  if (report.signedByPath) {
    try {
      const sigBuf = await fetchBuffer(report.signedByPath);
      if (sigBuf) {
        doc.text(`Signed by: ${report.signedByName || ""}`, { continued: false });
        doc.image(sigBuf, { fit: [150, 60] });
      }
    } catch (e) {
      // ignore
    }
  }

  // Footer
  if (options.footerText || hospital.footer_text) {
    doc.moveDown(2);
    doc.fontSize(9).text(options.footerText || hospital.footer_text || "", { align: "center", valign: "bottom" });
  }

  doc.end();
  return finishPromise;
}

// helper: fetch remote/absolute local path and return Buffer
async function fetchBuffer(urlOrPath) {
  try {
    if (!urlOrPath) return null;
    // local path (starting with /uploads or relative)
    if (urlOrPath.startsWith("/")) {
      const p = path.join(process.cwd(), urlOrPath.replace(/^\//, ""));
      if (fs.existsSync(p)) return fs.readFileSync(p);
    }
    // if http(s) --> fetch
    if (/^https?:\/\//i.test(urlOrPath)) {
      const r = await axios.get(urlOrPath, { responseType: "arraybuffer", timeout: 8000 });
      return Buffer.from(r.data);
    }
    // fallback try reading as relative file
    if (fs.existsSync(urlOrPath)) return fs.readFileSync(urlOrPath);
    return null;
  } catch (err) {
    console.warn("fetchBuffer failed", err && err.message);
    return null;
  }
}

module.exports = { createReportPDF };
