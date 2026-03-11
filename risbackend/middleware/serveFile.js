/**
 * middleware/serveFile.js
 *
 * Authenticated static file serving for /uploads.
 * Replaces the public express.static("/uploads") that was open to all.
 *
 * Security:
 *  - JWT verification required (uses same verifyToken middleware)
 *  - Path traversal prevention via path.resolve + directory prefix check
 *  - Only serves files within the /uploads directory
 *
 * Usage in server.js:
 *   app.use('/api/files', verifyToken, serveAuthenticatedFile);
 */

const path = require('path');
const fs   = require('fs');

const UPLOADS_ROOT = path.resolve(__dirname, '../uploads');

/**
 * GET /api/files/*filePath
 * Requires valid JWT. Sends the requested file if it exists within /uploads.
 */
const serveAuthenticatedFile = (req, res) => {
  // req.params[0] captures everything after /api/files/
  const requested = req.params[0] || '';

  // Resolve the absolute path and verify it's inside UPLOADS_ROOT
  const absPath = path.resolve(UPLOADS_ROOT, requested);

  if (!absPath.startsWith(UPLOADS_ROOT + path.sep) && absPath !== UPLOADS_ROOT) {
    return res.status(400).json({ error: 'Invalid file path' });
  }

  if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Stream the file — express handles Content-Type via mime-type detection
  res.sendFile(absPath);
};

module.exports = serveAuthenticatedFile;
