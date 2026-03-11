// routes/paymentRoutes.js
const express = require("express");
const router = express.Router();
const paymentCtrl = require("../controllers/paymentController");
const invoiceCtrl = require("../controllers/invoiceController");

// Public endpoints (Patients access these via Portal)
router.post("/create-order", paymentCtrl.createOrder);
router.post("/verify", paymentCtrl.verifyPayment);
router.get("/status/:studyUID", paymentCtrl.getPaymentStatus);
router.get("/invoice/:orderId", invoiceCtrl.generateInvoice);

module.exports = router;
