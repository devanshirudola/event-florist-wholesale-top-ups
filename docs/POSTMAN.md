# Connecting Atlas and testing with Postman

The Express API connects directly to MongoDB Atlas using `MONGODB_URI`. Postman is an HTTP client for the API; it does not connect to Atlas directly.

## Configure Atlas

1. In `backend/.env`, set `MONGODB_URI` to the Atlas connection string and include a database name in the path (the local configuration uses `event_florist`).
2. In Atlas, allow the development machine's IP in Network Access and ensure the database user has read/write permissions for the project database.
3. Keep the connection string in the ignored `backend/.env` only; never commit it or put it in a Postman environment or request.
4. Verify the connection and database permissions:

   ```bash
   npm run db:check --prefix backend
   ```

The command pings Atlas and ensures the application indexes exist. Atlas supports the multi-document transactions used by goods receiving.

## Prepare API authentication

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` in `backend/.env`, then initialize the administrator and sample catalog:

```bash
npm run seed --prefix backend
npm run dev --prefix backend
```

The seed command is idempotent and only creates missing initial records. Use a unique admin password; do not store it in this collection.

## Use the Postman collection

Import `postman/Event Florist Backend.postman_collection.json` into Postman. Set the collection variables `adminEmail` and `adminPassword`, then send **Authentication → Log in**. Postman retains the session cookie for subsequent requests to `localhost:4000`.

The collection includes dashboard, catalog, inventory and purchasing examples. Fill `productId`, `supplierId`, and `purchaseOrderId` with IDs returned by the API before using the adjustment, order, or receipt examples. The receipt request includes an idempotency key.
