const { init, isPostgres } = require('../../../api/db');
const { parseCookies, tok } = require('../../../api/utils');

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/')[2];
  const db = await init();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  // get video id
  if (isPostgres) {
    const v = (await db.query('SELECT id FROM videos WHERE token=$1', [token])).rows[0];
    if (!v) return res.sendStatus(404);
    let visitor = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('vid='));
    if (visitor) visitor = visitor.split('=')[1]; else { visitor = tok(); res.setHeader('Set-Cookie', `vid=${visitor}; Path=/; Max-Age=${365*24*3600}; SameSite=Lax`); }
    try {
      await db.query('INSERT INTO likes(video_id,visitor_id) VALUES($1,$2)', [v.id, visitor]);
      await db.query('UPDATE videos SET likes = likes + 1 WHERE id = $1', [v.id]);
      return res.json({ success:true });
    } catch(e) {
      return res.status(409).json({ success:false, error:'Bạn đã like video này rồi' });
    }
  } else {
    const v = db.prepare('SELECT id FROM videos WHERE token=?').get(token);
    if (!v) return res.sendStatus(404);
    let visitor = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s=>s.startsWith('vid='));
    if (visitor) visitor = visitor.split('=')[1]; else { visitor = tok(); res.setHeader('Set-Cookie', `vid=${visitor}; Path=/; Max-Age=${365*24*3600}; SameSite=Lax`); }
    try {
      db.prepare('INSERT INTO likes(video_id,visitor_id) VALUES(?,?)').run(v.id, visitor);
      db.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').run(v.id);
      return res.json({ success:true });
    } catch(e) {
      return res.status(409).json({ success:false, error:'Bạn đã like video này rồi' });
    }
  }
};
