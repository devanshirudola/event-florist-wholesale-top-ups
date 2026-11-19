# Event Florist API

The API is a separate Express service. All routes below are prefixed with `/api/v1`. Except for `POST /auth/login` and `GET /health`, routes require an authenticated session. Browser clients must send credentials (`credentials: "include"`).

## Response format

Success responses use `{ "success": true, "data": ... }`. Paginated list responses also include `meta: { page, limit, total, pages }`; page numbering starts at 1 and page size is capped at 100. Errors use `{ "success": false, "error": { "code", "message", "details" } }`.

## Authentication and team

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/login` | Public, rate-limited | Create a secure session |
| POST | `/auth/logout` | Signed in | Revoke the current session |
| GET | `/auth/me` | Signed in | Return the current user |
| GET | `/users` | Administrator | Search/paginate team members |
| POST | `/users` | Administrator | Create a Staff account |

The first Administrator is created by the seed command from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Public self-registration is intentionally not enabled.

## Catalog and inventory

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET, POST | `/categories` | Signed in / Administrator for POST | List or create categories |
| PATCH, DELETE | `/categories/:id` | Administrator | Edit or archive a category |
| GET, POST | `/products` | Signed in / Administrator for POST | Search/filter products or create one |
| GET, PATCH, DELETE | `/products/:id` | Signed in / Administrator for writes | Read, edit, or archive a product |
| GET, POST | `/suppliers` | Signed in / Administrator for POST | Search/paginate suppliers or create one |
| GET, PATCH, DELETE | `/suppliers/:id` | Signed in / Administrator for writes | Read, edit, or archive a supplier |
| GET | `/inventory` | Signed in | Search/paginate current stock |
| GET | `/inventory/low-stock` | Signed in | Products at/below minimum (excludes zero stock) |
| GET | `/inventory/transactions` | Signed in | Immutable stock movement history |
| POST | `/inventory/adjustments` | Administrator or Staff | Apply a non-zero, reasoned stock adjustment |

Product creation accepts supplier-specific prices in `suppliers[]`; purchase orders use those stored prices rather than client-supplied unit costs. `currentStock` may be supplied when opening a product and creates an opening-stock transaction. Stock cannot be changed through product updates.

List routes accept `page`, `limit`, and `search`; products also accept `status` (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`), `active`, and `categoryId`.

## Purchasing and receiving

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| GET, POST | `/purchase-orders` | Signed in | List or create a draft order |
| GET, PATCH | `/purchase-orders/:id` | Signed in | Read an order or edit an owned draft |
| POST | `/purchase-orders/:id/submit` | Signed in | Submit a draft for approval |
| POST | `/purchase-orders/:id/approve` | Administrator | Approve a pending order |
| POST | `/purchase-orders/:id/order` | Administrator | Mark an approved order as ordered |
| POST | `/purchase-orders/:id/cancel` | Administrator | Cancel an eligible order |
| GET | `/receipts` | Signed in | Search/paginate confirmed receipts |
| POST | `/purchase-orders/:id/receive` | Administrator or Staff | Confirm a partial or complete delivery |

Order create/update payloads contain `supplierId`, `items: [{ productId, quantity }]`, optional `tax`, `additionalCharges`, `expectedDeliveryDate`, and `notes`. Prices, line subtotals, and totals are calculated by the API. Receiving takes `items: [{ productId, quantity }]`, optional `notes`, and a unique `Idempotency-Key` header.

## Dashboard and reports

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/dashboard/summary` | Database-backed KPIs and replenishment suggestions |
| GET | `/dashboard/recent-activities` | Recent stock movements and purchase orders |
| GET | `/reports/inventory` | Stock, status, and inventory valuation |
| GET | `/reports/purchases` | Orders and totals, filterable by date, status, supplier |
| GET | `/reports/suppliers` | Supplier order count and purchasing value |

Report/list endpoints accept `page`, `limit`, and `search`; report date filters use ISO dates in `from` and `to`.
