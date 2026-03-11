/**
 * scripts/fixPasswords.js
 * Description: Scan 'users' table, hash any plain-text passwords, and update the DB.
 */

const bcrypt = require('bcryptjs');
const { pool } = require('../config/postgres'); // adjust path if needed

async function fixPasswords() {
  try {
    console.log('🔍 Scanning users table for plain-text passwords...');

    const res = await pool.query('SELECT id, username, password_hash FROM users');

    let updatedCount = 0;

    for (const user of res.rows) {
      const { id, username, password_hash } = user;

      // Naive check: bcrypt hashes start with $2
      if (!password_hash || !password_hash.startsWith('$2')) {
        const newHash = await bcrypt.hash(password_hash || 'defaultPassword123', 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, id]);
        console.log(`✅ Hashed password for user: ${username} (ID: ${id})`);
        updatedCount++;
      } else {
        console.log(`ℹ️ Password already hashed for user: ${username} (ID: ${id})`);
      }
    }

    console.log(`🎯 Done! Total users updated: ${updatedCount}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing passwords:', err);
    process.exit(1);
  }
}

fixPasswords();
