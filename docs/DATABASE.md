# Database and deployment notes

The API uses Mongoose and MongoDB. Configure `MONGODB_URI` in `backend/.env`; never commit credentials.

## Collections

- `users`: normalized unique email, bcrypt `passwordHash`, role, active state.
- `categories`: unique category names and archive state.
- `products`: unique SKU, category reference, stock thresholds, average cost, and preferred supplier.
- `suppliers`: supplier/contact data and archive state.
- `productsuppliers`: supplier-specific SKU, unit cost, lead time, and preferred-link flag; a product/supplier pair is unique.
- `purchaseorders`: lifecycle status and immutable product/SKU/unit-cost snapshots per line.
- `inventorytransactions`: previous/change/new quantities, reason, reference, actor, and timestamp. The API never edits or deletes transaction records.
- `goodsreceipts`: confirmed receipt lines, order/supplier references, receiving user, and unique idempotency key.
- `counters`: atomic order and receipt number sequences.
- `sessions`: server-side Express sessions.

Products and suppliers are archived by setting `isActive` false so historical purchase and receipt references remain valid. Purchase order lines copy product identity and supplier unit cost at order time.

## Transactions and indexes

Receipt confirmation updates order line quantities, product stock, inventory transactions, and the goods receipt in one MongoDB transaction. Manual adjustments likewise commit the stock update and audit record together. Run MongoDB as a replica set (including local development) or use a transaction-capable managed cluster.

Unique indexes cover user email, product SKU, category name, product/supplier pairs, order numbers, receipt numbers, and receipt idempotency keys. Additional indexes support category/active product lists, inventory activity history, and supplier/status/date purchase-order queries.

## Deployment

### Long-running servers

Set `NODE_ENV=production`, `MONGODB_URI`, a strong random `SESSION_SECRET` (at least 32 characters), `FRONTEND_ORIGIN`, and first-admin credentials before the initial seed. `FRONTEND_ORIGIN` accepts one or more trusted browser origins separated by commas (for example `https://my-app.example.com,http://localhost:3000`); requests from other origins are rejected with `403 ORIGIN_NOT_ALLOWED`. Terminate TLS at the hosting platform, configure its single trusted proxy hop, and keep the API and frontend on HTTPS so session cookies remain secure. Run `npm run build --prefix backend`, then `npm start --prefix backend`. Startup creates the first administrator from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` and refuses to start when no administrator exists.

### Vercel

- Create one project for the frontend from the repository root (Next.js is auto-detected) and a second project for the API with **Root Directory** set to `backend`. Vercel detects the default-exported Express app in `src/app.ts` and serves all routes (`/health`, `/api/v1/...`) from a single serverless function with their original paths — no `vercel.json` or `api/` directory is needed.
- Configure `MONGODB_URI`, `SESSION_SECRET`, `FRONTEND_ORIGIN`, and optionally `SESSION_COOKIE_SAMESITE` as project environment variables. Use a transaction-capable cluster such as MongoDB Atlas; receipt and adjustment writes require transactions.
- Sessions live in the `sessions` collection, so sign-ins survive function instance recycling.
- Seed once against the production database with `npm run seed --prefix backend` using the same `MONGODB_URI` and `ADMIN_*` values; the serverless entry point does not create the first administrator.
- `SESSION_COOKIE_SAMESITE` (`strict` by default, or `lax`/`none`) is sent with the session cookie. `strict` and `lax` work while the frontend and API share a registrable domain (for example both on `*.vercel.app`); separate domains require `none`, which browsers accept only alongside the `Secure` flag the API sets automatically in production.
- Login rate limiting is in-memory, so each serverless instance keeps its own counter.
