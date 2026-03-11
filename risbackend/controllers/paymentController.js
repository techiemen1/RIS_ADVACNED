// controllers/paymentController.js
const { pool } = require("../config/postgres");
const axios = require("axios");
const crypto = require("crypto");
const gstService = require("../services/gstService");
const Billing = require("../models/billingModel");
const HospitalSettingsModel = require("../models/hospitalSettingsModel");

// Razorpay Config (Will be loaded from .env)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

/**
 * POST /api/payments/create-order
 * Body: { studyUID, amount, patientEmail }
 */
exports.createOrder = async (req, res) => {
    try {
        const { studyUID, amount, patientEmail } = req.body;

        if (!studyUID || !amount) {
            return res.status(400).json({ success: false, message: "Missing study info or amount" });
        }

        // 1. In a real scenario, we'd hit Razorpay API here
        let orderId = `order_${Math.random().toString(36).substring(7)}`;

        if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET) {
            try {
                const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
                const response = await axios.post("https://api.razorpay.com/v1/orders", {
                    amount: Math.round(amount * 100), // Razorpay expects paise, rounded to avoid float issues
                    currency: "INR",
                    receipt: studyUID,
                    notes: { studyUID, patientEmail }
                }, {
                    headers: { Authorization: `Basic ${auth}` }
                });
                orderId = response.data.id;
            } catch (err) {
                console.error("Razorpay Order API Error:", err.response?.data || err.message);
                return res.status(500).json({ success: false, message: "Payment gateway error" });
            }
        }

        // 2. Persist order to database
        await pool.query(
            `INSERT INTO patient_payments (study_instance_uid, order_id, amount, patient_email, status)
       VALUES ($1, $2, $3, $4, 'pending')`,
            [studyUID, orderId, amount, patientEmail]
        );

        res.json({
            success: true,
            orderId,
            keyId: RAZORPAY_KEY_ID, // Frontend needs this to open checkout
            amount: Math.round(amount * 100)
        });

    } catch (err) {
        console.error("paymentController.createOrder", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

/**
 * POST /api/payments/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
exports.verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        // 1. Signature Verification
        if (RAZORPAY_KEY_SECRET) {
            const hmac = crypto.createHmac("sha256", RAZORPAY_KEY_SECRET);
            hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
            const generated_signature = hmac.digest("hex");

            if (generated_signature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Invalid payment signature" });
            }
        }

        // 2. Fetch Payment Metadata to link to Billing
        const paymentRes = await pool.query(
            `SELECT study_instance_uid, amount, patient_email FROM patient_payments WHERE order_id = $1`,
            [razorpay_order_id]
        );

        if (paymentRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const { study_instance_uid, amount, patient_email } = paymentRes.rows[0];

        // 3. Update status in db
        await pool.query(
            `UPDATE patient_payments 
       SET status = 'captured', payment_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE order_id = $2`,
            [razorpay_payment_id, razorpay_order_id]
        );

        // 4. Create a unified record in the Billing table
        // Fetch Hospital Settings for GST logic
        const hospital = (await HospitalSettingsModel.get()) || {};
        const taxDetails = gstService.calculateGST(parseFloat(amount), hospital.state || "India");

        // Fetch patient and order details for Billing
        const studyInfo = await pool.query(
            `SELECT s.id as order_id, p.id as patient_id 
             FROM orders s 
             JOIN patients p ON s.patient_id = p.id 
             WHERE s.study_instance_uid = $1 LIMIT 1`,
            [study_instance_uid]
        );

        if (studyInfo.rowCount > 0 && Billing.createBill) {
            const { order_id, patient_id } = studyInfo.rows[0];
            await Billing.createBill({
                patient_id,
                order_id,
                hsn_code: gstService.HSN_RADIOLOGY,
                taxable_amount: taxDetails.taxable_amount,
                cgst_rate: taxDetails.cgst_rate,
                sgst_rate: taxDetails.sgst_rate,
                igst_rate: taxDetails.igst_rate,
                cgst_amount: taxDetails.cgst_amount,
                sgst_amount: taxDetails.sgst_amount,
                igst_amount: taxDetails.igst_amount,
                total_amount: taxDetails.total_amount,
                payment_status: 'paid',
                payment_method: 'Razorpay',
                created_by: 'System/Razorpay'
            });
        }

        res.json({ success: true, message: "Payment verified and invoice generated." });

    } catch (err) {
        console.error("paymentController.verifyPayment", err);
        res.status(500).json({ success: false, message: "Verification failed" });
    }
};

/**
 * GET /api/payments/status/:studyUID
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const { studyUID } = req.params;
        const result = await pool.query(
            `SELECT status, amount, created_at FROM patient_payments 
             WHERE study_instance_uid = $1 ORDER BY created_at DESC LIMIT 1`,
            [studyUID]
        );

        if (result.rowCount === 0) {
            return res.json({ success: true, paid: false });
        }

        res.json({
            success: true,
            paid: result.rows[0].status === 'captured',
            status: result.rows[0].status
        });
    } catch (err) {
        res.status(500).json({ success: false });
    }
};
