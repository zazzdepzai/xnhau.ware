# xnhau.cc

Personal video sharing web app (Node.js + Express + Postgres)

Quick start

1. Install dependencies

   npm install

2. Create a Postgres database and set environment variables. Example .env (create `.env` locally or set env vars directly):

   PORT=3000
   DATABASE_URL=postgres://user:pass@host:5432/dbname
   SESSION_SECRET=some-random-secret
   ADMIN_PASSWORD=your-admin-password
   BLOB_READ_WRITE_TOKEN=
   VERCEL_BLOB_BUCKET=

3. Start the app

   npm start

4. Open:

   http://localhost:3000/admin  — admin login
   http://localhost:3000/       — homepage (if provided)
   http://localhost:3000/v/:token — video page

Notes

- If `ADMIN_PASSWORD` is provided and no admin hash exists in the database, the app will auto-seed a bcrypt hash into the `profiles` table under key `admin_hash`. You can later change it directly in DB.
- The app requires `DATABASE_URL` for all DB-backed endpoints. The `/api/health` endpoint works without DB.
- To seed admin manually, generate a bcrypt hash:

  node -e "console.log(require('bcryptjs').hashSync('your-admin-password', 10))"

  then insert into Postgres:

  INSERT INTO profiles(key,value) VALUES('admin_hash','<hash>') ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;

