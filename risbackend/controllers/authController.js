/**
 * controllers/authController.js
 *
 * Production-grade authentication — Audit Rev 2
 *
 * Token Architecture:
 *  • Access Token  — 15 min JWT, returned in response body
 *  • Refresh Token — 7 day cryptographic token, set as httpOnly cookie,
 *                    SHA256-hashed before storage in PostgreSQL
 *
 * [SEC-3]  No JWT_SECRET fallback — server exits if unset
 * [SEC-4]  No sensitive data logged (no req.body, no tokens)
 * [AUTH-1] Refresh tokens rotate on every use
 * [AUTH-2] Session limit enforced (max 3 per user)
 * [AUTH-3] Logout revokes the specific session cookie
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const bcrypt       = require('bcryptjs');
const jwt          = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const userModel    = require('../models/userModel');
const roleModel    = require('../models/roleModel');
const { logAction } = require('./auditController');
const {
  generateRefreshToken,
  hashToken,
  createRefreshToken,
  findRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  REFRESH_TOKEN_TTL_DAYS,
} = require('../helpers/tokenHelper');

/* ── JWT Config ─────────────────────────────────────────── */

const JWT_SECRET          = process.env.JWT_SECRET;  // Guard in server.js
const ACCESS_TOKEN_TTL    = '15m';                   // Short-lived access token
const COOKIE_NAME         = 'refresh_token';         // httpOnly cookie name
const IS_HTTPS            = process.env.NODE_ENV === 'production'; 
                            // Set to false for local dev to allow cookies over HTTP

/* ── Helpers ────────────────────────────────────────────── */

/**
 * Build the JWT access token payload.
 */
function buildAccessToken(user, roleName) {
  const payload = {
    id:        user.id,
    username:  user.username,
    role_id:   user.role_id,
    role:      roleName,
    branch_id: user.branch_id,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

/**
 * Set the refresh token as a secure httpOnly cookie.
 * Path scoped to /api/auth/refresh so the browser only sends it there.
 */
function setRefreshCookie(res, rawToken) {
  res.cookie(COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure:   IS_HTTPS,
    sameSite: 'Strict',
    path:     '/api/auth/refresh',
    maxAge:   REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,  // ms
  });
}

/**
 * Clear the refresh token cookie.
 */
function clearRefreshCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure:   IS_HTTPS,
    sameSite: 'Strict',
    path:     '/api/auth/refresh',
  });
}

/**
 * Extract client IP safely (behind proxies).
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

/* ═══════════════════════════════════════════════════════════
   LOGIN
   POST /api/auth/login
   Returns: { token, user }
   Sets:    httpOnly refresh_token cookie
═══════════════════════════════════════════════════════════ */
exports.login = async (req, res) => {
  // [SEC-4] Never log req.body — contains plaintext password
  try {
    const { username, password } = req.body;
    console.log(`🔑 [DEBUG] Login attempt received for user: "${username}" from origin: ${req.headers.origin}`);
    if (!username || !password) {
      console.warn(`[LOGIN] Failure: Missing username or password for attempt from origin: ${req.headers.origin}`);
      return res.status(400).json({ error: 'Missing username or password' });
    }

    // ── User lookup ──────────────────────────────────────
    let user;
    try {
      user = await userModel.getUserByUsername(username);
    } catch (dbErr) {
      console.error('💥 DB Error during user lookup:', dbErr.message);
      return res.status(500).json({ error: 'Database connection failed' });
    }

    if (!user) {
      console.warn(`[LOGIN] Failure: User "${username}" not found in database.`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (!user.is_active) {
      console.warn(`[LOGIN] Failure: User "${username}" is deactivated.`);
      return res.status(403).json({ error: 'User is deactivated' });
    }

    // ── Password check ────────────────────────────────────
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.warn(`[LOGIN] Failure: Password mismatch for user "${username}".`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // ── Resolve role ──────────────────────────────────────
    let roleName = user.role || '';
    if (user.role_id) {
      const role = await roleModel.getRoleById(user.role_id).catch(() => null);
      if (role) roleName = role.name;
    }

    // ── Issue Access Token (15 min) ───────────────────────
    const accessToken = buildAccessToken(user, roleName);

    // ── Issue Refresh Token (7 days) ──────────────────────
    const rawRefreshToken  = generateRefreshToken();
    const hashedToken      = hashToken(rawRefreshToken);
    const ip               = getClientIp(req);
    const deviceInfo       = req.headers['user-agent'] || 'unknown';

    await createRefreshToken(user.id, hashedToken, ip, deviceInfo);

    // ── Set httpOnly Cookie ───────────────────────────────
    setRefreshCookie(res, rawRefreshToken);

    // ── Audit log ─────────────────────────────────────────
    await logAction(user.username, roleName, 'User login');

    console.log(`✅ [LOGIN] ${user.username} (${roleName}) — access token issued`);

    // ── Response (access token only — refresh token is in cookie) ──
    return res.json({
      message: 'Login successful',
      token:   accessToken,         // ← same key as before — frontend unchanged
      user: {
        id:              user.id,
        username:        user.username,
        full_name:       user.full_name,
        email:           user.email,
        role_id:         user.role_id,
        role:            roleName,
        profile_picture: user.profile_picture,
      },
    });

  } catch (err) {
    console.error('💥 Login error:', err.message, err.stack);
    return res.status(500).json({ 
      error: 'Server error during login', 
      details: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }
};

/* ═══════════════════════════════════════════════════════════
   REFRESH
   POST /api/auth/refresh
   Reads:   httpOnly refresh_token cookie
   Returns: { token }  — new 15-min access token
   Sets:    rotated httpOnly refresh_token cookie
═══════════════════════════════════════════════════════════ */
exports.refreshToken = async (req, res) => {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];

    if (!rawToken) {
      return res.status(401).json({ error: 'No refresh token cookie' });
    }

    const tokenHash = hashToken(rawToken);
    const record    = await findRefreshToken(tokenHash);

    // ── Validate record ───────────────────────────────────
    if (!record) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    if (record.revoked) {
      // Possible token theft — revoke all sessions for this user
      console.warn(`🚨 [SECURITY] Revoked refresh token re-used for user ${record.user_id}. Revoking all sessions.`);
      await revokeAllUserSessions(record.user_id);
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token already used. All sessions revoked.' });
    }
    if (new Date(record.expires_at) < new Date()) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
    }

    // ── Fetch user ────────────────────────────────────────
    const user = await userModel.getUserById(record.user_id);
    if (!user || !user.is_active) {
      clearRefreshCookie(res);
      return res.status(403).json({ error: 'User account inactive' });
    }

    // ── Resolve role ──────────────────────────────────────
    let roleName = user.role || '';
    if (user.role_id) {
      const role = await roleModel.getRoleById(user.role_id).catch(() => null);
      if (role) roleName = role.name;
    }

    // ── Rotate refresh token ──────────────────────────────
    const newRawToken  = generateRefreshToken();
    const newHash      = hashToken(newRawToken);
    const ip           = getClientIp(req);
    const deviceInfo   = req.headers['user-agent'] || 'unknown';

    await rotateRefreshToken(tokenHash, record.user_id, newHash, ip, deviceInfo);

    // ── Issue new access token ────────────────────────────
    const newAccessToken = buildAccessToken(user, roleName);

    // ── Set rotated cookie ────────────────────────────────
    setRefreshCookie(res, newRawToken);

    console.log(`🔁 [REFRESH] Access token rotated for user ${user.username}`);

    return res.json({ token: newAccessToken });   // Frontend reads res.data.token

  } catch (err) {
    console.error('💥 refreshToken error:', err.message);
    return res.status(500).json({ error: 'Server error during token refresh' });
  }
};

/* ═══════════════════════════════════════════════════════════
   LOGOUT
   POST /api/auth/logout
   Revokes the specific refresh token session.
   Clears the cookie.
═══════════════════════════════════════════════════════════ */
exports.logout = async (req, res) => {
  try {
    const rawToken = req.cookies?.[COOKIE_NAME];

    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await revokeRefreshToken(tokenHash);
    }

    clearRefreshCookie(res);

    const username = req.user?.username || 'unknown';
    const role     = req.user?.role     || 'unknown';
    await logAction(username, role, 'User logout');

    console.log(`👋 [LOGOUT] ${username} — session revoked`);
    return res.json({ message: 'Logged out successfully' });

  } catch (err) {
    console.error('Logout error:', err.message);
    return res.status(500).json({ error: 'Server error during logout' });
  }
};

/* ═══════════════════════════════════════════════════════════
   ME
   GET /api/auth/me
   Returns basic user info from the access token.
═══════════════════════════════════════════════════════════ */
exports.me = async (req, res) => {
  return res.json({
    success: true,
    user: {
      id:       req.user.id,
      username: req.user.username,
      role:     req.user.role,
      role_id:  req.user.role_id,
    },
  });
};

/* ═══════════════════════════════════════════════════════════
   REGISTER
   POST /api/auth/register
   Unchanged — still works as before.
═══════════════════════════════════════════════════════════ */
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, email, full_name, role_id } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existing = await userModel.getUserByUsername(username);
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.createUser({
      username,
      password_hash: hashedPassword,
      email,
      full_name,
      role_id,
    });

    const role = role_id
      ? await roleModel.getRoleById(role_id).catch(() => null)
      : null;
    const roleName = role ? role.name : 'user';

    await logAction(username, roleName, 'User registered');
    console.log('✅ User registered:', username);

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id:       newUser.id,
        username: newUser.username,
        email:    newUser.email,
        role_id:  newUser.role_id,
        full_name: newUser.full_name,
      },
    });
  } catch (err) {
    console.error('💥 Register error:', err.message);
    return res.status(500).json({ error: 'Server error during registration' });
  }
};

/* ═══════════════════════════════════════════════════════════
   PROFILE
   GET /api/auth/profile
   Unchanged — returns full user profile.
═══════════════════════════════════════════════════════════ */
exports.profile = async (req, res) => {
  try {
    const user = await userModel.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const role = user.role_id
      ? await roleModel.getRoleById(user.role_id).catch(() => null)
      : null;
    const roleName = role ? role.name : user.role;

    return res.json({
      id:              user.id,
      username:        user.username,
      email:           user.email,
      full_name:       user.full_name,
      role:            roleName,
      profile_picture: user.profile_picture,
    });
  } catch (err) {
    console.error('Profile fetch error:', err.message);
    return res.status(500).json({ error: 'Server error fetching profile' });
  }
};

/* ═══════════════════════════════════════════════════════════
   REVOKE ALL SESSIONS (admin / password change)
   POST /api/auth/revoke-all
   Requires verifyToken — used by admin or password-change flow.
═══════════════════════════════════════════════════════════ */
exports.revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const count = await revokeAllUserSessions(userId);
    clearRefreshCookie(res);

    console.log(`🔒 [REVOKE-ALL] ${count} sessions revoked for user ${userId}`);
    return res.json({ message: `All sessions revoked (${count} total)` });
  } catch (err) {
    console.error('revokeAllSessions error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
};
