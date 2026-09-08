*** Begin Patch
*** Update File: server.js
@@
 // serve static files from public
 app.use(express.static(path.join(__dirname, 'public')));
+
+// Health endpoint (lightweight, does not require DB)
+app.get('/api/health', (req, res) => {
+  res.json({ ok: true, service: 'xnhau.cc' });
+});
@@
 // Error handler
-app.use((err, req, res, next) => {
-  console.error('Unhandled error:', err && err.stack ? err.stack : err);
-  if (res.headersSent) return next(err);
-  res.status(500).json({ success: false, error: 'Server error' });
-});
+app.use((err, req, res, next) => {
+  // Log full error with tag so Vercel logs are easy to find
+  console.error('[xnhau.cc]', err && err.stack ? err.stack : err);
+  if (res.headersSent) return next(err);
+  res.status(500).json({ success: false, error: 'Server error' });
+});
*** End Patch
