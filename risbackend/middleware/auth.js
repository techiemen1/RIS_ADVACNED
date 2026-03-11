/**
 * middleware/auth.js
 * JWT authentication middleware
 * - Verifies token
 * - Attaches req.user
 * - Handles expiry & invalid tokens
 */

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// DEPRECATED: Use authMiddleware.js instead
module.exports = function auth(req, res, next) {
  console.warn("Using deprecated auth middleware!");
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Missing or invalid Authorization header",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach user to request (USED EVERYWHERE)
    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      role_id: decoded.role_id,
    };

    next();
  } catch (err) {
    console.error("verifyToken error:", err.message);

    return res.status(401).json({
      success: false,
      message: err.name === "TokenExpiredError"
        ? "JWT expired"
        : "Invalid token",
    });
  }
};
