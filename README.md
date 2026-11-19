# Event Florist Wholesale Top-Ups

An internal workspace for floral inventory, suppliers, wholesale purchasing, goods receiving, and operational reports. The existing Next.js frontend remains at the repository root; the production-oriented Express/MongoDB API is in `backend/`.

## Run locally

Requirements: Node.js 20+ and MongoDB running as a replica set (transactions are used for inventory and receipt writes).

1. Copy `backend/.env.example` to `backend/.env`. Set a unique `SESSION_SECRET` (at least 32 characters), `MONGODB_URI`, and the first administrator's name, email, and password.
2. Install and create the initial administrator account (the seed command does not add catalog or activity records):

   ```bash
   npm install --prefix backend
   npm run seed --prefix backend
   npm run dev --prefix backend
   ```

3. In a separate terminal, run the existing frontend:

   ```bash
   Copy-Item .env.local.example .env.local
   npm install
   npm run dev
   ```

   For a deployed frontend, set `NEXT_PUBLIC_API_URL` to the deployed Express API base URL ending in `/api/v1`; configure the API's `FRONTEND_ORIGIN` to the exact frontend origin.

The frontend is served at [http://localhost:3000](http://localhost:3000); the API is served at [http://localhost:4000/api/v1](http://localhost:4000/api/v1). Set `NEXT_PUBLIC_API_URL` in `.env.local` to the API base URL (see `.env.local.example`). The frontend uses the API's cookie session and credentials are sent with requests. Postman is useful for exercising the same endpoints during development; the browser calls the Express API directly.

## Backend commands

```bash
npm run build --prefix backend
npm test --prefix backend
npm start --prefix backend
```

See [docs/API.md](./docs/API.md) for routes and response formats and [docs/DATABASE.md](./docs/DATABASE.md) for collections, indexes, and MongoDB transaction requirements.

## Security and operations

- Login and public Staff registration use bcrypt password hashes and rate limiting. Sessions are stored in MongoDB and sent in an HTTP-only cookie.
- Administrator and Staff permissions are checked in API middleware and services; frontend button visibility is not an authorization control.
- Never commit `backend/.env` or use the example credentials outside local development.
- Purchase-order prices are copied from the supplier-specific product price on the server. Stock changes are written as immutable inventory transactions.
- Receiving requires an `Idempotency-Key` header and commits the receipt, purchase-order quantities, stock updates, and inventory transactions atomically.
