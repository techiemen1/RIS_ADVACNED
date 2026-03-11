require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Pool } = require('pg');

// ✅ Build connection URL if not provided
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// 🔧 Sequelize ORM setup
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl:
      process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false,
  },
});

// 🔧 pg Pool setup (for raw queries and diagnostics)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    process.env.DB_SSL === 'true'
      ? { require: true, rejectUnauthorized: false }
      : false,
});

// 🧠 Diagnostic: Confirm active DB, user, and session
(async () => {
  try {
    await sequelize.authenticate();

    console.log(`✅ Connected to PostgreSQL via Sequelize as user: ${sequelize.config.username}`);

    const [dbRes] = await sequelize.query('SELECT current_database();');
    console.log(`📦 Active database: ${dbRes[0].current_database}`);

    const res = await pool.query('SELECT current_user, session_user');
    console.log(`✅ Connected to PostgreSQL as: ${res.rows[0].current_user}, session: ${res.rows[0].session_user}`);
  } catch (err) {
    console.error('❌ Failed DB connection:', err.message);
  }
})();

module.exports = { sequelize, pool };
