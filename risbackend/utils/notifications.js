// Notifications: WhatsApp, SMS, Email
const sendEmail = async (to, subject, message) => {
  console.log(`[EMAIL] To: ${to}, Subject: ${subject}, Msg: ${message}`);
};

const sendSMS = async (number, message) => {
  console.log(`[SMS] To: ${number}, Msg: ${message}`);
};

const sendWhatsApp = async (number, message) => {
  console.log(`[WhatsApp] To: ${number}, Msg: ${message}`);
};

module.exports = { sendEmail, sendSMS, sendWhatsApp };
