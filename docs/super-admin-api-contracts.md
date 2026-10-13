# MyShopzy Super Admin API Contracts — Phase 1

**Status:** Planning only. Every endpoint below is **PROPOSED — NOT IMPLEMENTED**.
Examples are illustrative contract examples, not live data or a claim that an
API exists. This document does not authorize implementation, authentication
changes, or schema changes.

## 1. Existing evidence and capability status

The Super Admin UI has workspace areas for Dashboard & analytics, Products &
catalogue, and Partners & onboarding. Their current actions and records are
presentation-only; record search, filters, exports, and writes are disabled
while the admin API is unavailable. See `src\App.tsx` (`modules`,
`ModuleWorkspace`, `RecordsPanel`, and `WorkspaceForm`).

Backend inspection was limited to source and migration documentation. No `.env`
was read, no PostgreSQL connection was made, and live migration status is
unverified. The backend README says the listed migrations have not been
applied.

### Verified existing support

| Capability | Classification | Evidence / limit |
|---|---|---|
| Public shop and catalogue reads | **Existing and verified** for public reads; **Partially supported** for Super Admin oversight | `GET /api/v1/shops`, `GET /api/v1/shops/:shopId/categories`, `GET /api/v1/products`, and `GET /api/v1/products/:productId` in [`catalog/routes.js`](../../myshopzy/myshopzy_backend/src/modules/catalog/routes.js). These are customer-facing, not admin endpoints. |
| Product/category storage | **Existing and verified** as shop-scoped data; **Partially supported** for platform moderation | `app.products` and `app.categories` in [`001_initial_multi_partner_schema.sql`](../../myshopzy/myshopzy_backend/database/migrations/001_initial_multi_partner_schema.sql). Categories are shop/partner-scoped, not global. Products contain one SKU, price, nullable stock quantity, `is_available`, `status` (`active`/`archived`), and JSON `attributes`; no live variant or moderation tables are defined. Order items do have a `variant_snapshot` JSON field, which is historical snapshot data rather than a product-variant model. |
| Partner/shop records | **Existing and verified** as base records; **Partially supported** for onboarding | `app.partners`, `app.partner_memberships`, and `app.shops` in the initial migration. Partner and shop status fields exist, but no application/document records or admin workflow endpoints were found. |
| Dashboard source records | **Partially supported** | `app.orders` and `app.order_items` provide order timestamps, statuses and monetary totals; orders also have delivery fee and discount fields. Customer, partner, rider, shop, product and category tables exist. These records may support selected aggregates, but no admin analytics endpoints or approved metric definitions exist. |
| Proposed admin endpoints | **Missing** | No Super Admin routes were registered in the inspected backend route modules. |
| Admin identity and permission enforcement | **Requires authentication/authorization approval** | No production admin-role authorization was found. `system_role='admin'` in the schema is not evidence of request authorization. |
| Global category ownership/uniqueness rules | **Requires a business decision**; supporting global API/model is **Missing** | Current categories are scoped to a shop/partner. |
| Product moderation states/transitions and featured placement policy | **Requires a business decision**; endpoints/state/history are **Missing** | Current active/archive and availability fields do not define moderation or featured behavior. |
| Partner application/document model and lifecycle/status propagation | **Requires a business decision**; endpoints/application documents are **Missing** | Existing partner/shop status columns do not define approval, rejection, or activation effects. |
| Dashboard metric definitions, currency and bucket boundaries | **Requires a business decision**; aggregate endpoints are **Missing** | Source records exist for only selected aggregates; commission calculation/storage and payment verification have no evidenced schema. |
| Audit-event storage | **Missing**; event fields/retention require a business decision | No audit-event table/API was found in the inspected migrations/routes. |
| Live database state | **Cannot be verified safely** | No database access was performed. README documents migrations as unapplied; confirm actual deployment state through the approved operational process before implementation. |

## 2. Proposed API conventions

These conventions are **proposals pending approval**. All routes in this document
use `/api/v1/admin/` to distinguish future Super Admin routes from existing
customer/public routes.

### Success envelope

The proposed success envelope for detail responses is:

```json
{
  "data": {},
  "meta": { "requestId": "illustrative-request-id" }
}
```

For list responses, `data` is an array and `meta.pagination` contains
`limit`, `offset`, and `total`, with `meta.requestId` alongside it:

```json
{
  "data": [],
  "meta": {
    "pagination": { "limit": 25, "offset": 0, "total": 0 },
    "requestId": "illustrative-request-id"
  }
}
```

Request IDs above are placeholders. An isolated, unmounted backend adapter
maps prepared query results to these envelopes when given an explicit request
ID matching `^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$` (1–64 ASCII characters); it
does not generate request IDs or register routes. The adapter validates format,
not provenance, and does not reflect missing or malformed IDs. Request-ID
middleware is future implementation, not existing functionality. The future
server middleware must generate a bounded, format-validated ID if no value is
supplied by an explicitly trusted source, and must ensure a valid request ID
is available to all success and error responses. Arbitrary client-provided
IDs must not be trusted automatically. If a reverse proxy is used, document
the exact trusted header and the reason that proxy is trusted; no header or
proxy policy has been selected here. Request IDs must not be used to log
authentication tokens, passwords, OTPs, or other secrets. List pagination
fields must be non-negative safe integers.

The proposed error envelope is:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid."
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

The error request ID is also illustrative. The prepared read-only query
service returns list results as `{ data, pagination }` and detail records or
`null`; the isolated, unmounted adapter wraps these values and maps typed
validation errors to `400`, known database unavailability to `503`, null
details to `404`, and unexpected errors to sanitized `500` responses. The
service does not generate request IDs, and the adapter requires an explicit
request ID from its caller. No routes are registered and no HTTP request-ID
middleware is implemented.

No typed domain-conflict error currently exists in the read-only query module.
Mapping conflicts to `409` is deferred; arbitrary errors, including errors
with a `409` status or conflict-like code, remain sanitized `500` responses.

The frontend prefers error request IDs from `meta.requestId`. For compatibility
with older response bodies only, it also accepts `error.requestId` when the
standard `meta.requestId` is absent. New responses must use `meta.requestId`.

Proposed list parameters: `limit` (default 25, maximum 100), `offset` (default
0), `sort` as an allow-listed `field:asc|desc` value, `q` for trimmed
case-insensitive search, exact-match filters by documented field, and
`from`/`to` as RFC 3339 instants for generic time filtering. Invalid or
unsupported filters/sort fields return `400`; silently ignoring an invalid
filter is not proposed.

### Proposed HTTP status mapping

Proposed status categories: `400` validation/malformed requests; `401`
unauthenticated requests; `403` forbidden requests; `404` missing or
not-visible records; `409` conflicts; `503` unavailable services; and `500`
unexpected server errors. `422` may be used for semantically invalid
operations if adopted consistently. Error responses must not include SQL,
stack traces, secrets, or protected data. Route exposure and request-ID
middleware remain future implementation and must be aligned with backend
conventions.

### Common state handling

- **Loading:** show a loading state while the request is pending; do not
  display old data as current for changed filters.
- **Empty:** successful list with `data: []` and `total: 0` is a valid empty
  state, distinct from API unavailable.
- **Validation/conflict:** retain the form and field values, show field-level
  validation or a conflict message, and do not show success.
- **Unauthorized/forbidden:** show the approved session/permission response;
  never treat either as empty data.
- **Server/dependency error:** show a retryable error with request ID where
  available; do not silently fall back to demo/live-looking data.

## 3. Dashboard & Analytics

### Purpose and permitted actions

Read-only, platform-wide aggregate summaries and trends for authorized
Super Admin viewers. No dashboard write or export behavior is enabled by this
plan. Proposed permissions: `admin.analytics.read`; permission name and role
mapping require authentication/authorization approval.

### Proposed endpoints

#### Summary

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/analytics/summary`

Query: required `from`, `to` RFC 3339 instants; optional `timezone` (default
proposal `Asia/Kolkata`). Require `from < to`; use a half-open interval
`[from, to)` to avoid overlapping adjacent periods.

Fields requested: order count and cancellations; gross/completed revenue;
delivery fees; commissions; active customers, partners, and riders. Example:

```json
{
  "data": {
    "period": {
      "from": "2026-10-01T00:00:00+05:30",
      "to": "2026-11-01T00:00:00+05:30",
      "timezone": "Asia/Kolkata"
    },
    "currency": null,
    "orders": { "placed": null, "cancelled": null },
    "revenueMinor": null,
    "deliveryFeesMinor": null,
    "commissionsMinor": null,
    "activeCustomers": null,
    "activePartners": null,
    "activeRiders": null
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

Nulls in this example mean **not specified / not yet supported**, not zero.

#### Sales trend

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/analytics/sales-trends`

Query: required `from`, `to`; optional `timezone`, `granularity` (`day`,
`week`, `month` proposal), and `metric` (allow-listed after metric definitions
are approved). Each bucket should carry an explicit start instant and currency.
Bucket-boundary and partial-period rules require approval.

```json
{
  "data": {
    "currency": null,
    "granularity": "day",
    "buckets": [
      {
        "startsAt": "2026-10-01T00:00:00+05:30",
        "orders": null,
        "revenueMinor": null,
        "deliveryFeesMinor": null
      }
    ]
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

#### Top products

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/analytics/top-products`

Query: required `from`, `to`; optional `timezone`, `limit` (proposal default
10, max 100), and ordering metric (`quantity` or sales amount only after
definition approval). `orders`, `order_items`, and their product snapshot
fields provide a possible source for ordered-product aggregates; whether
cancelled/rejected orders count and how deleted/archived products are labelled
are unresolved. This endpoint is blocked until those rules are approved.

Illustrative response:

```json
{
  "data": [
    {
      "productId": "illustrative-product-id",
      "productName": "Illustrative product",
      "quantity": null,
      "salesMinor": null,
      "currency": null
    }
  ],
  "meta": {
    "requestId": "illustrative-request-id",
    "pagination": { "limit": 10, "offset": 0, "total": null }
  }
}
```

All values above are illustrative and nulls are not zeros.

### Data, definitions, and audit

Potentially available fields include `orders.status`, `placed_at`,
`currency`, `items_subtotal_minor`, `delivery_fee_minor`, `discount_minor`,
`total_minor`; `order_items.quantity`, `line_total_minor`, product name/SKU
snapshots; active/suspended user status; partner/shop status; and basic rider
status. These are schema fields only, not a verified analytics contract.
Commissions do not have a source table. Payment verification is not modelled.

Dashboard reads should create no business mutation audit event; security access
logging policy is a separate approval. Metric computation and currency
normalization are unresolved.

### Decisions required

- Define revenue: placed vs completed orders, discounts/refunds, cancellations,
  delivery fees, and treatment of COD/unverified payments.
- Define commission source/storage and whether the metric is unavailable until
  commission data exists; commission rates and calculation rules are specified
  in section 6 but are not implemented by this document.
- Define active customer/partner/rider criteria and whether counts are
  current-state or period-end snapshots.
- Select supported currencies and conversion policy; schema defaults currency
  to INR but does not establish a global reporting conversion rule.
- Approve timezone/date parsing, inclusive UI date selection to half-open
  instants, week start, partial buckets, and retention limits.
- Approve whether top products uses quantities, gross item sales, completed
  sales, and the treatment of cancellations/refunds.

## 4. Products & Catalogue — Platform Oversight & Moderation

### Purpose and permitted actions

Platform-level catalogue visibility, global taxonomy policy, moderation,
featured placement, and narrowly scoped exceptional corrections. The
Partner Console remains responsible for each partner's routine product
details, prices, photos, variants, stock, and availability. Proposed
permissions: `admin.catalog.read`, `admin.catalog.categories.manage`,
`admin.catalog.moderate`, `admin.catalog.feature`, and a separately approved
`admin.catalog.exceptional-correction`. All permission names are proposals
requiring authentication/authorization approval.

Existing `app.categories` rows are scoped to a shop and partner; no global
category model is evidenced. Existing product status (`active`/`archived`) and
`is_available` are not an established moderation or featured state.
Variant rows, product image records, featured state, moderation reason/history,
and inventory history are not present in the inspected migrations.

### Proposed endpoints and UI mapping

#### Cross-partner listing search

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/catalog/products`

**PROPOSED — NOT IMPLEMENTED; external Product contract naming/exposure remains
pending approval.** The following distinguishes the prepared query capability
from a deployed or approved HTTP API. The prepared query service returns flat
partner/shop/category references (`partnerId`/`partnerName`,
`shopId`/`shopName`, and `categoryId`/`categoryName`) and uses `createdAt`.

Its list and detail projections include `id`, `name`, partner/shop/category
references and joined names, `sku`, `priceMinor`, `currency`,
`inventoryQuantity`, `isAvailable`, `status`, `listingStatus`, and
`createdAt`; detail additionally includes `updatedAt`. The stored Product
status is constrained by the schema to `active|archived`; `listingStatus` is
currently a direct SQL alias of that same value, not a moderation state.
Product description and raw `attributes` JSON are excluded from the prepared
projection.

The prepared service accepts Product filters `partnerId`, `shopId`,
`categoryId`, `availability`, `listingStatus`, `createdFrom`, and `createdTo`.
It maps `listingStatus` to the persisted `status` field and maps
`createdFrom`/`createdTo` to the existing `from`/`to` predicates; the existing
query names remain accepted, and supplying both names for the same filter is
rejected. Prepared sort keys are `name`, `priceMinor`, `status`,
`listingStatus`, `createdAt`, and `productId`. These are current unmounted
query-service behaviors, not registered HTTP endpoint behavior or approval of
those names for external exposure. Product moderation/featured filters,
variant fields, and image fields are not part of this projection.

The migration makes `price_minor`, `currency`, and `is_available` non-null;
`currency` is constrained to three uppercase characters, while `is_available`
has a default of true. The prepared projection selects `priceMinor` and
`currency` and returns `isAvailable` as a boolean. Its schema also allows
nullable category, SKU, and inventory values; joined partner and shop names
are non-null under the query’s inner joins. `priceMinor` is represented as a
decimal string in the prepared frontend type. These facts describe the
existing schema/projection only: they do not approve exposing these fields in
an authorized external response. Category references are shop/partner-scoped.

The proposed external response remains subject to approval for Product field
and filter names, exposure, and `listingStatus` terminology. Description
exposure remains pending explicit approval. No new status values or meanings
are implied. Illustrative example:

```json
{
  "data": [
    {
      "id": "illustrative-product-id",
      "name": "Illustrative product",
      "partnerId": "illustrative-partner-id",
      "partnerName": "Illustrative partner",
      "shopId": "illustrative-shop-id",
      "shopName": "Illustrative shop",
      "categoryId": null,
      "categoryName": null,
      "sku": null,
      "priceMinor": "12345",
      "currency": "INR",
      "inventoryQuantity": null,
      "isAvailable": true,
      "status": "active",
      "listingStatus": "active",
      "createdAt": null
    }
  ],
  "meta": {
    "requestId": "illustrative-request-id",
    "pagination": { "limit": 25, "offset": 0, "total": 1 }
  }
}
```

All values are illustrative, not live product data. The prepared query
projection includes both `status` and `listingStatus`; `listingStatus` is only
a direct alias of the persisted value, and `isAvailable` corresponds to
`is_available`, not a moderation or featured decision. Nullable category, SKU,
and inventory values may be null; non-null schema fields are not modeled as
null in this example.

#### Product detail/review

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/catalog/products/{productId}`

Returns a cross-partner product detail with the approved persisted fields and
partner/shop context. Moderation history and attachments are excluded unless
their models are implemented and approved. The current migrations do not
define image or moderation-history tables; do not fabricate these response
fields.

Illustrative response, limited to possible existing product fields:

```json
{
  "data": {
    "id": "illustrative-product-id",
    "name": "Illustrative product",
    "partnerId": "illustrative-partner-id",
    "partnerName": "Illustrative partner",
    "shopId": "illustrative-shop-id",
    "shopName": "Illustrative shop",
    "categoryId": null,
    "categoryName": null,
    "sku": null,
    "priceMinor": "12345",
    "currency": "INR",
    "inventoryQuantity": null,
    "isAvailable": true,
    "status": "active",
    "listingStatus": "active",
    "createdAt": null,
    "updatedAt": null
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

The detail fields and names follow the proposed canonical flat list shape
above. Product `description` is pending explicit approval and is excluded
from the proposed response until approved. Unrestricted raw `attributes` JSON
is excluded from initial Product detail; no structured attribute fields are
currently approved or specified. Any future structured fields require a
separately reviewed allow-list and must not be inferred from raw JSON.

All values are illustrative; optional moderation/image/history fields are not
implied by this response.

#### Global category management

- **PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/catalog/categories`
  with `q`, `isActive`, `parentCategoryId`, pagination, and sort.
- **PROPOSED — NOT IMPLEMENTED** `POST /api/v1/admin/catalog/categories`
- **PROPOSED — NOT IMPLEMENTED** `PATCH /api/v1/admin/catalog/categories/{categoryId}`

Illustrative create request:

```json
{
  "name": "Illustrative platform category",
  "slug": "illustrative-platform-category",
  "parentCategoryId": null,
  "sortOrder": 0
}
```

Illustrative success:

```json
{
  "data": {
    "id": "illustrative-category-id",
    "name": "Illustrative platform category",
    "slug": "illustrative-platform-category",
    "parentCategoryId": null,
    "sortOrder": 0,
    "isActive": true
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

The existing per-shop category model cannot satisfy a global taxonomy contract
without an approved data-model decision and likely schema work.

Illustrative category update request:

```json
{
  "name": "Illustrative renamed category",
  "sortOrder": 10,
  "isActive": false
}
```

Illustrative `PATCH` response:

```json
{
  "data": {
    "id": "illustrative-category-id",
    "name": "Illustrative renamed category",
    "slug": "illustrative-platform-category",
    "parentCategoryId": null,
    "sortOrder": 10,
    "isActive": false
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

Deactivation is preferred to hard deletion while products or child categories
may reference a category. Global-vs-shop taxonomy, slug uniqueness, parent
rules, and whether `isActive` is sufficient for platform visibility require
business approval.

Illustrative category-list response:

```json
{
  "data": [
    {
      "id": "illustrative-category-id",
      "name": "Illustrative category",
      "slug": "illustrative-category",
      "parentCategoryId": null,
      "sortOrder": 0,
      "isActive": true
    }
  ],
  "meta": {
    "requestId": "illustrative-request-id",
    "pagination": { "limit": 25, "offset": 0, "total": null }
  }
}
```

#### Moderation

**PROPOSED — NOT IMPLEMENTED** `POST /api/v1/admin/catalog/products/{productId}/moderation`

Illustrative request:

```json
{
  "decision": "suspend",
  "reason": "Illustrative reason required for review"
}
```

Illustrative response:

```json
{
  "data": {
    "productId": "illustrative-product-id",
    "previousState": null,
    "newState": "suspended",
    "reason": "Illustrative reason required for review",
    "changedAt": "2026-10-12T00:00:00Z"
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

Allowed decisions and transitions (`approve`, `reject`, `suspend`, `restore`)
must be approved. Distinguish moderation state from partner-controlled
availability and archival state. Require a non-empty reason for rejection,
suspension, restoration, and override. Stale state returns `409`; invalid
transition returns `422`.

#### Featured products

**PROPOSED — NOT IMPLEMENTED** `PUT /api/v1/admin/catalog/products/{productId}/featured`

Illustrative request:

```json
{
  "featured": true,
  "reason": "Illustrative campaign reason"
}
```

Illustrative response:

```json
{
  "data": {
    "productId": "illustrative-product-id",
    "featured": true,
    "effectiveAt": "2026-10-12T00:00:00Z",
    "reason": "Illustrative campaign reason"
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

Featured storage, scheduling, placement/slot, partner notification, and
conflict policy are unresolved; do not add a featured toggle until they are
approved.

#### Exceptional corrections

**PROPOSED — NOT IMPLEMENTED** `PATCH /api/v1/admin/catalog/products/{productId}/exceptional-correction`

Not a general product-edit API. Example request:

```json
{
  "field": "name",
  "newValue": "Illustrative corrected name",
  "reason": "Illustrative verified correction reason"
}
```

Return previous/new values, actor ID from the trusted authenticated context,
timestamp, reason, and audit event ID. Field allow-list, approval/dual-control
requirements, and which corrections are permitted require explicit approval.
Price, photos, variants, stock, and day-to-day availability stay with the
Partner Console unless a separately approved exceptional workflow says
otherwise.

Illustrative response:

```json
{
  "data": {
    "productId": "illustrative-product-id",
    "field": "name",
    "previousValue": "Illustrative previous name",
    "newValue": "Illustrative corrected name",
    "reason": "Illustrative verified correction reason",
    "actorId": "illustrative-actor-id",
    "changedAt": "2026-10-12T00:00:00Z",
    "auditEventId": "illustrative-audit-event-id"
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

### Required audit events and unresolved decisions

Audit category creation/update/deactivation, moderation decisions, featured
changes, and exceptional corrections with actor, timestamp, reason, resource,
and previous/new state. The current schema has no audit-event table/API.
Category ownership/global taxonomy, moderation state/transitions, featured
placements, documents/images, concurrency/versioning, and exceptional
correction policy require business decisions and schema/API approval.

## 5. Partners & Onboarding

### Purpose and permitted actions

Search and review applications; inspect partner/shop status and any verified
service-area information; approve/reject with a reason; and perform explicitly
approved activation/suspension transitions. Proposed permissions:
`admin.partners.read`, `admin.partners.review`, and `admin.partners.status.manage`.
These are proposals; do not use them until an approved identity source and
server-side authorization policy exist.

Current schema has partner name/type/status/legal name/contact fields,
operating details, memberships, and shop name/status/address/operating details.
It contains no application entity, submitted document metadata/files,
review history, service-area table, or admin workflow API. Partner and shop
status columns exist but do not by themselves define transition policy.

### Proposed endpoints and UI mapping

#### Application search/list

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/partners/applications`

Query: `q`, `partnerType`, `applicationStatus`, `createdFrom`, `createdTo`,
`limit`, `offset`, and allow-listed sort (proposal default `createdAt:desc`).
Service-area filter is blocked until service-area data is modelled.

Illustrative success:

```json
{
  "data": [
    {
      "id": "illustrative-partner-id",
      "name": "Illustrative partner",
      "partnerType": "other",
      "status": "pending",
      "legalName": null,
      "contactEmail": null,
      "contactPhone": null,
      "submittedAt": null,
      "documents": []
    }
  ],
  "meta": {
    "requestId": "illustrative-request-id",
    "pagination": { "limit": 25, "offset": 0, "total": null }
  }
}
```

`submittedAt` and `documents` are not current verified schema fields. They
must remain absent or explicitly unavailable until their storage and access
rules are approved.

#### Application/partner detail

**PROPOSED — NOT IMPLEMENTED** `GET /api/v1/admin/partners/{partnerId}`

Return persisted partner fields, linked shops and statuses, membership summary
only as allowed, and documents/service areas only if approved models exist.
Do not expose document content through an unscoped or public URL; access policy,
storage, retention, and malware scanning are unresolved.

Illustrative response:

```json
{
  "data": {
    "id": "illustrative-partner-id",
    "name": "Illustrative partner",
    "partnerType": "other",
    "status": "pending",
    "legalName": null,
    "contactEmail": null,
    "contactPhone": null,
    "shops": [],
    "documents": null,
    "serviceAreas": null
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

The null/empty fields are illustrative; no live record is implied. `documents`
and `serviceAreas` must be omitted or represented as unavailable until their
models and permissions are approved.

#### Approve or reject application

**PROPOSED — NOT IMPLEMENTED** `POST /api/v1/admin/partners/{partnerId}/review`

Illustrative request:

```json
{
  "decision": "reject",
  "reason": "Illustrative decision reason"
}
```

Illustrative response:

```json
{
  "data": {
    "partnerId": "illustrative-partner-id",
    "previousStatus": "pending",
    "newStatus": "rejected",
    "reason": "Illustrative decision reason",
    "changedAt": "2026-10-12T00:00:00Z"
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

Allowed decisions, required review fields, resubmission/re-review policy, and
effects on associated shops/memberships require approval. Rejection reason is
required in this proposal. Existing `partners.status` includes `pending`,
`approved`, `suspended`, `rejected`; no transition semantics are verified.

#### Activate or suspend

**PROPOSED — NOT IMPLEMENTED** `POST /api/v1/admin/partners/{partnerId}/status-transitions`

Illustrative request:

```json
{
  "action": "suspend",
  "reason": "Illustrative operational reason",
  "expectedCurrentStatus": "approved"
}
```

Illustrative response:

```json
{
  "data": {
    "partnerId": "illustrative-partner-id",
    "previousStatus": "approved",
    "newStatus": "suspended",
    "reason": "Illustrative operational reason",
    "changedAt": "2026-10-12T00:00:00Z"
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

The explicit expected-state field is proposed for optimistic concurrency.
Invalid/stale transitions return `409` or `422` under the approved error
mapping. This example does not define whether partner suspension also suspends
shops, memberships, listings, or order fulfilment; those effects need business
approval. Actor identity must come from trusted server auth, never the request
body.

### Required audit events and unresolved decisions

Record application review and every activation/suspension action with
authenticated actor, timestamp, reason, previous/new status, resource, and
request/audit correlation ID. Do not accept actor IDs from clients. The current
schema has no review/audit history table/API.

Decide whether a pending `app.partners` row is the application or a separate
application record; required onboarding fields/documents; service-area model;
approval/rejection transitions; partner-to-shop status propagation; effects on
orders/listings/memberships; re-review policy; and approval/dual-control
requirements.

## 6. Commission & Delivery Fee Business Rules

These are confirmed business requirements, not implemented capabilities or
proposed API contracts. No endpoint, storage model, payment/refund workflow, or
database field is defined here.

### Partner commission rates

| Partner category | Commission rate |
|---|---:|
| Restaurants | 10% |
| Frozen | 10% |
| Meat | 10% |
| Grocery | 5% |
| Bakery & Sweets | 10% |

### Commission calculation

- Calculate commission only on the eligible item subtotal of completed orders.
- Exclude delivery fees, taxes, and discounts from the commission base.
- Cancelled orders have zero commission.
- Refunds on completed orders must support commission adjustments. The
  adjustment mechanism is not specified by this contract.

### Delivery fee control

- Only Super Admin may configure or adjust delivery fees. Partners must not be
  able to create or modify delivery-fee settings.
- The backend must calculate delivery fees using approved Super Admin settings.
- A change to delivery-fee settings must not silently change existing orders;
  preserve the delivery-fee snapshot recorded for each order.

These business rules do not establish that any commission calculation,
commission adjustment, or delivery-fee control is implemented.

## 7. UI-to-contract mapping

| Existing Super Admin screen/action | Proposed API support |
|---|---|
| Dashboard overview / unavailable metric cards | `GET /admin/analytics/summary` |
| Dashboard Order trends / Marketplace overview | `GET /admin/analytics/sales-trends` |
| Dashboard product ranking (not currently connected) | `GET /admin/analytics/top-products`, only after aggregation rules are approved |
| Products & catalogue → Product catalogue, list search and filters | `GET /admin/catalog/products`; product detail uses proposed product detail GET |
| Products & catalogue → Categories | Proposed category list/create/update/deactivate endpoints, blocked on global-vs-shop category decision |
| Products & catalogue → product review/moderation | Proposed product detail and moderation endpoints |
| Products & catalogue → featured products | Proposed featured endpoint, blocked on placement/state decisions |
| Products & catalogue → exceptional correction | Proposed exceptional-correction endpoint, blocked on allow-list and permission approval |
| Partners & onboarding → Partner directory / Onboarding applications | `GET /admin/partners/applications` |
| Partners & onboarding → Approval review | Partner detail GET plus review POST |
| Partners & onboarding → Activation & suspension | Partner status-transition POST |
| All list pagination/filter controls | Proposed common `limit`, `offset`, `sort`, and documented filters; current UI controls are disabled placeholders |
| Forms and buttons | Proposed write endpoints above; current UI forms/buttons remain unavailable and must not claim success |

## 8. Cross-cutting implementation blockers

1. **Authentication/authorization approval is a hard prerequisite.** The
   production identity provider/middleware is not finalized. Do not invent a
   token, provider, role mapping, or client-side permission substitute. Every
   proposed admin endpoint needs server-enforced permission checks. This
   planning document does not authorize auth implementation.
2. **Tenant isolation must remain server-side.** Existing schema README states
   RLS is not enabled and partner APIs must not be exposed until authenticated
   identity and application authorization exist. Super Admin cross-partner
   access itself needs an explicit privileged permission and audit policy.
3. **Audit storage is missing.** Approve an audit schema/retention/access
   contract before review, moderation, featured, category, status, or
   exceptional-correction writes are implemented.
4. **Schema support is incomplete.** Global categories, moderation history,
   featured state, onboarding applications/documents, service areas, and
   audit events are not evidenced in the inspected migrations. Product
   variants/images and inventory history are also not modelled.
5. **Data freshness and consistency need definition.** Set list snapshot,
   aggregation, concurrency, and status propagation behavior before enabling
   actions.

No endpoint in this document should be wired into the UI until its contract,
business decisions, schema needs, authentication/authorization, and tests are
approved.
