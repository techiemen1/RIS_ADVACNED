const Audit = require('../models/AuditLog');

/**
 * Logs an action to Postgres and console
 */
exports.logAction = async (username, role, action, req = null) => {
  try {
    const data = { username, role, action };
    if (req) {
      data.ip = req.ip || '';
      data.userAgent = req.headers['user-agent'] || '';
    }

    await Audit.create(data);
    console.info(`[AUDIT] ${username} (${role}) => ${action}`);
  } catch (err) {
    console.error('[AUDIT ERROR] Failed to log action:', err);
  }
};

/**
 * Fetch recent audit logs
 */
exports.getAuditLogs = async (req, res) => {
  try {
    // Audit.find() returns a promise resolving to rows in our new model
    // But wait, our new model returns an object with sort/limit mocks? 
    // Let's just use the direct getLogs method I added to the model for simplicity
    // or fix the model to return what we expect. 
    // The previous model was Mongoose. Let's just use a simple lookup.

    // Check if Audit.find is strict or not. In the new model I defined find() returning an object.
    // Let's use getLogs() which I added to AuditLog.js

    const logs = await Audit.getLogs();
    res.json(logs);
  } catch (err) {
    console.error('[AUDIT ERROR] Failed to fetch audit logs:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};
