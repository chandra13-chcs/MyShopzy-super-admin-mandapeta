# MyShopzy Super Admin Business-Decision Checklist

**Purpose:** Client approval checklist for dynamic departments/categories,
partner onboarding, commission, discounts, and delivery fees. This document is
a planning artifact only. It does not define implemented behavior or authorize
schema/API changes. Repository evidence below is not evidence of live
PostgreSQL migration state.

Status labels:

- **CONFIRMED** — stated business requirement or verified repository fact.
- **PROPOSED** — a design option for review, not approved behavior.
- **CLIENT DECISION REQUIRED** — unresolved choice that must be approved before
  implementation.

## 1. Commission-eligible order completion

**Status:** **CONFIRMED** that commission applies only to eligible completed
orders and cancelled orders have zero commission. **CLIENT DECISION REQUIRED**
to define which order event constitutes completion.

- **Current evidence:** The confirmed rule uses “completed orders.” Existing
  `app.orders.status` has `delivered`, `cancelled`, and `rejected`, but no
  `completed` status. See [the confirmed commission rules](./super-admin-api-contracts.md#commission--delivery-fee-business-rules)
  and [the existing order schema](../../myshopzy/myshopzy_backend/database/migrations/001_initial_multi_partner_schema.sql).
- **Exact question:** Does `delivered` make an order commission-eligible, or
  must a separate completion confirmation/event occur?
- **Options and consequences:**
  - Treat `delivered` as completion: reuses an existing status, but requires
    clear ownership of delivery confirmation and handling for disputed or
    failed deliveries.
  - Introduce a distinct completion event/state: separates delivery from
    financial eligibility, but adds a lifecycle transition and responsible
    actor/process.
  - Use another explicitly defined event: requires a reliable event source,
    persistence, and a policy for missing or late events.
- **Approval required:** Select the completion event, the actor/system allowed
  to set it, and how reversals or corrections are handled.

## 2. Partial and full refund allocation and commission reversals

**Status:** **CONFIRMED** that refunds on completed orders require commission
adjustments. **CLIENT DECISION REQUIRED** for refund allocation, finality, and
reversal calculation.

- **Current evidence:** Refunds and payment integration are not represented in
  the reviewed migrations; no refund table or refund endpoint was found. The
  current order schema has no refund-specific amount or status.
- **Exact question:** How is a refund allocated to commission-eligible items,
  and at what refund state should the commission adjustment be recorded?
- **Options and consequences:**
  - Item-level allocation: most directly ties refunded items to the original
    commission base, but requires return/refund amounts by item.
  - Proportional allocation from an order-level refund: supports refunds
    without item detail, but requires an approved allocation formula and
    rounding policy.
  - Exclude non-item refund components from commission adjustment: requires
    delivery/tax/other components to be identified separately.
  - Adjust only when a refund reaches an approved final state: avoids
    provisional reversals, but delays commission changes and requires defining
    finality.
- **Approval required:** Decide itemized versus proportional allocation,
  eligible refund components, partial/full refund treatment, the final refund
  state, and correction/retry behavior. No allocation method is assumed here.

## 3. Delivery-fee model and applicable scope

**Status:** **CONFIRMED** that only Super Admin controls delivery-fee settings,
the backend calculates fees from approved settings, and existing orders retain
their recorded fee. **CLIENT DECISION REQUIRED** for calculation model and
scope.

- **Current evidence:** `app.orders.delivery_fee_minor` stores an order-level
  amount. There is no delivery-fee settings table in the reviewed migrations;
  current checkout uses zero. See [the order schema](../../myshopzy/myshopzy_backend/database/migrations/001_initial_multi_partner_schema.sql)
  and [the confirmed delivery-fee rules](./super-admin-api-contracts.md#commission--delivery-fee-business-rules).
- **Exact question:** What inputs determine the fee and which orders,
  locations, shops, and currencies does each setting cover?
- **Options and consequences:**
  - Flat fee: simplest to administer, but cannot vary by location or order
    characteristics.
  - Zone/location-based fee: supports geographic variation, but needs approved
    zones and reliable order-to-zone assignment.
  - Distance-based fee: supports distance variation, but needs trusted
    distance inputs and boundary rules.
  - Conditional or combined rules: more flexible, but needs rule priority,
    conflict handling, and more complex validation.
- **Approval required:** Choose the model, scope, supported currencies,
  effective-time behavior, and any minimum/maximum or exception handling.
  Preserve the order's recorded fee; settings changes must not rewrite it.

## 4. Mapping existing partners to dynamic categories

**Status:** **CONFIRMED** that initial category commission defaults are
Restaurants 10%, Frozen 10%, Meat 10%, Grocery 5%, and Bakery & Sweets 10%.
**CLIENT DECISION REQUIRED** for mapping current partner records.

- **Current evidence:** Existing `app.partners.partner_type` allows
  `restaurant`, `grocery`, `meat_shop`, and `other`. It has no explicit Frozen
  or Bakery & Sweets values. Existing `app.categories` is shop-scoped product
  taxonomy, not global partner classification. See [the partner schema](../../myshopzy/myshopzy_backend/database/migrations/001_initial_multi_partner_schema.sql)
  and [the confirmed rates](./super-admin-api-contracts.md#partner-commission-rates).
- **Exact question:** Which new department/category should each existing
  partner receive, including each partner currently classified as `other`?
- **Options and consequences:**
  - Individually reviewed mapping: avoids unsupported assumptions, but requires
    business review and a disposition for ambiguous records.
  - Leave ambiguous partners unassigned: avoids misclassification, but client
    must decide whether those partners can onboard, take orders, or accrue
    commission before assignment.
  - Bulk mapping from legacy type: reduces manual work only where an explicit
    mapping is approved; applying it to ambiguous types risks wrong rates.
- **Approval required:** Provide an approved mapping or a partner-by-partner
  review process. Do not infer Frozen or Bakery & Sweets from `other`, or treat
  shop product categories as partner categories without approval.

## 5. Effect of category-rate changes on existing partners

**Status:** **CONFIRMED** that historical orders must retain the original
commission rate and calculation inputs. **CLIENT DECISION REQUIRED** for
prospective partner terms after a category default changes.

- **Current evidence:** The confirmed rules specify initial rates and
  order-time preservation. The current schema has no commission-rate history or
  partner commission terms.
- **Exact question:** When a category's default rate changes, should existing
  partners inherit it automatically for future orders, or only after an
  explicit partner-term update?
- **Options and consequences:**
  - Automatic prospective inheritance: keeps terms aligned with the category,
    but needs a defined effective time and notice/audit process.
  - Explicit effective-dated term update: gives controlled rollout, but
    existing partners retain their prior term until updated.
  - Automatic inheritance only for partners without a separately approved
    term: supports exceptions, but requires explicit precedence and clear
    display of the effective rate.
- **Approval required:** Select the prospective update policy and effective
  date rules. Any choice must preserve order-time commission snapshots and
  must not recalculate historical orders.

## 6. Partner-specific commission overrides

**Status:** **CONFIRMED** that the five listed rates are category defaults.
**PROPOSED** that any partner override be validated, permission-controlled,
effective-dated, and audited. **CLIENT DECISION REQUIRED** on whether overrides
are allowed and what approvals they require.

- **Current evidence:** No partner override, commission-term, or audit-history
  schema exists in the reviewed migrations. The documented business rules do
  not require overrides.
- **Exact question:** Are partner-specific overrides permitted; if so, who can
  request and approve them, and what limits and duration apply?
- **Options and consequences:**
  - Do not allow overrides: preserves a uniform category default, but cannot
    represent individually negotiated partner terms.
  - Allow one authorized approver: adds flexibility, but requires approved
    permission boundaries, reason capture, validation, effective dates, and
    audit history.
  - Require distinct requester and approver: adds separation of duties, but
    adds workflow and operational overhead.
- **Approval required:** Decide override availability, valid rate range,
  duration, allowed effective dates, reason requirements, approver roles, and
  whether dual approval is mandatory. Until approved, no override behavior
  should be assumed.

## 7. Tax, currency, rounding, and historical-order cutover

**Status:** **CONFIRMED** that delivery fees, taxes, and discounts are excluded
from the commission base. **CLIENT DECISION REQUIRED** for tax representation,
currency scope, rounding, and pre-snapshot orders.

- **Current evidence:** `app.orders` stores currency, item subtotal, delivery
  fee, discount, and total, but has no tax column; its total constraint is
  subtotal plus fee minus discount. The currency defaults to INR but permits
  any three-letter code. See [the order schema](../../myshopzy/myshopzy_backend/database/migrations/001_initial_multi_partner_schema.sql).
- **Exact questions:**
  1. Does the stored item subtotal exclude tax, or can tax be embedded in item
     prices?
  2. Which currencies may commission-bearing orders use, and are the category
     rates the same in each?
  3. What precision and rounding method apply to commission and adjustments?
  4. How should orders created before commission snapshots and effective terms
     exist be treated?
- **Options and consequences:**
  - Confirm item subtotal is tax-exclusive, or define persisted tax components
    so they can be excluded. Without this, the tax-exclusion rule cannot be
    reliably tested where prices include tax.
  - Restrict initial commission processing to approved currencies, or support
    multiple currencies with separate amounts and no implicit conversion.
  - Round once per order or per item: these can produce different totals and
    refund reversals, so one consistent rule must be selected.
  - For older orders, exclude them from commission, reconstruct only where
    approved historical inputs are available, or start at a defined cutoff.
    Reconstruction may be impossible if the historical category/rate was not
    recorded.
- **Approval required:** Confirm tax/subtotal semantics, currencies, rounding
  method, precision, and cutoff/backfill policy. Do not infer historical rates
  from current category settings.

## 8. Platform-funded versus partner-funded discounts

**Status:** **CONFIRMED** that discounts are excluded from the commission base.
**CLIENT DECISION REQUIRED** on discount funding attribution and whether the
client explicitly approves any change to the confirmed commission rule.

- **Current evidence:** The confirmed commission rule excludes discounts,
  without distinguishing who funds them. Existing `app.orders.discount_minor`
  is a single amount and does not identify platform-funded versus
  partner-funded portions. See [the confirmed calculation rule](./super-admin-api-contracts.md#commission-calculation)
  and [the order schema](../../myshopzy/myshopzy_backend/database/migrations/001_initial_multi_partner_schema.sql).
- **Exact question:** Should discount funding be recorded as platform-funded,
  partner-funded, or split; and should the existing discount-exclusion rule
  remain unchanged for every funding source?
- **Options and consequences:**
  - Keep all discounts excluded from commission regardless of funding source:
    consistent with the confirmed rule; funding attribution can still be
    recorded separately for accounting/reporting if approved.
  - Record separate platform- and partner-funded portions while keeping both
    excluded: improves reconciliation without changing the commission base,
    but requires funding attribution in checkout/order data.
  - Apply a different commission treatment by funding source: changes the
    confirmed rule and must not be implemented unless the client explicitly
    approves a revised rule and its calculation examples.
- **Approval required:** Confirm funding attribution needs and whether the
  current rule remains universal. **Unless the client explicitly approves a
  different rule, discounts remain excluded from the commission base.**

## Cross-cutting implementation gate

All items marked **CLIENT DECISION REQUIRED** need written approval before
implementation. The existing migrations do not implement dynamic partner
departments/categories, commission calculation/refunds, or delivery-fee
settings; repository evidence does not establish live migration state.
Authentication and authorization remain deferred to the final phase. No
privileged API should be exposed before its server-enforced controls are
approved and implemented.
