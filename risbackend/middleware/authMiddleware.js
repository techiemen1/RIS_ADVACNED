/**
 * middleware/authMiddleware.js
 *
 * Verifies the short-lived access token (15 min JWT) on protected routes.
 * NOTE: This middleware is ONLY for access tokens.
 *       Refresh tokens are handled inside authController.refreshToken.
 *
 * Error codes returned:
 *   401 TOKEN_MISSING   — no Authorization header
 *   401 TOKEN_EXPIRED   — valid token but expired (frontend should refresh)
 *   401 TOKEN_INVALID   — malformed or wrong secret
 *   403 ACCESS_DENIED   — role check failed
 */

'use strict';

const jwt  = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool } = require('../config/postgres');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not set. Refusing to start.');
  process.exit(1);
}

/* ── verifyToken ────────────────────────────────────────── */

/**
 * Middleware to verify the JWT access token.
 * Attaches decoded payload to req.user.
 *
 * Returns distinct error codes so the frontend interceptor can
 * distinguish TOKEN_EXPIRED (→ try refresh) from TOKEN_INVALID (→ logout).
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    // [SEC-4] Never log auth headers or tokens

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization header missing',
        code:  'TOKEN_MISSING',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        error: 'JWT token missing',
        code:  'TOKEN_MISSING',
      });
    }

    // jwt.verify throws TokenExpiredError or JsonWebTokenError
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Frontend interceptor catches this code and calls /api/auth/refresh
      return res.status(401).json({
        error: 'Access token expired',
        code:  'TOKEN_EXPIRED',
      });
    }
    // Any other jwt error (bad signature, malformed, etc.)
    console.error('[authMiddleware] verifyToken invalid:', err.message);
    return res.status(401).json({
      error: 'Invalid token',
      code:  'TOKEN_INVALID',
    });
  }
};

/* ── authorize ──────────────────────────────────────────── */

/**
 * Role-based Access Control middleware.
 * Must be used AFTER verifyToken.
 *
 * @param {string | string[]} allowedRoles
 */
const authorize = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated', code: 'TOKEN_MISSING' });
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Fast path — role is embedded in the JWT
      if (req.user.role && roles.includes(req.user.role)) {
        return next();
      }

      // Slow path — fetch role from DB (handles role changes after token issue)
      if (!req.user.role_id) {
        return res.status(403).json({ error: 'Access denied: role_id missing', code: 'ACCESS_DENIED' });
      }

      const { rows } = await pool.query(
        'SELECT name FROM roles WHERE id = $1',
        [req.user.role_id]
      );
      const dbRole = rows[0]?.name;

      if (!dbRole) {
        return res.status(403).json({ error: 'Access denied: role not found', code: 'ACCESS_DENIED' });
      }

      req.user.role = dbRole;

      if (roles.includes(dbRole)) {
        return next();
      }

      return res.status(403).json({ error: 'Access denied: insufficient privileges', code: 'ACCESS_DENIED' });

    } catch (err) {
      console.error('[authMiddleware] authorize error:', err.message);
      return res.status(500).json({ error: 'Server error during authorization' });
    }
  };
};

module.exports = { verifyToken, authorize };
