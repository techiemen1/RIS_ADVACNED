// services/notificationService.js
const nodemailer = require("nodemailer");
const axios = require("axios");

/**
 * Unified Notification Service
 * Supports: Email (SMTP), SMS (Generic Provider), and WhatsApp (Cloud API)
 */
class NotificationService {
    /**
     * Send Email Alert
     * Configured via SMTP in .env
     */
    async sendEmail(to, subject, text, html) {
        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || "smtp.gmail.com",
                port: process.env.SMTP_PORT || 587,
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: '"iPacx Clinical Hub" <no-reply@ipacx.com>',
                to,
                subject,
                text,
                html,
            });

            console.log(`✅ Email sent to ${to}`);
            return { success: true };
        } catch (err) {
            console.error("❌ Email Delivery Failed:", err.message);
            return { success: false, message: err.message };
        }
    }

    /**
     * Send SMS Alert
     * Uses a generic REST interface (can be mapped to Twilio/Msg91/etc.)
     */
    async sendSMS(phone, message) {
        try {
            // Placeholder for SMS Gateway Integration
            // Example: await axios.get(`https://sms-provider.com/send?to=${phone}&msg=${message}`);
            console.log(`📡 [SMS Simulation] To: ${phone} | Content: ${message}`);
            return { success: true };
        } catch (err) {
            console.error("❌ SMS Delivery Failed:", err.message);
            return { success: false };
        }
    }

    /**
     * Send WhatsApp Alert
     * Uses WhatsApp Business Cloud API logic
     */
    async sendWhatsApp(phone, message, templateName, variables = []) {
        try {
            const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
            const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_ID;

            if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
                console.log(`📱 [WhatsApp Simulation] To: ${phone} | Msg: ${message}`);
                return { success: true, simulated: true };
            }

            await axios.post(
                `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
                {
                    messaging_product: "whatsapp",
                    to: phone,
                    type: "template",
                    template: {
                        name: templateName,
                        language: { code: "en_US" },
                        components: [
                            {
                                type: "body",
                                parameters: variables.map(v => ({ type: "text", text: v }))
                            }
                        ]
                    }
                },
                { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } }
            );

            console.log(`✅ WhatsApp sent to ${phone}`);
            return { success: true };
        } catch (err) {
            console.error("❌ WhatsApp Delivery Failed:", err.response?.data || err.message);
            return { success: false };
        }
    }
}

module.exports = new NotificationService();
