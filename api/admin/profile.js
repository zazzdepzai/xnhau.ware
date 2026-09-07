const { init, isPostgres } = require('../api/db');
const { parseCookies } = require('../api/utils');

async function auth(req) {
  const cookies = parseCookies(req);
  const sid = cookies.sid;
  if (!sid) return false;
  const db = await init();
  if (isPostgres) {
    const r = await db.query('SELECT token,expires_at FROM sessions WHERE token=$1', [sid]);
    if (!r.rows.length) return false;
    const exp = new Date(r.rows[0].expires_at);
    if (exp > new Date()) return true;
    await db.query('DELETE FROM sessions WHERE token=$1', [sid]);
    return false;
  } else {
    const r = db.prepare('SELECT token,expires_at FROM sessions WHERE token=?').get(sid);
    if (!r) return false;
    if (new Date(r.expires_at) > new Date()) return true;
    db.prepare('DELETE FROM sessions WHERE token=?').run(sid);
    return false;
  }
}

module.exports = async (req, res) => {
  const db = await init();
  if (req.method === 'GET') {
    // return profile (admin only)
    if (!await auth(req)) return res.status(401).json({ success:false, error:'Unauthorized' });
    if (isPostgres) {
      const r = await db.query("SELECT value FROM profiles WHERE key='name'");
      const name = r.rows.length ? r.rows[0].value : 'Admin';
      const username = (await db.query("SELECT value FROM profiles WHERE key='username'")).rows[0]?.value || 'admin';
      const bio = (await db.query("SELECT value FROM profiles WHERE key='bio'")).rows[0]?.value || '';
      const website = (await db.query("SELECT value FROM profiles WHERE key='website'")).rows[0]?.value || '';
      const verified = !!(await db.query("SELECT value FROM profiles WHERE key='verified'")).rows[0]?.value;
      return res.json({ avatar: '/uploads/admin-avatar.svg', name, username, bio, website, verified });
    } else {
      const name = db.prepare("SELECT value FROM profiles WHERE key='name'").get()?.value || 'Admin';
      const username = db.prepare("SELECT value FROM profiles WHERE key='username'").get()?.value || 'admin';
      const bio = db.prepare("SELECT value FROM profiles WHERE key='bio'").get()?.value || '';
      const website = db.prepare("SELECT value FROM profiles WHERE key='website'").get()?.value || '';
      const verified = !!db.prepare("SELECT value FROM profiles WHERE key='verified'").get()?.value;
      return res.json({ avatar: '/uploads/admin-avatar.svg', name, username, bio, website, verified });
    }
  }
  if (req.method === 'POST') {
    if (!await auth(req)) return res.status(401).json({ success:false, error:'Unauthorized' });
    const body = req.body || {};
    const name = String(body.name || 'Admin').trim().slice(0,40) || 'Admin';
    const username = String(body.username || 'admin').trim().slice(0,30) || 'admin';
    const bio = String(body.bio || '').trim().slice(0,250);
    const website = String(body.website || '').trim().slice(0,200);
    if (isPostgres) {
      await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['name', name]);
      await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['username', username]);
      await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['bio', bio]);
      await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['website', website]);
      await db.query("INSERT INTO profiles(key,value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", ['verified', '1']);
    } else {
      db.prepare("INSERT INTO profiles(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run('name', name);
      db.prepare("INSERT INTO profiles(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run('username', username);
      db.prepare("INSERT INTO profiles(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run('bio', bio);
      db.prepare("INSERT INTO profiles(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run('website', website);
      db.prepare("INSERT INTO profiles(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run('verified', '1');
    }
    return res.json({ success:true, name, username, bio, website, verified:true });
  }
  res.status(405).json({ success:false, error:'Method not allowed' });
};
