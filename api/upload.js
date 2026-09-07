// Upload handler for serverless (thumbnail + video). Uses formidable to parse multipart
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { init, isPostgres } = require('../api/db');
const { tok } = require('../api/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  // For simplicity we allow admin authentication via sid cookie; reuse admin/profile auth logic
  // Minimal auth: check session exists
  const db = await init();
  // check sid cookie
  const cookiesRaw = req.headers.cookie || '';
  const cookies = {};
  cookiesRaw.split(';').forEach(p=>{const [k,v]=p.split('='); if(k && v) cookies[k.trim()]=v.trim();});
  const sid = cookies.sid;
  if (!sid) return res.status(401).json({ success:false, error:'Unauthorized' });
  // validate session
  if (isPostgres) {
    const r = await db.query('SELECT token,expires_at FROM sessions WHERE token=$1', [sid]);
    if (!r.rows.length) return res.status(401).json({ success:false, error:'Unauthorized' });
  } else {
    const r = db.prepare('SELECT token FROM sessions WHERE token=?').get(sid);
    if (!r) return res.status(401).json({ success:false, error:'Unauthorized' });
  }

  const form = new formidable.IncomingForm();
  form.maxFileSize = 600 * 1024 * 1024; // 600MB
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ success:false, error: err.message });
    const video = files.video;
    if (!video) return res.status(400).json({ success:false, error:'Missing video' });
    const title = String(fields.title || '').trim().slice(0,160) || path.parse(video.originalFilename).name.slice(0,160);
    const description = String(fields.description || '').trim().slice(0,2000);
    const tags = String(fields.tags || '').trim().slice(0,200);
    const visibility = ['public','unlisted','private'].includes(String(fields.visibility)) ? String(fields.visibility) : 'public';
    // Move files to public/uploads (local) and store metadata
    const dataDir = path.join(__dirname, '..', 'public', 'uploads');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const ext = path.extname(video.originalFilename || video.newFilename || '');
    const stored = tok() + ext;
    const dest = path.join(dataDir, stored);
    try {
      fs.copyFileSync(video.filepath || video.file, dest);
    } catch(e) {
      // try fs.rename
      try { fs.renameSync(video.filepath, dest); } catch(e2) { console.error(e2); }
    }
    let t = tok();
    if (isPostgres) {
      // insert into videos with url pointing to /uploads/
      await db.query('INSERT INTO videos(token,original_name,stored_name,url,mime,size,title,description,thumbnail,tags,visibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [t, video.originalFilename, stored, `/uploads/${stored}`, video.mimetype || '', video.size || 0, title, description, null, tags, visibility]);
    } else {
      db.prepare('INSERT INTO videos(token,original_name,stored_name,url,mime,size,title,description,thumbnail,tags,visibility) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(t, video.originalFilename, stored, `/uploads/${stored}`, video.mimetype || '', video.size || 0, title, description, null, tags, visibility);
    }
    const shareUrl = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}/v/${t}`;
    res.json({ success:true, shareUrl, token: t, title });
  });
};
