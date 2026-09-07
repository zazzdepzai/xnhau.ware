const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// serve static
app.use(express.static(path.join(__dirname, 'public')));

// Mount API handlers (use existing modules in /api folder)
function safeRequire(p) {
  try { return require(p); } catch (e) { console.error('Failed to require', p, e); return null; }
}

// admin
const adminLogin = safeRequire('./api/admin/login');
const adminLogout = safeRequire('./api/admin/logout');
const adminProfile = safeRequire('./api/admin/profile');
const uploadHandler = safeRequire('./api/upload');
const streamHandler = safeRequire('./api/stream/[token]');
const videoHandler = safeRequire('./api/video/[token]');
const commentsHandler = safeRequire('./api/video/[token]/comments');
const likeHandler = safeRequire('./api/video/[token]/like');
const viewHandler = safeRequire('./api/video/[token]/view');

if (adminLogin) app.post('/api/admin/login', adminLogin);
if (adminLogout) app.post('/api/admin/logout', adminLogout);
if (adminProfile) {
  app.get('/api/admin/profile', adminProfile);
  app.post('/api/admin/profile', adminProfile);
}
if (uploadHandler) app.post('/api/admin/upload', uploadHandler);

// video metadata
if (videoHandler) app.get('/api/video/:token', (req, res) => videoHandler(req, res));
// comments
if (commentsHandler) app.all('/api/video/:token/comments', (req, res) => commentsHandler(req, res));
if (likeHandler) app.post('/api/video/:token/like', (req, res) => likeHandler(req, res));
if (viewHandler) app.post('/api/video/:token/view', (req, res) => viewHandler(req, res));
// stream
if (streamHandler) app.get('/stream/:token', (req, res) => streamHandler(req, res));

// fallback for unknown API route
app.use('/api/*', (req, res) => res.status(404).json({ success:false, error:'Not found' }));

// Basic homepage redirect to public/index.html
app.get('/', (req, res) => {
  const idx = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(idx)) return res.sendFile(idx);
  res.send('xnhau.cc');
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success:false, error: 'Server error' });
});

// Export app for Vercel serverless or start server locally
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, '0.0.0.0', () => console.log(`xnhau.cc listening on http://127.0.0.1:${PORT}`));
}
