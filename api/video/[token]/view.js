const { init } = require('../../db');
const { tok } = require('../../utils');

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/')[2];
  const db = await init();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
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
};
