const { init } = require('../db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ success:false, error:'Method not allowed' });
  const db = await init();
  try {
    const r = (await db.query("SELECT value FROM profiles WHERE key='avatar' LIMIT 1")).rows;
    if (!r.length) return res.json({ avatar: '/uploads/admin-avatar.svg' });
    return res.json({ avatar: r[0].value });
  } catch (e) {
    return res.status(500).json({ success:false, error:'Server error' });
  }
};
