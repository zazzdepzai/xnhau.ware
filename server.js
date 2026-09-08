const express = require('express');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 3000;

// basic rate limiter for APIs
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

// middlewares
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(),microphone=(),geolocation=()');
  next();
});

// serve static files from public
app.use(express.static(path.join(__dirname, 'public')));

// Apply API rate limiter
app.use('/api/', apiLimiter);

// Health endpoint (lightweight, does not require DB)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'xnhau.cc' });
});

// Require API modules - fail fast if missing, with clearer path resolution
function requireModule(relPath) {
  try {
    const full = path.resolve(__dirname, relPath);
    // Check both with and without .js extension
    const candidates = [full, `${full}.js`, path.join(full, 'index.js')];
    const exists = candidates.some(p => fs.existsSync(p));
    if (!exists) {
      const err = new Error(`Required module not found: ${relPath} (resolved to ${full})`);
      err.code = 'MODULE_NOT_FOUND_CUSTOM';
      throw err;
    }
    const mod = require(full);
    if (typeof mod !== 'function' && typeof mod !== 'object') {
      throw new Error(`Module ${relPath} did not export a function/object`);
    }
    return mod;
  } catch (e) {
    // Enhance the error message for logs then rethrow so Vercel shows the precise cause
    console.error('[xnhau.cc] Failed to load module', relPath);
    console.error(e && e.stack ? e.stack : e);
    throw e;
  }
}

// List of required handlers
const adminLogin = requireModule('./api/admin/login');
const adminLogout = requireModule('./api/admin/logout');
const adminProfile = requireModule('./api/admin/profile');
const adminAvatar = requireModule('./api/admin/avatar');
const uploadHandler = requireModule('./api/upload');
const streamHandler = requireModule('./api/stream/[token]');
const videoMetaHandler = requireModule('./api/video/[token]');
const commentsHandler = requireModule('./api/video/[token]/comments');
const likeHandler = requireModule('./api/video/[token]/like');
const viewHandler = requireModule('./api/video/[token]/view');
const publicAvatar = requireModule('./api/profile/avatar');

// Mount routes
app.post('/api/admin/login', adminLogin);
app.post('/api/admin/logout', adminLogout);
app.get('/api/admin/profile', adminProfile);
app.post('/api/admin/profile', adminProfile);
app.post('/api/admin/avatar', adminAvatar);
app.post('/api/admin/upload', uploadHandler);

app.get('/api/video/:token', (req, res) => videoMetaHandler(req, res));
app.all('/api/video/:token/comments', (req, res) => commentsHandler(req, res));
app.post('/api/video/:token/like', (req, res) => likeHandler(req, res));
app.post('/api/video/:token/view', (req, res) => viewHandler(req, res));
app.get('/stream/:token', (req, res) => streamHandler(req, res));

// public avatar endpoint
app.get('/api/profile/avatar', publicAvatar);

// Admin static pages
app.get('/admin', (req, res) => {
  const p = path.join(__dirname, 'public', 'login.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.status(404).send('Admin login not found');
});
app.get('/admin/panel', (req, res) => {
  const p = path.join(__dirname, 'public', 'admin.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.status(404).send('Admin panel not found');
});
app.get('/v/:token', (req, res) => {
  const p = path.join(__dirname, 'public', 'video.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.status(404).send('Video page not found');
});

// Root
app.get('/', (req, res) => {
  const p = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.send('xnhau.cc');
});

// Error handler
app.use((err, req, res, next) => {
  // Log full error with tag so Vercel logs are easy to find
  console.error('[xnhau.cc]', err && err.stack ? err.stack : err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, error: 'Server error' });
});

// Export app for Vercel and start locally when executed directly
module.exports = app;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => console.log(`xnhau.cc listening on http://127.0.0.1:${PORT}`));
}
