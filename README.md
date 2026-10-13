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

Navigation, module tabs, global workspace search, and the confirmation-dialog preview are interactive. Operational data, metrics, filters, pagination, forms, exports, and sensitive actions are not connected or represented as successful. They are visibly unavailable until verified backend APIs and authorization are approved. The site does not connect to an API, backend, or authentication service.

Module overviews include reusable KPI and chart layouts. The SVG chart components support line/area, comparison-bar, and donut visualizations, but no production series is supplied until verified, authorized APIs exist. A dash means unavailable, not zero; financial metrics that depend on unresolved business rules remain pending. Date and category filters stay disabled until supported by an approved backend contract.
