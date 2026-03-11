/**
 * routes/authRoutes.js
 *
 * Auth route definitions — Rev 2 (refresh token architecture)
 *
 * Public routes (no auth required):
 *   POST /api/auth/login        — credential login, sets refresh cookie
 *   POST /api/auth/refresh      — rotates refresh token via httpOnly cookie
 *   POST /api/auth/register     — new user registration
 *
 * Protected routes (Bearer access token required):
 *   POST /api/auth/logout       — revokes the refresh session + clears cookie
 *   GET  /api/auth/me           — returns JWT payload
 *   GET  /api/auth/profile      — returns full user profile from DB
 *   POST /api/auth/revoke-all   — revokes all sessions for the current user
 */

'use strict';

const router         = require('express').Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// ── Public ───────────────────────────────────────────────

// Login — rate limiter applied in server.js before this router
router.post('/login',    authController.login);

// Refresh — reads httpOnly cookie; NO verifyToken (access token may be expired)
router.post('/refresh',  authController.refreshToken);

// Register — open for admin-created accounts
router.post('/register', authController.register);

// ── Protected ────────────────────────────────────────────

// Logout — verifyToken to log the username; also reads refresh cookie independently
router.post('/logout',      verifyToken, authController.logout);

// /me — lightweight JWT payload return
router.get('/me',           verifyToken, authController.me);

// /profile — full DB profile fetch
router.get('/profile',      verifyToken, authController.profile);

// Revoke all sessions (e.g. after password change)
router.post('/revoke-all',  verifyToken, authController.revokeAllSessions);

module.exports = router;
