Updated project to add Vercel serverless API routes, DB abstraction (Postgres fallback to SQLite), and Vercel config.

Run locally:
1. npm install
2. cp .env.example .env and edit as needed
3. npm start (runs express server for local dev) OR use `vercel dev` with `npm run dev`

Production on Vercel: set DATABASE_URL (Vercel Postgres) and optionally VERCEL_BLOB_* env vars.
