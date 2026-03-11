const { getConfig, setConfig } = require('../models/systemConfigModel');

exports.getSystemConfig = async (req, res) => {
  try {
    const config = await getConfig();
    res.json(config);
  } catch (err) {
    console.error('Config fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
};

exports.updateSystemConfig = async (req, res) => {
  try {
    const updates = req.body; // {currency: "USD", timezone: "Asia/Kolkata"}
    for (const key in updates) {
      await setConfig(key, updates[key]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Config update error:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
};
