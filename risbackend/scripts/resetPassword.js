// scripts/resetPassword.js
require("dotenv").config();
const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function resetPassword() {
  const username = "admin1"; // change if needed
  const newPassword = "adminpass"; // new password
  const saltRounds = 10;

  try {
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    const result = await pool.query(
      "UPDATE users SET password_hash = $1, last_password_change = NOW() WHERE username = $2",
      [hashedPassword, username]
    );

    if (result.rowCount === 0) {
      console.log(`❌ No user found with username: ${username}`);
    } else {
      console.log(`✅ Password for '${username}' reset successfully!`);
    }

    await pool.end();
  } catch (err) {
    console.error("Error resetting password:", err);
  }
}

resetPassword();
