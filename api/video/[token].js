const { init } = require('../db');
const { parseCookies } = require('../utils');

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/').pop();
  const db = await init();
  if (req.method === 'GET') {
    const r = (await db.query('SELECT id,token,original_name,title,description,thumbnail,mime,size,views,likes,created_at,visibility,tags FROM videos WHERE token=$1', [token])).rows;
    if (!r.length) return res.status(404).json({ success:false, error:'Video not found' });
    return res.json(r[0]);
  }
  res.status(405).json({ success:false, error:'Method not allowed' });
};
