# MyShopzy Super Admin

Desktop-first responsive website shell for the MyShopzy Super Admin workspace, built with React, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

## Checks

```sh
npm run build
npm run lint
```

## Current phase

This phase provides UI layouts for dashboard analytics, partners, products and catalogue, orders, riders and delivery operations, customers, payments and settlements, service areas and delivery rules, notifications, support and disputes, reports, platform settings, and staff permissions/audit.

Navigation, module tabs, global workspace search, and the confirmation-dialog
preview are interactive. The typed read-only client targets paginated orders,
customers, partners, and products, including the dashboard's recent-orders
table. The official Auth0 React SDK uses `VITE_AUTH0_DOMAIN`,
`VITE_AUTH0_CLIENT_ID`, and `VITE_AUTH0_AUDIENCE`; the API base is configured by
`VITE_SUPER_ADMIN_API_BASE_URL`. The callback and logout return URL use the
current frontend origin. The API client sends the Auth0 access token as a
Bearer token. Backend routes remain unavailable until its issuer, audience,
frontend origin, database, and configured namespaced admin-user-ID claim are
configured. The backend verifies JWT signature and claims, then requires the
claim to map to an active `system_role='admin'` user in PostgreSQL. The Auth0
Post-Login Action must emit only a manually provisioned user ID from protected
`app_metadata`; no role or user is created by the application. Metrics, forms,
exports, and sensitive actions remain unavailable.

Module overviews include reusable KPI and chart layouts. The SVG chart components support line/area, comparison-bar, and donut visualizations, but no production series is supplied until verified, authorized APIs exist. A dash means unavailable, not zero; financial metrics that depend on unresolved business rules remain pending. Date and category filters stay disabled until supported by an approved backend contract.
