const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const AuditLog = sequelize.define('audit_logs', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // important
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  role: {
    type: DataTypes.STRING(20),
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

module.exports = AuditLog;
