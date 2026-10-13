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
preview are interactive. The read-only client is configured by
`VITE_SUPER_ADMIN_API_BASE_URL` and targets paginated orders, customers,
partners, and products, including the dashboard's recent-orders table. It
shows loading, empty, error, and unavailable states without fallback data.
Admin authentication has not yet been implemented, so the backend intentionally
does not mount these routes and no protected records are exposed. Metrics,
forms, exports, and sensitive actions remain unavailable.

Module overviews include reusable KPI and chart layouts. The SVG chart components support line/area, comparison-bar, and donut visualizations, but no production series is supplied until verified, authorized APIs exist. A dash means unavailable, not zero; financial metrics that depend on unresolved business rules remain pending. Date and category filters stay disabled until supported by an approved backend contract.
