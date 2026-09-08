const { init } = require('../db');
const path = require('path');
const fs = require('fs');

module.exports = async (req, res) => {
  const token = req.url.split('/').pop();
  const db = await init();
  const r = (await db.query('SELECT url, mime, stored_name FROM videos WHERE token=$1', [token])).rows;
  if (!r.length) return res.sendStatus(404);
  const row = r[0];
  if (row.url && row.url.startsWith('http')) return res.redirect(row.url);
  const p = path.join(__dirname, '..', 'public', row.url || row.stored_name || '');
  if (!fs.existsSync(p)) return res.sendStatus(404);
  const stat = fs.statSync(p);
  const range = req.headers.range;
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', row.mime || 'application/octet-stream');
  if (!range) { res.setHeader('Content-Length', stat.size); fs.createReadStream(p).pipe(res); return; }
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return res.sendStatus(416);
  let a = m[1] ? +m[1] : 0; let b = m[2] ? +m[2] : stat.size-1; if (a > b || a >= stat.size) return res.sendStatus(416);
  res.statusCode = 206; res.setHeader('Content-Range', `bytes ${a}-${b}/${stat.size}`); res.setHeader('Content-Length', b-a+1);
  fs.createReadStream(p, { start: a, end: b }).pipe(res);
};
