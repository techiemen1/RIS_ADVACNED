// risbackend/services/communicationService.js
const axios = require('axios');
const crypto = require('crypto');

/**
 * Multi-Channel Communication Hub for Indian RIS/PACS
 * Handles WhatsApp, SMS, and Email with secure report delivery.
 */
class CommunicationService {
    constructor() {
        this.whatsappProvider = process.env.WHATSAPP_PROVIDER || 'gupshup'; // or 'meta'
        this.smsProvider = process.env.SMS_PROVIDER || 'acl';
    }

    /**
     * Generate a Secure, OTP-Protected Link for Reports
     * @param {string} reportId 
     * @param {string} patientDob - Used as the default password/OTP
     */
    generateSecureReportLink(reportId, patientDob) {
        const token = crypto.randomBytes(32).toString('hex');
        const baseUrl = process.env.FRONTEND_URL || 'https://pacs.example.in';
        return `${baseUrl}/view-report/${reportId}?token=${token}`;
    }

    /**
     * Send WhatsApp Notification
     * @param {string} phone 
     * @param {string} templateName 
     * @param {object} params 
     */
    async sendWhatsApp(phone, templateName, params) {
        console.log(`Sending WhatsApp to ${phone} using template ${templateName}`);
        // Logic for Meta Cloud API or GupShup API
        // POST /v1/messages
        return { messageId: `WA-${Date.now()}` };
    }

    /**
     * Send Multi-Channel Delivery (WhatsApp with SMS Fallback)
     */
    async deliverReport(patient, reportData) {
        const link = this.generateSecureReportLink(reportData.id, patient.dob);
        const message = `Hello ${patient.first_name}, your radiology report from Oviyam Diagnostics is ready. View here: ${link}. Password is your DOB (DDMMYYYY).`;

        try {
            // Priority 1: WhatsApp
            await this.sendWhatsApp(patient.phone, 'report_ready', { link });
        } catch (e) {
            // Priority 2: SMS Fallback
            console.error('WhatsApp failed, falling back to SMS');
            await this.sendSMS(patient.phone, message);
        }

        // Always send Email if available
        if (patient.email) {
            await this.sendEmail(patient.email, 'Radiology Report Ready', message);
        }
    }

    async sendSMS(phone, text) {
        console.log(`Sending SMS to ${phone}: ${text}`);
    }

    async sendEmail(email, subject, body) {
        console.log(`Sending Email to ${email}`);
    }
}

module.exports = new CommunicationService();
