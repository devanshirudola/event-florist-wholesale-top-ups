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

The frontend is served at [http://localhost:3000](http://localhost:3000) and reads and writes workspace data through `/api/v1`. During ordinary local Next.js development, requests to `/api` are proxied to the API at port 4000. Sign in with the administrator account configured for the seed command, or create a Staff account from `/register`. New accounts can sign in immediately; administrator approval is not required.

## Deploy to Vercel

The root [`vercel.json`](./vercel.json) deploys the Next.js app and Express API as two Vercel services. Route `/api/*` to the backend; all other paths go to the app. The app calls the API through the same public domain, so there is no server-to-server binding in this setup. The backend CORS allowlist includes Vercel deployment and project domains for preview and production.

In Vercel, select **Services** as the project framework, then configure these backend environment variables for each environment: `MONGODB_URI`, `SESSION_SECRET`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Use a unique session secret with at least 32 characters. `FRONTEND_ORIGIN` defaults to localhost for local development; Vercel deployment domains are allowed from Vercel's runtime-provided domain variables. Keep database credentials and session secrets out of the repository.

Frontend checks: `npm run lint`, `npm run typecheck`, and `npm run build`.

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
