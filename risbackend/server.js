/**
 * iPacx RIS Backend — server.js
 * PRODUCTION-HARDENED — Security Audit Rev 1
 *
 * Changes from previous version:
 *  [SEC-1] Helmet re-enabled with OHIF-compatible config (no CSP, no COEP)
 *  [SEC-2] CORS restricted to explicit LAN/localhost allowlist
 *  [SEC-3] Server refuses to start if JWT_SECRET is missing
 *  [SEC-4] All debug header/token logging removed; morgan→combined format
 *  [SEC-5] /api/debug only mounted in development mode
 *  [SEC-6] /uploads replaced with authenticated /api/files route
 *  [SEC-7] POST /api/auth/login has its own strict rate limiter (20/15min)
 *  [SEC-8] JSON body limited to 10 MB; file upload size enforced via multer
 */

'use strict';

/* =========================================================
   GUARD: Fail fast if required env vars are missing
   Must be first — before any other require
========================================================= */
require('dotenv').config();

const REQUIRED_ENV = ['JWT_SECRET', 'DATABASE_URL', 'PORT'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n💀 [FATAL] Missing required environment variable: ${key}`);
    console.error('   Server will NOT start without all required env vars set.');
    console.error('   Copy .env.template → .env and fill in all values.\n');
    process.exit(1);   // [SEC-3] — hard exit, no fallback secret
  }
}

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const morgan       = require('morgan');
const helmet       = require('helmet');
const compression  = require('compression');
const rateLimit    = require('express-rate-limit');
const cookieParser    = require('cookie-parser');  // For reading httpOnly refresh_token cookie
const http            = require('http');
const https           = require('https');
const fs              = require('fs');
const { initSocket }  = require('./services/socketService');  // WebSocket singleton for STUDY_ARRIVED events


const app = express();

/* =========================================================
   [SEC-1] HELMET — Re-enabled with OHIF-compatible config
   - contentSecurityPolicy: false   → OHIF loads inline scripts
   - crossOriginEmbedderPolicy: false → OHIF needs cross-origin images
   - All other Helmet protections: ON (XSS, noSniff, HSTS, etc.)
========================================================= */
app.use(
  helmet({
    contentSecurityPolicy:    false,  // Required for OHIF viewer
    crossOriginEmbedderPolicy: false, // Required for DICOM image loading
  })
);

/* =========================================================
   [SEC-2] CORS — Explicit allowlist only
   - localhost + 127.0.0.1 for dev
   - LAN subnet 192.168.x.x for radiology workstations
   No wildcard, no origin-reflect.
========================================================= */
const LAN_ORIGIN_REGEX = /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:300\d$/; // Allows 3000-3009

const CORS_ALLOWLIST = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.34:3000',
  'https://localhost:5173',
  'https://127.0.0.1:5173',
  'http://192.168.1.34:3001',
  'http://192.168.1.34:3002',
  'http://localhost:3001',
  'http://localhost:3002'
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl health checks)
      if (!origin) return callback(null, true);

      if (CORS_ALLOWLIST.has(origin) || LAN_ORIGIN_REGEX.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: Origin not allowed — ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/* =========================================================
   Cache-Control headers (prevent browser caching of API responses)
========================================================= */
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

/* =========================================================
   Compression
========================================================= */
app.use(compression());
app.use(cookieParser());  // Parses httpOnly refresh_token cookie on /api/auth/refresh


/* =========================================================
   Global Rate Limiter (broad guard — all routes)
========================================================= */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,                   // Tightened from 2000 → 500
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

/* =========================================================
   [SEC-7] Login-specific Rate Limiter
   POST /api/auth/login → max 20 attempts per IP per 15 minutes.
   Applied BEFORE authRoutes is mounted so it wraps only login.
========================================================= */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                      // Max 20 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins toward limit
  message: {
    error: 'Too many login attempts from this IP. Please wait 15 minutes.',
  },
});

/* =========================================================
   [SEC-8] Body Parser — Explicit Size Limits
   JSON: 10 MB   (covers large report payloads, FHIR bundles)
   URL-encoded: 10 MB
   File upload size is enforced per-route via multer (see upload.js)
========================================================= */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* =========================================================
   [SEC-4] Structured Access Logging — morgan in 'combined' format
   No debug logging of headers or authorization tokens.
   In production, pipe to a log file or logging service.
========================================================= */
if (process.env.NODE_ENV === 'production') {
  // In production, log to a rotating stream (append-only, no token values)
  const accessLogStream = fs.createWriteStream(
    path.join(__dirname, 'logs', 'access.log'),
    { flags: 'a' }
  );
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  // In development: concise output, no sensitive header dumps
  app.use(morgan('dev'));
}

/* =========================================================
   Database
========================================================= */
const initDBConnections = require('./config');
const { pool } = require('./config/postgres');

/* =========================================================
   Global Audit Logger (non-sensitive — method + URL + status only)
========================================================= */
app.use((req, res, next) => {
  res.on('finish', () => {
    if (!req.originalUrl.includes('/api/audit')) {
      // Only log method, path, and status — NO headers, NO body
      console.log(`[AUDIT] ${req.method} ${req.originalUrl} → ${res.statusCode}`);
    }
  });
  next();
});

/* =========================================================
   Route Imports
========================================================= */
const authRoutes             = require('./routes/authRoutes');
const userRoutes             = require('./routes/userRoutes');
const auditRoutes            = require('./routes/auditRoutes');
const patientRoutes          = require('./routes/patientRoutes');
const reportRoutes           = require('./routes/reportRoutes');
const reportTemplateRoutes   = require('./routes/reportTemplateRoutes');
const pacsRoutes             = require('./routes/pacsRoutes');
const pacsAdminRoutes        = require('./routes/pacsAdminRoutes');
const scheduleRoutes         = require('./routes/scheduleRoutes');
const appointmentsRoutes     = require('./routes/appointmentsRoutes');
const mwlRoutes              = require('./routes/mwlRoutes');
const accessionRoutes        = require('./routes/accessionRoutes');
const settingsRoutes         = require('./routes/settingsRoutes');
const roleRoutes             = require('./routes/roleRoutes');
const signatureRoutes        = require('./routes/signatureRoutes');
const aiRoutes               = require('./ai/aiRoutes');
const sttRoutes              = require('./routes/sttRoutes');
const studyRoutes            = require('./routes/studyRoutes');
const consentRoutes          = require('./routes/consentRoutes');
const orderRoutes            = require('./routes/orderRoutes');
const adminRoutes            = require('./routes/adminRoutes');
const viewerRoutes           = require('./routes/viewerRoutes');
const prefetchRoutes         = require('./routes/prefetchRoutes');

/* =========================================================
   [SEC-6] Authenticated File Serving
   Replaces: app.use("/uploads", express.static(...))
   Now requires a valid JWT before any file is sent.
   Route: GET /api/files/:any-path
========================================================= */
const { verifyToken }          = require('./middleware/authMiddleware');
const serveAuthenticatedFile   = require('./middleware/serveFile');

// NOTE: /uploads/public (if you ever add a truly public folder) can be
// re-added as a separate express.static mount scoped to that subfolder only.

/* =========================================================
   Route Mounting
========================================================= */

// Auth — login limiter applied only to the login endpoint
app.post('/api/auth/login', loginLimiter);  // [SEC-7] Rate limit login
app.use('/api/auth', authRoutes);

app.use('/api/users',            userRoutes);
app.use('/api/audit',            auditRoutes);
app.use('/api/patients',         patientRoutes);
app.use('/api/reports',          reportRoutes);
app.use('/api/report-templates', reportTemplateRoutes);
app.use('/api/pacs',             pacsRoutes);
app.use('/api/admin/pacs',       pacsAdminRoutes);
app.use('/api/schedule',         scheduleRoutes);
app.use('/api/appointments',     appointmentsRoutes);
app.use('/api/mwl',              mwlRoutes);
app.use('/api/accession',        accessionRoutes);
app.use('/api/settings',         settingsRoutes);
app.use('/api/roles',            roleRoutes);
app.use('/api/signature',        signatureRoutes);
app.use('/api/ai',               aiRoutes);
app.use('/api/studies',          studyRoutes);
app.use('/api/stt',              sttRoutes);
app.use('/api/consents',         consentRoutes);
app.use('/api/branches',        require('./routes/branchRoutes'));
app.use('/api/orders',           orderRoutes);
app.use('/api/admin',            adminRoutes);
app.use('/api/viewer',           viewerRoutes);
app.use('/api/prefetch',         prefetchRoutes);

app.use('/api/dictation',        require('./routes/dictationRoutes'));
app.use('/api/modalities',       require('./routes/modalityRoutes'));
app.use('/api/analytics',        require('./routes/analyticsRoutes'));
app.use('/api/dicom',            require('./routes/dicomRoutes'));
app.use('/api/share',            require('./routes/shareRoutes'));
app.use('/api/compliance',       require('./routes/complianceRoutes'));

// [SEC-6] Authenticated file download — replaces public /uploads
// Frontend must send Authorization: Bearer <token> when fetching files.
// New canonical URL:  /api/files/keyimages/filename.jpg
app.get('/api/files/*', verifyToken, serveAuthenticatedFile);

// Backward-compatible alias — existing ReportEditor + KeyImagesPanel use /api/uploads/*
// Both routes now require JWT — the OLD public path /uploads is gone.
// Frontend files can be migrated to /api/files/* at any time.
app.get('/api/uploads/*', verifyToken, serveAuthenticatedFile);

// [SEC-5] Debug routes — only available in development
if (process.env.NODE_ENV !== 'production') {
  const debugRoutes = require('./routes/debugRoutes');
  app.use('/api/debug', debugRoutes);
  console.log('⚠️  [DEV] Debug routes mounted at /api/debug');
}

/* =========================================================
   Health Check (unauthenticated — used by PM2/load balancers)
========================================================= */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'iPacx RIS',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'iPacx RIS backend running',
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   Global Error Handler
========================================================= */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Handle CORS rejection cleanly
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }

  const statusCode = err.statusCode || 500;

  // In production: never leak stack traces
  const body = {
    success: false,
    message: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  };
  if (process.env.NODE_ENV !== 'production') {
    body.stack = err.stack;
  }

  console.error(`❌ [ERROR] ${req.method} ${req.url} [${statusCode}]: ${err.message}`);
  res.status(statusCode).json(body);
});

/* =========================================================
   Start DB + Server
========================================================= */
(async () => {
  try {
    if (typeof initDBConnections === 'function') {
      await initDBConnections();
    }
    console.log('✅ Database initialized');

    if (pool) {
      const r = await pool.query('SELECT current_database() AS db');
      console.log(`📦 Connected to Postgres: ${r.rows[0].db}`);
    }

    // Ensure logs directory exists
    fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

    // Start Native MWL Server
    const { startMwlServer } = require('./services/mwlServer');
    startMwlServer();
  } catch (err) {
    console.error('❌ DB startup error:', err.message || err);
    // Do not exit — allow health check to still respond for diagnostics
  }
})();

const PORT = process.env.PORT || 5000;

/* =========================================================
   HTTPS — self-signed cert (replace with CA-signed in prod)
========================================================= */
/* 
const httpsOptions = {
  key:  fs.readFileSync(path.join(__dirname, '../key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../cert.pem')),
};
*/

const server = http.createServer(app);

// 📡 Socket.io — must init BEFORE .listen() so WebSocket upgrade works on first request
initSocket(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 iPacx RIS running on http://0.0.0.0:${PORT}`);
  console.log(`🔓 HTTP mode | NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`🛡️  Helmet: ON | CORS: restricted | Debug routes: ${process.env.NODE_ENV !== 'production' ? 'MOUNTED' : 'BLOCKED'}`);
  console.log(`📡 WebSocket: socket.io active | Events: STUDY_ARRIVED`);
});

/* =========================================================
   Graceful Shutdown — handles both SIGTERM (PM2) and SIGINT (Ctrl+C)
========================================================= */
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 [${signal}] Graceful shutdown initiated...`);
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    try {
      if (pool) await pool.end();
      console.log('💾 DB connections closed');
    } catch (e) {
      console.error('DB close error:', e.message);
    }
    process.exit(0);
  });

  // Force kill after 10 seconds if hanging
  setTimeout(() => {
    console.error('⚡ Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));  // PM2 restart
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));   // Ctrl+C

/* =========================================================
   Unhandled Errors — log but do NOT silently continue
   In production, these should trigger an alert/restart via PM2
========================================================= */
process.on('unhandledRejection', (reason) => {
  console.error('💥 [unhandledRejection]:', reason);
  // PM2 watch or supervisor will restart if process exits
  // For clinical systems: monitor and alert on this
});

process.on('uncaughtException', (err) => {
  console.error('💥 [uncaughtException]:', err.message, err.stack);
  // Attempt graceful shutdown — uncaught exception = unknown state
  gracefulShutdown('uncaughtException');
});
