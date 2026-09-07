const { init, isPostgres } = require('../../../api/db');
const { parseCookies } = require('../../../api/utils');

async function auth(req){
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (!sid) return false;
  const db = await init();
  if (isPostgres) {
    const r = await db.query('SELECT token,expires_at FROM sessions WHERE token=$1', [sid]);
    if (!r.rows.length) return false;
    return new Date(r.rows[0].expires_at) > new Date();
  } else {
    const r = db.prepare('SELECT token,expires_at FROM sessions WHERE token=?').get(sid);
    if (!r) return false;
    return new Date(r.expires_at) > new Date();
  }
}

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/').pop();
  const db = await init();
  if (req.method === 'GET') {
    if (isPostgres) {
      const r = await db.query('SELECT id FROM videos WHERE token=$1', [token]);
      if (!r.rows.length) return res.sendStatus(404);
      const vid = r.rows[0].id;
      const rows = (await db.query('SELECT id,name,text,is_admin,is_hidden,is_pinned,created_at FROM comments WHERE video_id=$1 ORDER BY is_pinned DESC, id DESC', [vid])).rows;
      return res.json(rows);
    } else {
      const v = db.prepare('SELECT id FROM videos WHERE token=?').get(token);
      if (!v) return res.sendStatus(404);
      const rows = db.prepare('SELECT id,name,text,is_admin,is_hidden,is_pinned,created_at FROM comments WHERE video_id=? AND is_hidden=0 ORDER BY is_pinned DESC, id DESC').all(v.id);
      return res.json(rows);
    }
  }
  if (req.method === 'POST') {
    const body = req.body || {};
    const name = String(body.name || '').trim().slice(0,40) || 'Ẩn danh';
    const text = String(body.text || '').trim().slice(0,1000);
    if (!text) return res.status(400).json({ success:false, error:'Bình luận trống' });
    if (isPostgres) {
      const v = (await db.query('SELECT id FROM videos WHERE token=$1', [token])).rows[0];
      if (!v) return res.sendStatus(404);
      const isAdmin = await auth(req) ? true : false;
      await db.query('INSERT INTO comments(video_id,name,text,is_admin) VALUES($1,$2,$3,$4)', [v.id, name, text, isAdmin]);
      return res.json({ success:true });
    } else {
      const v = db.prepare('SELECT id FROM videos WHERE token=?').get(token);
      if (!v) return res.sendStatus(404);
      const isAdmin = await auth(req) ? 1 : 0;
      db.prepare('INSERT INTO comments(video_id,name,text,is_admin) VALUES(?,?,?,?)').run(v.id, name, text, isAdmin);
      return res.json({ success:true });
    }
  }
  res.status(405).json({ success:false, error:'Method not allowed' });
};
