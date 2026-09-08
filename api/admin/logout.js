const { init } = require('../db');
const { parseCookies, setCookie } = require('../utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const dbObj = await init();
  const db = dbObj.pool;
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid) {
    await db.query('DELETE FROM sessions WHERE token=$1', [sid]);
  }
  setCookie(res, 'sid', '', { httpOnly:true, maxAge:0, sameSite:'Lax' });
  res.json({ success:true });
};
