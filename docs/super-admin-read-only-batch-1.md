# Super Admin Read-only Batch 1 — Prepared Contracts

**Status: prepared for review; not client-approved, not registered, and not
available as a production API.** These shapes are limited to fields present in
the reviewed migrations. No route is mounted by this batch. Do not expose any
route until the final authentication/authorization phase approves identity,
permissions, cross-tenant access, and error/request-correlation behavior.

This document supplements, but does not change, the proposed catalogue and
partner-onboarding workflows in
[super-admin-api-contracts.md](./super-admin-api-contracts.md). In particular,
`partners` here is a directory of existing partner records, not an onboarding
application list.

## Shared list contract

All route paths below are proposed:

- List: `GET /api/v1/admin/{resource}`
- Detail: `GET /api/v1/admin/{resource}/{id}`
- Product paths use `/api/v1/admin/catalog/products` and its `/{id}` detail.

List query fields are `limit` (default 25, maximum 100), `offset` (default 0),
`q` (trimmed search), and resource-specific filters/sort values listed below.
Unsupported or repeated parameters, invalid values, and sort keys are proposed
to return HTTP 400; values are parameterized in SQL and sort expressions are
selected from a server-side allow-list. Date filters use valid RFC 3339
timestamps and a half-open `[from, to)` range.

### Proposed HTTP response envelope

The prepared query service is not an HTTP handler. Its list result is
`{ data, pagination }`; detail results are a record (or `null` when not found),
and it does not create request IDs. An isolated, unmounted adapter maps these
service values to the following proposed success shapes when supplied an
explicit request ID:

```json
{
  "data": [],
  "meta": {
    "pagination": { "limit": 25, "offset": 0, "total": 0 },
    "requestId": "illustrative-request-id"
  }
}
```

```json
{
  "data": {},
  "meta": { "requestId": "illustrative-request-id" }
}
```

The request ID shown is illustrative. The isolated adapter accepts only
1–64 ASCII characters matching `^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$`; missing,
malformed, or untrusted IDs are not reflected in a response. The adapter
validates a supplied ID but cannot establish its provenance. Future server
middleware must generate an ID when one is not supplied by an explicitly
trusted source and ensure a valid ID is available for every success and error
response. Arbitrary client-supplied IDs must not be trusted automatically.
If deployment uses a reverse proxy, its exact trusted request-ID header and
trust rationale must be documented and accepted; no proxy/header choice is
established here. Middleware must enforce a bounded validated format and must
not log authentication tokens, passwords, OTPs, or other secrets. Request-ID
generation, trusted-source policy, and HTTP middleware are future
implementation, not existing functionality. Empty lists use `data: []` and
`meta.pagination.total: 0`, not an unavailable response.

The proposed HTTP error shape is:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "The request is invalid."
  },
  "meta": { "requestId": "illustrative-request-id" }
}
```

The isolated adapter is not mounted and does not expose routes. The query
service propagates database errors and does not implement this envelope.
Request-ID middleware remains future implementation. The adapter validates
list pagination fields as non-negative safe integers and maps typed validation
errors to `400`, known database unavailability to `503`, unexpected errors to
a sanitized `500`, and null detail results to `404`. A `409` conflict mapping
is deferred until an explicit typed domain-conflict error exists; arbitrary
errors remain sanitized `500` responses. Other proposed status categories are
`401`
for unauthenticated requests, `403` for forbidden requests, `404` for missing
or not-visible records, `409` for conflicts, `503` for unavailable services,
and `500` for unexpected server errors. Exact status mapping and generic
messages remain subject to backend conventions. Errors must not expose SQL,
stack traces, or protected data.

## Orders

**Source:** `app.orders`, `app.order_items`, `app.customers`, `app.users`,
`app.partners`, and `app.shops` in migration 001.

`GET /api/v1/admin/orders` proposes filters `status`, `partnerId`,
`customerId`, `from`, and `to`; search across order ID, customer display name,
and partner name. Status is restricted to the persisted values
`placed|confirmed|preparing|ready_for_pickup|picked_up|delivered|cancelled|rejected`.
Sort allow-list: `placedAt`, `totalMinor`, `status`, `orderId`.

List fields: `id`, `customerId`, `customerName`, `partnerId`, `partnerName`,
`shopId`, `shopName`, `status`, `currency`, `itemsSubtotalMinor`,
`deliveryFeeMinor`, `discountMinor`, `totalMinor`, and `placedAt`.
`GET /api/v1/admin/orders/{id}` returns the same persisted order fields plus
`items[]` with `productId`, `productName`, `sku`, `unitPriceMinor`, `quantity`,
`lineTotalMinor`, and `currency`.

Delivery-address snapshots and customer contact fields are intentionally
excluded from this preparation because their administrative exposure policy
has not been approved. This contract does not interpret order statuses as
commission eligibility or calculate revenue, commissions, refunds, or delivery
fees. The customer UUID and name fields may appear only in the proposed
authorized Super Admin view and remain subject to the final access-control
phase described in the Customers section below.

## Customers

**Source:** `app.customers` and `app.users` in migration 001.

`GET /api/v1/admin/customers` proposes filters `status`, `from`, and `to`;
search across customer UUID and display name. Status is `active|suspended`.
Sort allow-list: `displayName`, `createdAt`, `status`, `customerId`.

List and detail fields are limited to `id`, `displayName`, `status`, and
`createdAt`. The query must join `app.customers` and require
`users.system_role='customer'`. The agreed “Joined Date” meaning is user
account creation time, so `createdAt` must come from `app.users.created_at`;
do not use `app.customers.created_at` for this field. The customer UUID and
display name may appear only in this proposed authorized Super Admin view and
remain subject to the final access-control phase. This is not approval for
public or unauthenticated exposure. The initial Customers list excludes phone,
email, address, and all other contact details, as well as order history and
account controls.

## Partners

**Source:** `app.partners` in migration 001. Shops are joined only for detail.

`GET /api/v1/admin/partners` proposes filters `partnerType`, `status`, `from`,
and `to`; search across partner UUID and name. Partner type is
`restaurant|grocery|meat_shop|other`; status is
`pending|approved|suspended|rejected`. Sort allow-list: `name`, `partnerType`,
`status`, `createdAt`, `partnerId`.

List fields: `id`, `name`, `partnerType`, `status`, and `createdAt`. Detail
returns those fields plus `shops[]` with `id`, `name`, `status`, and
`createdAt`. Contact/legal fields, memberships, submitted documents, service
areas, application review, and status transitions are excluded. The existing
`GET /api/v1/admin/partners/applications` proposal in the main contract remains
blocked because no application model is present.

## Products

**Source:** `app.products`, `app.partners`, `app.shops`, and
`app.categories` in migration 001.

**Routes remain PROPOSED — NOT IMPLEMENTED.** The following describes the
current prepared query-service projection and accepted query inputs only; it
does not approve or deploy an HTTP contract. Partner/shop/category references
use `partnerId`/`partnerName`, `shopId`/`shopName`, and
`categoryId`/`categoryName`.

The prepared list projection returns `id`, `name`, partner/shop/category
references and joined names, nullable `sku`, `priceMinor`, `currency`,
nullable `inventoryQuantity`, non-null `isAvailable`, stored `status`,
`listingStatus` (an alias of the same stored status), and `createdAt`. Detail
returns those fields plus `updatedAt`. Stored `products.status` is constrained
to `active|archived`; the query exposes these same values under both `status`
and `listingStatus`. This alias is a query implementation detail, not a
moderation or approval state. Product description and raw `attributes` JSON
are not selected.

The prepared query service accepts Product filters `partnerId`, `shopId`,
`categoryId`, `availability`, `listingStatus`, `createdFrom`, and `createdTo`.
It maps `listingStatus` to stored `status`, and `createdFrom`/`createdTo` to
the existing `from`/`to` date predicates. Existing `status`, `from`, and `to`
query keys also remain accepted; supplying an alias and its corresponding
existing key together is rejected. Supported sort keys are `name`,
`priceMinor`, `status`, `listingStatus`, `createdAt`, and `productId`, with
`asc|desc` directions. These are prepared query capabilities only, not
registered endpoint behavior or an approved external naming convention.

Schema constraints and projection establish that `categoryId`, `categoryName`,
`sku`, and `inventoryQuantity` may be null; `isAvailable` is non-null. Product
price and currency are selected by the prepared query, and the schema makes
`price_minor` and `currency` non-null (`currency` is three uppercase
characters). The frontend’s prepared-read type represents `priceMinor` as a
decimal string. The query’s joined partner and shop names are non-null because
those are inner joins. These projection facts do not approve external exposure:
product values and cross-partner references remain limited to a future
authorized view. Example values must not be treated as live data.

Product description exposure and canonical external Product field/filter
names remain pending explicit approval. Do not invent additional status
meanings or moderation/featured filters. Unrestricted raw `attributes` JSON
remains excluded; no structured attribute fields are approved. Category joins
must match product shop and partner because categories are contextual, not
platform-global.

This contract does not add variants, images, moderation/featured fields,
inventory history, or category mutations. Product pricing/stock/availability
writes remain out of scope.

## Security and implementation gate

The backend module added in this batch only prepares SQL/service functions and
tests. It is not mounted in `src/app.js`; the proposed `/api/v1/admin/*`
endpoints must continue to return the existing not-found response until
server-enforced authorization, approved permissions, and applicable privacy
and audit requirements are implemented. Customer IDs and display names in
the proposed view are subject to this gate. Do not use the public catalog or
customer-scoped `/me` endpoints as substitutes for these contracts.

The Super Admin frontend's `VITE_SUPER_ADMIN_API_BASE_URL` configures a future
authorized API host. No credentials or tokens are sent by the client.
