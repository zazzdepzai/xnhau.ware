Removed references to Next.js and SQLite. Restored Express server entry (server.js) and updated db to use Postgres (Neon/Vercel Postgres). package.json now includes only runtime dependencies required by Express. The application exports the Express app when running under Vercel and listens locally when run directly.

Important notes:
- DATABASE_URL must be set in production (Vercel Postgres / Neon).
- BLOB_READ_WRITE_TOKEN is the static token fallback for Vercel Blob; prefer OIDC by connecting Blob via Vercel dashboard.
- For local development you will need a running Postgres DB and DATABASE_URL set. The repository no longer uses SQLite.

Run locally:
1. npm install
2. cp .env.example .env and set DATABASE_URL and ADMIN_PASSWORD
3. npm start
