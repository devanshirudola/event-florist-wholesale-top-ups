# Event Florist API

The API is a separate Express service. All routes below are prefixed with `/api/v1`. Except for `POST /auth/login` and `GET /health`, routes require an authenticated session. Browser clients must send credentials (`credentials: "include"`).

## Response format

Success responses use `{ "success": true, "data": ... }`. Paginated list responses also include `meta: { page, limit, total, pages }`; page numbering starts at 1, `limit` is capped at 100 (default 20), and `page` at 10,000 — out-of-range values return `400 VALIDATION_ERROR`. Errors use `{ "success": false, "error": { "code", "message", "details" } }`.

## Lists, search, and updates

Every list route accepts `page`, `limit`, and `search` (up to 120 characters; regular-expression metacharacters are escaped). Search matches:

| Route | Search matches |
| --- | --- |
| `/products` | name, SKU, description |
| `/categories` | name |
| `/suppliers` | name, company, contact person, email |
| `/inventory` | product name, SKU |
| `/inventory/transactions` | reason |
| `/purchase-orders` | order number |
| `/receipts` | receipt number, line item product name |
| `/users` | name, email |
| `/reports/purchases` | order number, supplier name |
| `/reports/suppliers` | supplier name, company, email |

`PATCH` on categories, suppliers, and products is a **partial update**: send only the fields to change and omitted fields keep their current values (patching a product's `sellingPrice` does not reset `minimumStock`, `targetStock`, or `description`). Unknown or malformed fields are rejected with `400 VALIDATION_ERROR`. `PATCH /purchase-orders/:id` instead replaces the whole editable draft payload — see below.

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

Products accept `status` (`IN_STOCK`, `LOW_STOCK`, `OUT_OF_STOCK`), `active` (`true` or `false`; defaults to `true`, so archived products are excluded unless requested), and `categoryId`. `/inventory` accepts the same `status` values. `/purchase-orders` and `/reports/purchases` accept `status` (`DRAFT`, `PENDING`, `APPROVED`, `ORDERED`, `PARTIALLY_RECEIVED`, `RECEIVED`, `CANCELLED`), `supplierId`, and ISO `from`/`to` dates (the `to` date is inclusive). `/receipts` accepts `purchaseOrderId`, and `/inventory/transactions` accepts `productId`. Invalid filter values return `400 VALIDATION_ERROR`.

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

Order create/update payloads contain `supplierId`, `items: [{ productId, quantity }]`, optional `tax`, `additionalCharges`, `expectedDeliveryDate`, and `notes`. Prices, line subtotals, and totals are calculated by the API. A draft `PATCH` replaces the complete payload: omitted `tax`, `additionalCharges`, and `notes` fall back to `0`/empty, and omitting `expectedDeliveryDate` clears it.

Receiving takes `items: [{ productId, quantity }]`, optional `notes`, and an `Idempotency-Key` header:

- The key is required (`400 IDEMPOTENCY_KEY_REQUIRED`), must be 8–128 characters without whitespace (`400 IDEMPOTENCY_KEY_INVALID`), and is globally unique — reusing a key on a different order returns `409 IDEMPOTENCY_KEY_REUSED`.
- The first confirmation returns `201` with `{ receipt, replayed: false }` and commits stock, order quantities, and inventory transactions atomically.
- Retrying with the same key and order returns `200` with the original receipt and `replayed: true`, without changing stock again.
- Receiving quantities beyond what was ordered returns `409`, as does an order that is not `ORDERED` or `PARTIALLY_RECEIVED` (`409 ORDER_NOT_RECEIVABLE`).

## Dashboard and reports

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/dashboard/summary` | Database-backed KPIs and replenishment suggestions |
| GET | `/dashboard/recent-activities` | Recent stock movements and purchase orders |
| GET | `/reports/inventory` | Stock, status, and inventory valuation |
| GET | `/reports/purchases` | Orders and totals, filterable by date, status, supplier |
| GET | `/reports/suppliers` | Supplier order count and purchasing value |

Report/list endpoints accept `page`, `limit`, and `search`; report date filters use ISO dates in `from` and `to`.

## Error codes

Representative codes beyond validation and not-found cases:

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR`, `INVALID_REQUEST_BODY`, `PAYLOAD_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE` | Invalid input, malformed JSON, body over 1 MB, wrong content type |
| 401 | `UNAUTHENTICATED` | Missing, expired, or unusable session |
| 403 | `FORBIDDEN`, `ORIGIN_NOT_ALLOWED` | Insufficient role; browser origin not listed in `FRONTEND_ORIGIN` |
| 404 | `ROUTE_NOT_FOUND`, `*_NOT_FOUND` | Unknown route or record |
| 409 | `DUPLICATE_RESOURCE`, `INSUFFICIENT_STOCK`, `STOCK_CHANGED`, `ORDER_CHANGED`, `ORDER_NOT_DRAFT`, `ORDER_NOT_RECEIVABLE`, `IDEMPOTENCY_KEY_REUSED` | Uniqueness conflicts and optimistic-concurrency guards |
| 429 | `LOGIN_RATE_LIMITED` | More than 10 sign-in attempts per 15 minutes (per API instance) |
| 500 | `INTERNAL_ERROR` | Unexpected failure, logged server-side |
| 503 | `DATABASE_UNAVAILABLE` | MongoDB unreachable; retry the request once the connection recovers |
