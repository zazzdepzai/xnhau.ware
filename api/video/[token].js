const { init, isPostgres } = require('../../../api/db');
const { parseCookies } = require('../../../api/utils');

module.exports = async (req, res) => {
  const token = req.query.token || req.url.split('/').pop();
  const db = await init();
  if (req.method === 'GET') {
    if (isPostgres) {
      const r = await db.query('SELECT id,token,original_name,title,description,thumbnail,mime,size,views,likes,created_at,visibility,tags FROM videos WHERE token=$1', [token]);
      if (!r.rows.length) return res.status(404).json({ success:false, error:'Video not found' });
      return res.json(r.rows[0]);
    } else {
      const r = db.prepare('SELECT id,token,original_name,title,description,thumbnail,mime,size,views,likes,created_at,visibility,tags FROM videos WHERE token=?').get(token);
      if (!r) return res.status(404).json({ success:false, error:'Video not found' });
      return res.json(r);
    }
  }
  res.status(405).json({ success:false, error:'Method not allowed' });
};
