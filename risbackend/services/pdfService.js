// services/pdfService.js
const html_to_pdf = require("html-pdf-node");

async function generatePdfBuffer(html, options = {}) {
  const file = { content: html };
  const opts = {
    format: "A4",
    printBackground: true,
    margin: { top: 20, right: 20, bottom: 25, left: 20 },
    ...options,
  };
  const buffer = await html_to_pdf.generatePdf(file, opts);
  return buffer;
}

module.exports = { generatePdfBuffer };
