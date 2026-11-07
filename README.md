# Event Florist Wholesale Top-Ups

A frontend-only internal workspace for floral inventory, supplier management, wholesale purchasing, goods receiving, and reports.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create a production build with `npm run build`, then serve it with `npm start`.

## Prototype notes

- Sample data and user role simulation are stored in browser `localStorage`.
- Purchase orders, stock adjustments, and receipts run locally in the browser; there is no API or database connection.
- Administrator and Staff roles demonstrate UI affordances only and are not security controls.
- The data model and local store are isolated in `src/types` and `src/services` to support a future REST API adapter.
- The public landing page and login/register forms are demo-only. Registration saves a local profile, but passwords are never saved and login is not real authentication.
