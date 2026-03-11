// controllers/invoiceController.js
const pdfService = require("../services/pdfService");
const { pool } = require("../config/postgres");
const dayjs = require("dayjs");
const HospitalSettingsModel = require("../models/hospitalSettingsModel");
const gstService = require("../services/gstService");

/**
 * GET /api/payments/invoice/:orderId
 * Generates a GST-compliant invoice for a study payment
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Fetch Payment & Study Record
    const q = `
      SELECT p.*, s.patient_name, s.modality, s.accession_number, pt.mrn as patient_mrn
      FROM patient_payments p
      JOIN study_metadata s ON p.study_instance_uid = s.study_instance_uid
      LEFT JOIN patients pt ON pt.mrn = s.patient_id OR pt.id::text = s.patient_id
      WHERE p.order_id = $1 AND p.status = 'captured'
    `;
    const r = await pool.query(q, [orderId]);
    if (r.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Payment not found or not captured" });
    }
    const pay = r.rows[0];

    // 2. Fetch Hospital Settings
    const settings = (await HospitalSettingsModel.get()) || {};
    const taxDetails = gstService.calculateGST(parseFloat(pay.amount), settings.state || "India");

    const invoiceDate = dayjs(pay.updated_at).format("DD-MMM-YYYY");

    const html = `
      <!doctype html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', 'Helvetica', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .invoice-box { margin-top: 30px; }
          .title { font-size: 24pt; font-weight: 900; color: #0f172a; margin: 0; }
          .subtitle { font-size: 10pt; color: #64748b; margin: 5px 0 0 0; }
          
          .info-grid { display: flex; justify-content: space-between; margin-top: 30px; gap: 40px; }
          .info-block { flex: 1; }
          .info-label { font-size: 8pt; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 5px; }
          .info-value { font-size: 11pt; font-weight: 600; color: #334155; margin: 0; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 40px; }
          th { background: #f8fafc; text-align: left; padding: 14px; font-size: 9pt; font-weight: 700; color: #475569; border-bottom: 2px solid #e2e8f0; }
          td { padding: 14px; border-bottom: 1px solid #f1f5f9; font-size: 10pt; color: #334155; }
          
          .amount-summary { margin-top: 30px; margin-left: auto; width: 300px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 10pt; }
          .summary-row.total { font-weight: 800; font-size: 13pt; color: #0284c7; border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 15px; }
          
          .status-badge { display: inline-block; padding: 6px 12px; border-radius: 6px; font-weight: 700; font-size: 9pt; margin-top: 20px; }
          .status-paid { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
          
          .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 8pt; color: #94a3b8; }
          .bank-details { margin-top: 40px; font-size: 9pt; color: #475569; background: #f8fafc; padding: 15px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">TAX INVOICE</h1>
            <p class="subtitle">BILLING REF: ${pay.order_id}</p>
            <p class="subtitle">DATE: ${invoiceDate}</p>
          </div>
          <div style="text-align: right;">
            <h3 style="margin: 0; font-size: 14pt; color: #0f172a;">${settings.name || "iPACX DIAGNOSTICS"}</h3>
            <p style="font-size: 9pt; margin: 3px 0;">${settings.address || ""}</p>
            <p style="font-size: 9pt; margin: 3px 0; font-weight: 700;">GSTIN: ${settings.gstin || "N/A"}</p>
            <p style="font-size: 9pt; margin: 3px 0;">Ph: ${settings.phone || ""}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <div class="info-label">Patient Details</div>
            <p class="info-value">${pay.patient_name || "Valued Patient"}</p>
            <p style="font-size: 9pt; color: #64748b; margin: 2px 0;">MRN: ${pay.patient_mrn || pay.patient_id || "N/A"}</p>
          </div>
          <div class="info-block" style="text-align: right;">
            <div class="info-label">Study Details</div>
            <p class="info-value">${pay.modality} Scan</p>
            <p style="font-size: 9pt; color: #64748b; margin: 2px 0;">Accession: ${pay.accession_number || "---"}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 10%;">SAC</th>
              <th style="width: 50%;">Description</th>
              <th style="width: 20%; text-align: right;">Rate</th>
              <th style="width: 20%; text-align: right;">Amount (INR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>9993</td>
              <td>Radiology Diagnostics & Tele-Reporting Services</td>
              <td style="text-align: right;">${taxDetails.taxable_amount.toFixed(2)}</td>
              <td style="text-align: right;">${taxDetails.taxable_amount.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="bank-details">
            <span style="font-weight: 700; color: #1e293b;">BANK DETAILS</span><br/>
            Name: ${settings.bank_name || settings.name || "iPACX"}<br/>
            A/c: ${settings.account_number || "---"}<br/>
            IFSC: ${settings.ifsc_code || "---"}
          </div>
          
          <div class="amount-summary">
            <div class="summary-row">
              <span style="color: #64748b;">Taxable Amount</span>
              <span style="font-weight: 600;">₹${taxDetails.taxable_amount.toFixed(2)}</span>
            </div>
            ${taxDetails.type === 'IGST' ? `
              <div class="summary-row">
                <span style="color: #64748b;">IGST (${taxDetails.igst_rate}%)</span>
                <span style="font-weight: 600;">₹${taxDetails.igst_amount.toFixed(2)}</span>
              </div>
            ` : `
              <div class="summary-row">
                <span style="color: #64748b;">CGST (${taxDetails.cgst_rate}%)</span>
                <span style="font-weight: 600;">₹${taxDetails.cgst_amount.toFixed(2)}</span>
              </div>
              <div class="summary-row">
                <span style="color: #64748b;">SGST (${taxDetails.sgst_rate}%)</span>
                <span style="font-weight: 600;">₹${taxDetails.sgst_amount.toFixed(2)}</span>
              </div>
            `}
            <div class="summary-row total">
              <span>TOTAL</span>
              <span>₹${taxDetails.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div class="status-badge status-paid">
          PAID VIA RAZORPAY • ID: ${pay.payment_id}
        </div>

        <div class="footer">
          <p>This is a computer-generated digital tax invoice. No signature is required.</p>
          <p>Generated by iPACX Intelligence Hub on ${dayjs().format('DD-MMM-YYYY HH:mm')} IST</p>
        </div>
      </body>
      </html>
    `;

    const buffer = await pdfService.generatePdfBuffer(html);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Invoice_${pay.accession_number || orderId}.pdf"`);
    return res.send(buffer);

  } catch (err) {
    console.error("invoiceController.generateInvoice", err);
    res.status(500).json({ success: false });
  }
};
