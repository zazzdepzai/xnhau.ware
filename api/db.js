// Lightweight DB abstraction: uses Postgres when DATABASE_URL is set, otherwise falls back to SQLite for local dev
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || '';
let db = null;
let isPostgres = false;

async function init() {
  if (db) return db;
  if (DATABASE_URL) {
    // Use pg
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: DATABASE_URL });
    // Run migrations
    await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, created_at TIMESTAMP, expires_at TIMESTAMP);
    CREATE TABLE IF NOT EXISTS videos(id SERIAL PRIMARY KEY, token TEXT UNIQUE, original_name TEXT, stored_name TEXT, url TEXT, mime TEXT, size INTEGER, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT now(), title TEXT, description TEXT, thumbnail TEXT, tags TEXT, visibility TEXT DEFAULT 'public');
    CREATE TABLE IF NOT EXISTS comments(id SERIAL PRIMARY KEY, video_id INTEGER REFERENCES videos(id), name TEXT NOT NULL, text TEXT NOT NULL, is_admin BOOLEAN DEFAULT false, is_hidden BOOLEAN DEFAULT false, is_pinned BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT now());
    CREATE TABLE IF NOT EXISTS likes(id SERIAL PRIMARY KEY, video_id INTEGER REFERENCES videos(id), visitor_id TEXT, created_at TIMESTAMP DEFAULT now(), UNIQUE(video_id, visitor_id));
    CREATE TABLE IF NOT EXISTS views(id SERIAL PRIMARY KEY, video_id INTEGER REFERENCES videos(id), visitor_id TEXT, created_at TIMESTAMP DEFAULT now());
    `);
    db = pool;
    isPostgres = true;
  } else {
    // Fallback to SQLite
    const Database = require('better-sqlite3');
    const DATA = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
    const file = path.join(DATA, 'app.db');
    const d = new Database(file);
    d.pragma('journal_mode = WAL');
    d.exec(`
    CREATE TABLE IF NOT EXISTS profiles(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, created_at TEXT, expires_at TEXT);
    CREATE TABLE IF NOT EXISTS videos(id INTEGER PRIMARY KEY, token TEXT UNIQUE, original_name TEXT, stored_name TEXT, url TEXT, mime TEXT, size INTEGER, views INTEGER DEFAULT 0, likes INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, title TEXT, description TEXT, thumbnail TEXT, tags TEXT, visibility TEXT DEFAULT 'public');
    CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY, video_id INTEGER, name TEXT NOT NULL, text TEXT NOT NULL, is_admin INTEGER DEFAULT 0, is_hidden INTEGER DEFAULT 0, is_pinned INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS likes(id INTEGER PRIMARY KEY, video_id INTEGER, visitor_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(video_id, visitor_id));
    CREATE TABLE IF NOT EXISTS views(id INTEGER PRIMARY KEY, video_id INTEGER, visitor_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    `);
    db = d;
    isPostgres = false;
  }
  return db;
}

module.exports = { init, isPostgres };
