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

Set `NODE_ENV=production`, `MONGODB_URI`, a strong random `SESSION_SECRET`, `FRONTEND_ORIGIN` (one trusted HTTPS origin), and first-admin credentials before the initial seed. Terminate TLS at the hosting platform, configure its single trusted proxy hop, and keep the API and frontend on HTTPS so session cookies remain secure. Run `npm run build --prefix backend`, then `npm start --prefix backend`.
