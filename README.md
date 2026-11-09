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

## Backend commands

```bash
npm run build --prefix backend
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
