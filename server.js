const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

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

// Health endpoint (lightweight, does not require DB)
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'xnhau.cc' });
});

// Require API modules - fail fast if missing
function requireModule(p) {
  try {
    const mod = require(p);
    if (typeof mod !== 'function' && typeof mod !== 'object') {
      throw new Error(`Module ${p} did not export a function/object`);
    }
    return mod;
  } catch (e) {
    console.error(`Failed to load module ${p}:`, e && e.message ? e.message : e);
    throw e;
  }
}

// List of required handlers
const adminLogin = requireModule('./api/admin/login');
const adminLogout = requireModule('./api/admin/logout');
const adminProfile = requireModule('./api/admin/profile');
const uploadHandler = requireModule('./api/upload');
const streamHandler = requireModule('./api/stream/[token]');
const videoMetaHandler = requireModule('./api/video/[token]');
const commentsHandler = requireModule('./api/video/[token]/comments');
const likeHandler = requireModule('./api/video/[token]/like');
const viewHandler = requireModule('./api/video/[token]/view');

// Mount routes
app.post('/api/admin/login', adminLogin);
app.post('/api/admin/logout', adminLogout);
app.get('/api/admin/profile', adminProfile);
app.post('/api/admin/profile', adminProfile);
app.post('/api/admin/upload', uploadHandler);

app.get('/api/video/:token', (req, res) => videoMetaHandler(req, res));
app.all('/api/video/:token/comments', (req, res) => commentsHandler(req, res));
app.post('/api/video/:token/like', (req, res) => likeHandler(req, res));
app.post('/api/video/:token/view', (req, res) => viewHandler(req, res));
app.get('/stream/:token', (req, res) => streamHandler(req, res));

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
