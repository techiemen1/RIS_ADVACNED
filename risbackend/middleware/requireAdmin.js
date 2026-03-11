/**
 * middleware/requireAdmin.js
 * Ensures user has ADMIN role
 */

module.exports = function requireAdmin(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = req.user.role || "";

    if (role.toLowerCase() !== "admin") {
      return res.status(403).json({
        error: "Admin access required",
      });
    }

    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ error: "Authorization check failed" });
  }
};
