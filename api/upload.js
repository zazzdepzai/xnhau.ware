const formidable = require('formidable');
const fs = require('fs');
const path = require('path');
const { init, isPostgres } = require('../api/db');
const { tok } = require('../api/utils');

// Attempt to load @vercel/blob dynamically; if not available or not configured, fallback to local storage
let vercelBlob = null;
try {
  vercelBlob = require('@vercel/blob');
} catch (e) {
  vercelBlob = null;
}

async function uploadToBlob(filename, streamOrBuffer, contentType) {
  // Use BLOB_READ_WRITE_TOKEN when provided; prefer OIDC when running within Vercel and package supports it
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const bucket = process.env.VERCEL_BLOB_BUCKET || undefined;
  if (!vercelBlob) return null;
  try {
    // Different versions of @vercel/blob may expose different APIs. We'll try common patterns safely.
    if (vercelBlob.createClient && typeof vercelBlob.createClient === 'function') {
      const client = vercelBlob.createClient({ token });
      if (client.upload && typeof client.upload === 'function') {
        const key = `${Date.now()}-${filename}`;
        const res = await client.upload({ bucket, key, body: streamOrBuffer, contentType });
        // assume res.url or res.location
        return res?.url || res?.location || null;
      }
    }
    if (vercelBlob.upload && typeof vercelBlob.upload === 'function') {
      const res = await vercelBlob.upload({ token, bucket, name: filename, data: streamOrBuffer });
      return res?.url || res?.location || null;
    }
    // Last resort: if package exposes Blob class with put method
    if (vercelBlob.Blob && typeof vercelBlob.Blob === 'function') {
      const client = new vercelBlob.Blob({ token });
      if (client.put) {
        const key = `${Date.now()}-${filename}`;
        const r = await client.put(key, streamOrBuffer, { contentType });
        return r?.url || null;
      }
    }
  } catch (e) {
    console.error('Blob upload failed', e);
    return null;
  }
  return null;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
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

    // Try upload to Blob if configured
    let stored = null;
    let publicUrl = null;
    try {
      const buffer = fs.readFileSync(video.filepath);
      if (process.env.BLOB_READ_WRITE_TOKEN && vercelBlob) {
        publicUrl = await uploadToBlob(video.originalFilename, buffer, video.mimetype || 'application/octet-stream');
        if (publicUrl) {
          stored = null; // no local file
        }
      }
    } catch (e) {
      console.error('Blob attempt error', e);
    }

    // Fallback: save to public/uploads
    if (!publicUrl) {
      const dataDir = path.join(__dirname, '..', 'public', 'uploads');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const ext = path.extname(video.originalFilename || video.newFilename || '');
      stored = tok() + ext;
      const dest = path.join(dataDir, stored);
      try {
        fs.copyFileSync(video.filepath || video.file, dest);
      } catch(e) {
        try { fs.renameSync(video.filepath, dest); } catch(e2) { console.error(e2); }
      }
      publicUrl = `/uploads/${stored}`;
    }

    let t = tok();
    if (isPostgres) {
      await db.query('INSERT INTO videos(token,original_name,stored_name,url,mime,size,title,description,thumbnail,tags,visibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)', [t, video.originalFilename, stored, publicUrl, video.mimetype || '', video.size || 0, title, description, null, tags, visibility]);
    } else {
      db.prepare('INSERT INTO videos(token,original_name,stored_name,url,mime,size,title,description,thumbnail,tags,visibility) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(t, video.originalFilename, stored, publicUrl, video.mimetype || '', video.size || 0, title, description, null, tags, visibility);
    }
    const proto = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http') || 'http';
    const shareUrl = `${proto}://${req.headers.host}/v/${t}`;
    res.json({ success:true, shareUrl, token: t, title });
  });
};
