const { init } = require('../db');
const { tok, nowISO, parseCookies, setCookie, bcrypt } = require('../utils');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success:false, error:'Method not allowed' });
  const dbObj = await init();
  const db = dbObj.pool;
  const body = req.body || {};
  const pw = String(body.password || '');
  if (!pw) return res.status(400).json({ success:false, error:'Missing password' });
  // get admin_hash
  const r = (await db.query("SELECT value FROM profiles WHERE key='admin_hash'")).rows;
  if (!r.length) return res.status(500).json({ success:false, error:'Admin not configured' });
  const hash = r[0].value;
  const ok = await bcrypt.compare(pw, hash);
  if (!ok) return res.status(401).json({ success:false, error:'Sai mật khẩu admin' });
  const token = tok();
  const expiresAt = new Date(Date.now() + 7*24*3600*1000).toISOString();
  await db.query('INSERT INTO sessions(token,created_at,expires_at) VALUES($1,$2,$3)', [token, nowISO(), expiresAt]);
  setCookie(res, 'sid', token, { httpOnly:true, maxAge:7*24*3600, sameSite:'Lax' });
  return res.json({ success:true });
};
