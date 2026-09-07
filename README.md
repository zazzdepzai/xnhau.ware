Updated README to remove VERCEL_BLOB_TOKEN and recommend BLOB_READ_WRITE_TOKEN or OIDC. Also updated .env.example and package.json to include @vercel/blob dependency.

Note: Upload code will attempt to use @vercel/blob if available and BLOB_READ_WRITE_TOKEN is set, otherwise it falls back to saving files in public/uploads for local dev.
