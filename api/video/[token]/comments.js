const { init } = require('../../db');
const sanitize = require('sanitize-html');

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/').pop();
  const db = await init();
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const body = req.body || {};
  const name = String(body.name || '').trim().slice(0,40) || 'Ẩn danh';
  let text = String(body.text || '').trim().slice(0,1000);
  if (!text) return res.status(400).json({ success:false, error:'Bình luận trống' });
  // sanitize text
  text = sanitize(text, { allowedTags: [], allowedAttributes: {} });
  const v = (await db.query('SELECT id FROM videos WHERE token=$1', [token])).rows[0];
  if (!v) return res.sendStatus(404);
  try {
    await db.query('INSERT INTO comments(video_id,name,text) VALUES($1,$2,$3)', [v.id, name, text]);
    return res.json({ success:true });
  } catch(e) {
    console.error('[xnhau.cc] comment insert error', e);
    return res.status(500).json({ success:false, error:'Server error' });
  }
};
