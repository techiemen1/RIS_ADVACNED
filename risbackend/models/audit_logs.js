const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  action: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'audit_logs',
  timestamps: false,
});

// 🔁 Sync model without altering id type
(async () => {
  try {
    await AuditLog.sync(); // No { alter: true }, just sync
    console.log('✅ AuditLog model synchronized successfully');
  } catch (err) {
    console.error('❌ AuditLog model sync failed:', err.message);
  }
})();

module.exports = AuditLog;
