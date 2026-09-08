const { init } = require('../db');
const { parseCookies } = require('../utils');

async function auth(req) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (!sid) return false;
  const db = await init();
  const r = (await db.query('SELECT token,expires_at FROM sessions WHERE token=$1', [sid])).rows;
  if (!r.length) return false;
  const exp = new Date(r[0].expires_at);
  if (exp > new Date()) return true;
  await db.query('DELETE FROM sessions WHERE token=$1', [sid]);
  return false;
}

module.exports = async (req, res) => {
  const db = await init();
  if (req.method === 'GET') {
    // return profile (admin only)
    if (!await auth(req)) return res.status(401).json({ success:false, error:'Unauthorized' });
    const nameRow = (await db.query("SELECT value FROM profiles WHERE key='name' LIMIT 1")).rows;
    const name = nameRow.length ? nameRow[0].value : 'Admin';
    const usernameRow = (await db.query("SELECT value FROM profiles WHERE key='username' LIMIT 1")).rows;
    const username = usernameRow.length ? usernameRow[0].value : 'admin';
    const bioRow = (await db.query("SELECT value FROM profiles WHERE key='bio' LIMIT 1")).rows;
    const bio = bioRow.length ? bioRow[0].value : '';
    const websiteRow = (await db.query("SELECT value FROM profiles WHERE key='website' LIMIT 1")).rows;
    const website = websiteRow.length ? websiteRow[0].value : '';
    const verifiedRow = (await db.query("SELECT value FROM profiles WHERE key='verified' LIMIT 1")).rows;
    const verified = !!(verifiedRow.length && verifiedRow[0].value);
    return res.json({ avatar: '/uploads/admin-avatar.svg', name, username, bio, website, verified });
  }
  if (req.method === 'POST') {
    if (!await auth(req)) return res.status(401).json({ success:false, error:'Unauthorized' });
    const body = req.body || {};
    const name = String(body.name || 'Admin').trim().slice(0,40) || 'Admin';
    const username = String(body.username || 'admin').trim().slice(0,30) || 'admin';
    const bio = String(body.bio || '').trim().slice(0,250);
    const website = String(body.website || '').trim().slice(0,200);
    await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['name', name]);
    await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['username', username]);
    await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['bio', bio]);
    await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['website', website]);
    await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['verified', '1']);
    return res.json({ success:true, name, username, bio, website, verified:true });
  }
  res.status(405).json({ success:false, error:'Method not allowed' });
};
