const { init, isPostgres } = require('../../../api/db');
const { tok } = require('../../../api/utils');

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/')[2];
  const db = await init();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  if (isPostgres) {
    const v = (await db.query('SELECT id FROM videos WHERE token=$1', [token])).rows[0];
    if (!v) return res.sendStatus(404);
    let visitor = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('vid='));
    if (visitor) visitor = visitor.split('=')[1]; else { visitor = tok(); res.setHeader('Set-Cookie', `vid=${visitor}; Path=/; Max-Age=${365*24*3600}; SameSite=Lax`); }
    const last = (await db.query('SELECT created_at FROM views WHERE video_id=$1 AND visitor_id=$2 ORDER BY created_at DESC LIMIT 1', [v.id, visitor])).rows[0];
    if (!last || (new Date() - new Date(last.created_at)) > (15*60*1000)) {
      await db.query('INSERT INTO views(video_id,visitor_id) VALUES($1,$2)', [v.id, visitor]);
      await db.query('UPDATE videos SET views = views + 1 WHERE id = $1', [v.id]);
    }
    return res.json({ success:true });
  } else {
    const v = db.prepare('SELECT id FROM videos WHERE token=?').get(token);
    if (!v) return res.sendStatus(404);
    let visitor = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('vid='));
    if (visitor) visitor = visitor.split('=')[1]; else { visitor = tok(); res.setHeader('Set-Cookie', `vid=${visitor}; Path=/; Max-Age=${365*24*3600}; SameSite=Lax`); }
    const last = db.prepare('SELECT created_at FROM views WHERE video_id=? AND visitor_id=? ORDER BY created_at DESC LIMIT 1').get(v.id, visitor);
    if (!last || (new Date() - new Date(last.created_at)) > (15*60*1000)) {
      db.prepare('INSERT INTO views(video_id,visitor_id) VALUES(?,?)').run(v.id, visitor);
      db.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').run(v.id);
    }
    return res.json({ success:true });
  }
};
