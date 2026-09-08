const { Pool } = require('pg');

let pool = null;

async function init() {
  if (pool) return { pool, isPostgres: true };
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Please set it in your environment (Neon/Vercel Postgres).');
  }
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

  return { pool, isPostgres: true };
}

module.exports = { init, isPostgres: true };
