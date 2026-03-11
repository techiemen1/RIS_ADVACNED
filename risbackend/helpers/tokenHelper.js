/**
 * helpers/tokenHelper.js
 *
 * Utilities for refresh token lifecycle:
 *  - Secure random token generation
 *  - SHA-256 hashing (never store plaintext)
 *  - DB create / rotate / revoke with session limits
 *
 * MAX_SESSIONS_PER_USER = 3
 * When the 4th device logs in, the oldest non-revoked session is revoked.
 */

'use strict';

const crypto = require('crypto');
const { pool } = require('../config/postgres');

/* ── Constants ─────────────────────────────────────────── */

const REFRESH_TOKEN_BYTES     = 64;          // 512-bit raw token
const MAX_SESSIONS_PER_USER   = 3;
const REFRESH_TOKEN_TTL_DAYS  = 7;

/* ── Core helpers ───────────────────────────────────────── */

/**
 * Generate a cryptographically secure random refresh token.
 * Returns a 128-character hex string.
 */
function generateRefreshToken() {
  return crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
}

/**
 * Hash a raw refresh token with SHA-256.
 * This is what gets stored in the DB.
 *
 * @param {string} rawToken
 * @returns {string} hex digest
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/* ── DB operations ──────────────────────────────────────── */

/**
 * Create a new refresh token record in the DB.
 * Enforces MAX_SESSIONS_PER_USER — revokes the oldest if exceeded.
 *
 * @param {string|number} userId
 * @param {string}        tokenHash - SHA256 hash of the raw token
 * @param {string}        ipAddress
 * @param {string}        deviceInfo
 * @returns {Promise<void>}
 */
async function createRefreshToken(userId, tokenHash, ipAddress = null, deviceInfo = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Count active (non-revoked, non-expired) sessions for this user
    const countRes = await client.query(
      `SELECT id, created_at
       FROM refresh_tokens
       WHERE user_id = $1
         AND revoked   = FALSE
         AND expires_at > NOW()
       ORDER BY created_at ASC`,
      [userId]
    );

    // 2. If at or above limit, revoke the oldest sessions
    const activeCount = countRes.rows.length;
    if (activeCount >= MAX_SESSIONS_PER_USER) {
      const toRevoke = activeCount - MAX_SESSIONS_PER_USER + 1; // +1 to make room for new
      const idsToRevoke = countRes.rows.slice(0, toRevoke).map(r => r.id);
      await client.query(
        `UPDATE refresh_tokens SET revoked = TRUE WHERE id = ANY($1)`,
        [idsToRevoke]
      );
      console.log(`[TOKEN] Session limit enforced for user ${userId}: revoked ${toRevoke} oldest session(s)`);
    }

    // 3. Insert new token
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip_address, device_info, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, ipAddress, deviceInfo, expiresAt]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Look up a refresh token by its hash.
 * Returns the DB row or null if not found.
 *
 * @param {string} tokenHash
 * @returns {Promise<object|null>}
 */
async function findRefreshToken(tokenHash) {
  const res = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  return res.rows[0] || null;
}

/**
 * Rotate a refresh token (revoke old, create new) in a single transaction.
 *
 * @param {string}        oldHash   - hash of the token being rotated out
 * @param {string|number} userId
 * @param {string}        newHash   - hash of the replacement token
 * @param {string}        ipAddress
 * @param {string}        deviceInfo
 * @returns {Promise<void>}
 */
async function rotateRefreshToken(oldHash, userId, newHash, ipAddress = null, deviceInfo = null) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Revoke old
    await client.query(
      `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
      [oldHash]
    );

    // Insert new — no session-limit enforcement here (rotation stays 1-for-1)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, ip_address, device_info, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, newHash, ipAddress, deviceInfo, expiresAt]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Revoke a single refresh token by its hash.
 *
 * @param {string} tokenHash
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(tokenHash) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Revoke ALL active sessions for a user.
 * Called on password change or admin-forced logout.
 *
 * @param {string|number} userId
 * @returns {Promise<number>} count of revoked sessions
 */
async function revokeAllUserSessions(userId) {
  const res = await pool.query(
    `UPDATE refresh_tokens
     SET revoked = TRUE
     WHERE user_id = $1 AND revoked = FALSE`,
    [userId]
  );
  return res.rowCount || 0;
}

module.exports = {
  generateRefreshToken,
  hashToken,
  createRefreshToken,
  findRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  REFRESH_TOKEN_TTL_DAYS,
  MAX_SESSIONS_PER_USER,
};
