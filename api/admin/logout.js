const { init, isPostgres } = require('../api/db');
const { parseCookies, setCookie } = require('../api/utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const db = await init();
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (sid) {
    if (isPostgres) await db.query('DELETE FROM sessions WHERE token=$1', [sid]);
    else db.prepare('DELETE FROM sessions WHERE token=?').run(sid);
  }
  setCookie(res, 'sid', '', { httpOnly:true, maxAge:0, sameSite:'Lax' });
  res.json({ success:true });
};
