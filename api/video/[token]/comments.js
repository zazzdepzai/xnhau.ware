const { init, isPostgres } = require('../../db');
const { parseCookies } = require('../../utils');

async function auth(req){
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (!sid) return false;
  const db = await init();
  const r = (await db.query('SELECT token,expires_at FROM sessions WHERE token=$1', [sid])).rows;
  if (!r.length) return false;
  return new Date(r[0].expires_at) > new Date();
}

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/').pop();
  const db = await init();
  if (req.method === 'GET') {
    const r = (await db.query('SELECT id FROM videos WHERE token=$1', [token])).rows;
    if (!r.length) return res.status(404).json({ error: 'Video not found' });
    const vid = r[0].id;
    const rows = (await db.query('SELECT id,name,text,is_admin,is_hidden,is_pinned,created_at FROM comments WHERE video_id=$1 AND is_hidden=FALSE ORDER BY is_pinned DESC, id DESC', [vid])).rows;
    return res.json(rows);
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0,40) || 'Ẩn danh';
    const text = String(body.text || '').trim().slice(0,1000);
    if (!text) return res.status(400).json({ success:false, error:'Bình luận trống' });
    const v = (await db.query('SELECT id FROM videos WHERE token=$1', [token])).rows[0];
    if (!v) return res.sendStatus(404);
    const isAdmin = await auth(req) ? true : false;
    await db.query('INSERT INTO comments(video_id,name,text,is_admin) VALUES($1,$2,$3,$4)', [v.id, name, text, isAdmin]);
    return res.json({ success:true });
  }
  res.status(405).json({ success:false, error:'Method not allowed' });
};
