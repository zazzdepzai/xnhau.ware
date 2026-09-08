const { Pool } = require('pg');
const { bcrypt } = require('./utils');

let pool = null;
const isPostgres = Boolean(process.env.DATABASE_URL);

async function init() {
  if (!isPostgres) {
    throw new Error('DATABASE_URL is required. Please set it in your environment (Postgres).');
  }
  if (pool) return pool;
  const DATABASE_URL = process.env.DATABASE_URL;
  pool = new Pool({ connectionString: DATABASE_URL });

  // Run migrations (create tables if not exist)
  const queries = [
    `CREATE TABLE IF NOT EXISTS profiles(key TEXT PRIMARY KEY, value TEXT);`,
    `CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, created_at TIMESTAMP, expires_at TIMESTAMP);`,
    `CREATE TABLE IF NOT EXISTS videos(
      id SERIAL PRIMARY KEY,
      token TEXT UNIQUE,
      original_name TEXT,
      stored_name TEXT,
      url TEXT,
      mime TEXT,
      size INTEGER,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT now(),
      title TEXT,
      description TEXT,
      thumbnail TEXT,
      tags TEXT,
      visibility TEXT DEFAULT 'public'
    );`,
    `CREATE TABLE IF NOT EXISTS comments(
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id),
      name TEXT NOT NULL,
      text TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT false,
      is_hidden BOOLEAN DEFAULT false,
      is_pinned BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT now()
    );`,
    `CREATE TABLE IF NOT EXISTS likes(
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id),
      visitor_id TEXT,
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE(video_id, visitor_id)
    );`,
    `CREATE TABLE IF NOT EXISTS views(
      id SERIAL PRIMARY KEY,
      video_id INTEGER REFERENCES videos(id),
      visitor_id TEXT,
      created_at TIMESTAMP DEFAULT now()
    );`
  ];

  for (const q of queries) {
    await pool.query(q);
  }

  // If ADMIN_PASSWORD is set and no admin_hash exists, seed it
  try {
    if (process.env.ADMIN_PASSWORD) {
      const r = await pool.query('SELECT value FROM profiles WHERE key=$1', ['admin_hash']);
      if (!r.rows.length) {
        const hash = bcrypt.hashSync(String(process.env.ADMIN_PASSWORD), 10);
        await pool.query('INSERT INTO profiles(key,value) VALUES($1,$2)', ['admin_hash', hash]);
        console.log('[xnhau.cc] admin_hash created from ADMIN_PASSWORD (please change in DB if needed)');
      }
    }
  } catch (e) {
    // non-fatal
    console.warn('[xnhau.cc] failed to seed admin_hash:', e && e.message ? e.message : e);
  }

  return pool;
}

module.exports = { init, isPostgres };
