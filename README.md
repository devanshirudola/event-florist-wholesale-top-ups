# Event Florist Wholesale Top-Ups

An internal workspace for floral inventory, suppliers, wholesale purchasing, goods receiving, and operational reports. The existing Next.js frontend remains at the repository root; the production-oriented Express/MongoDB API is in `backend/`.

## Run locally

Requirements: Node.js 20+ and MongoDB running as a replica set (transactions are used for inventory and receipt writes).

1. Copy `backend/.env.example` to `backend/.env`. Set a unique `SESSION_SECRET` (at least 32 characters), `MONGODB_URI`, and the first administrator's name, email, and password.
2. Install and seed the API:

   ```bash
   npm install --prefix backend
   npm run seed --prefix backend
   npm run dev --prefix backend
   ```

3. In a separate terminal, run the existing frontend:

   ```bash
   npm install
   npm run dev
   ```

The frontend is served at [http://localhost:3000](http://localhost:3000); the API is served at [http://localhost:4000/api/v1](http://localhost:4000/api/v1). The frontend prototype has not been switched from its local-storage adapter to this API.

Frontend checks: `npm run lint`, `npm run typecheck`, and `npm run build`.

## Deploy to Vercel

The repository is set up for two Vercel projects with no build settings to change:

1. **Frontend** — import the repository as-is; Vercel detects the Next.js app at the root.
2. **API** — create a second project from the same repository with **Root Directory** set to `backend`. Vercel detects the Express app exported from `src/app.ts` and serves every route (`/health`, `/api/v1/...`) from a single serverless function with the original request paths — no `api/` folder or `vercel.json` required.

Environment variables for the API project:

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Transaction-capable cluster (e.g. MongoDB Atlas) |
| `SESSION_SECRET` | Yes | Random string of at least 32 characters |
| `FRONTEND_ORIGIN` | Yes | Comma-separated trusted origins, e.g. `https://my-app.vercel.app,http://localhost:3000` |
| `SESSION_COOKIE_SAMESITE` | No | `strict` (default), `lax`, or `none` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Seeding only | Used by `npm run seed`, not by the running API |

- When the frontend and API share a registrable domain (both on `*.vercel.app`, or proxied under one custom domain), the default `strict` session cookie works. On separate domains set `SESSION_COOKIE_SAMESITE=none`; browsers accept that only together with a `Secure` cookie, which the API enables automatically in production.
- Seed the production database once with `npm run seed --prefix backend` using the same `MONGODB_URI` and `ADMIN_*` values; the serverless entry point does not create the first administrator.
- Long-running hosts (Render, Railway, Docker) keep using `npm run build --prefix backend && npm run start --prefix backend`.
- Serverless limitation: login rate limiting counts per function instance, not globally.

## Backend commands

```bash
npm run build --prefix backend
npm run typecheck --prefix backend
npm test --prefix backend
npm start --prefix backend
```

See [docs/API.md](./docs/API.md) for routes and response formats and [docs/DATABASE.md](./docs/DATABASE.md) for collections, indexes, and MongoDB transaction requirements.

## Security and operations

- Login uses bcrypt password hashes and rate limiting. Sessions are stored in MongoDB and sent in an HTTP-only, same-site cookie.
- Administrator and Staff permissions are checked in API middleware and services; frontend button visibility is not an authorization control.
- Never commit `backend/.env` or use the example credentials outside local development.
- Purchase-order prices are copied from the supplier-specific product price on the server. Stock changes are written as immutable inventory transactions.
- Receiving requires an `Idempotency-Key` header and commits the receipt, purchase-order quantities, stock updates, and inventory transactions atomically.
