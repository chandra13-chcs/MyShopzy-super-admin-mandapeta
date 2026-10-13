import { ChartPanel, KpiCard } from './Analytics'
import type { AnalyticsState, ChartKind } from './Analytics'

type MetricDefinition = {
  label: string
  detail: string
  state: 'unavailable' | 'pending'
}

type ChartDefinition = {
  title: string
  description: string
  kind: ChartKind
  unit: string
  state: AnalyticsState
  message: string
}

type ModuleAnalyticsDefinition = {
  metrics: MetricDefinition[]
  charts: ChartDefinition[]
  hasCategoryFilter?: boolean
}

const apiUnavailable =
  'No verified Super Admin analytics API is connected. No values are shown until an authorized backend data source is available.'
const pendingApproval =
  'This metric depends on business definitions or data models that are not approved or implemented. It must remain unavailable rather than be estimated.'

const definitions: Record<string, ModuleAnalyticsDefinition> = {
  dashboard: {
    metrics: [
      { label: 'Orders placed', detail: 'Requires the authorized platform orders API.', state: 'unavailable' },
      { label: 'Eligible completed revenue', detail: 'Completion event and revenue definitions need approval.', state: 'pending' },
      { label: 'Commissions', detail: 'Commission calculation and refund adjustments need approval.', state: 'pending' },
    ],
    charts: [
      { title: 'Order volume over time', description: 'Orders grouped by the approved reporting period.', kind: 'line', unit: 'orders', state: 'unavailable', message: apiUnavailable },
      { title: 'Order lifecycle mix', description: 'Orders grouped by persisted lifecycle status.', kind: 'donut', unit: 'orders', state: 'unavailable', message: apiUnavailable },
      { title: 'Eligible revenue trend', description: 'Revenue from approved completed-order records only.', kind: 'bar', unit: 'minor units', state: 'pending', message: pendingApproval },
    ],
  },
  partners: {
    metrics: [
      { label: 'Approved partners', detail: 'Requires an authorized platform-wide directory.', state: 'unavailable' },
      { label: 'Pending applications', detail: 'Application records are not modeled.', state: 'pending' },
      { label: 'Active shops', detail: 'Requires an authorized platform-wide directory.', state: 'unavailable' },
    ],
    charts: [
      { title: 'Partner lifecycle', description: 'Partners grouped by persisted lifecycle status.', kind: 'bar', unit: 'partners', state: 'unavailable', message: apiUnavailable },
      { title: 'Partner type mix', description: 'Partner counts by the currently stored type.', kind: 'donut', unit: 'partners', state: 'unavailable', message: apiUnavailable },
    ],
  },
  products: {
    metrics: [
      { label: 'Catalog listings', detail: 'Requires cross-partner catalogue access.', state: 'unavailable' },
      { label: 'Available listings', detail: 'Requires an authorized catalogue API.', state: 'unavailable' },
      { label: 'Global categories', detail: 'The current category model is shop-scoped.', state: 'pending' },
    ],
    charts: [
      { title: 'Listings by availability', description: 'Catalog listings grouped by persisted availability.', kind: 'donut', unit: 'listings', state: 'unavailable', message: apiUnavailable },
      { title: 'Listings by category', description: 'Category comparisons require an approved taxonomy scope.', kind: 'bar', unit: 'listings', state: 'pending', message: pendingApproval },
    ],
    hasCategoryFilter: true,
  },
  orders: {
    metrics: [
      { label: 'Orders placed', detail: 'Requires an authorized platform-wide orders API.', state: 'unavailable' },
      { label: 'Delivered orders', detail: 'Persisted order status; no admin read API exists.', state: 'unavailable' },
      { label: 'Cancelled orders', detail: 'Persisted order status; no admin read API exists.', state: 'unavailable' },
    ],
    charts: [
      { title: 'Orders placed over time', description: 'Order counts grouped by placement date.', kind: 'line', unit: 'orders', state: 'unavailable', message: apiUnavailable },
      { title: 'Order lifecycle', description: 'Orders grouped by their persisted status.', kind: 'donut', unit: 'orders', state: 'unavailable', message: apiUnavailable },
    ],
  },
  riders: {
    metrics: [
      { label: 'Rider accounts', detail: 'Requires an authorized platform-wide directory.', state: 'unavailable' },
      { label: 'Active rider records', detail: 'A basic status field exists; no admin read API exists.', state: 'unavailable' },
      { label: 'Delivery assignments', detail: 'Assignment data is not modeled.', state: 'pending' },
    ],
    charts: [
      { title: 'Rider account status', description: 'Rider records grouped by persisted status.', kind: 'donut', unit: 'riders', state: 'unavailable', message: apiUnavailable },
      { title: 'Delivery assignments over time', description: 'Assignment activity requires an approved delivery data source.', kind: 'line', unit: 'assignments', state: 'pending', message: pendingApproval },
    ],
  },
  customers: {
    metrics: [
      { label: 'Customer accounts', detail: 'Requires an authorized platform-wide directory.', state: 'unavailable' },
      { label: 'New accounts', detail: 'Requires approved reporting dates and an admin API.', state: 'unavailable' },
      { label: 'Customer orders', detail: 'Requires a platform-wide orders API.', state: 'unavailable' },
    ],
    charts: [
      { title: 'Customer account creation', description: 'Customer accounts grouped by creation date.', kind: 'line', unit: 'accounts', state: 'unavailable', message: apiUnavailable },
      { title: 'Customer account status', description: 'Customer accounts grouped by persisted account status.', kind: 'donut', unit: 'accounts', state: 'unavailable', message: apiUnavailable },
    ],
  },
  payments: {
    metrics: [
      { label: 'Verified payments', detail: 'Payment verification data is not modeled.', state: 'pending' },
      { label: 'Refunds', detail: 'Refund records and allocation rules are not implemented.', state: 'pending' },
      { label: 'Commissions', detail: 'Calculation and reversal rules require approval.', state: 'pending' },
    ],
    charts: [
      { title: 'Payment method mix', description: 'Payment-method records are not currently available.', kind: 'donut', unit: 'payments', state: 'pending', message: pendingApproval },
      { title: 'Settlement totals', description: 'Settlement records and commission rules are not implemented.', kind: 'bar', unit: 'minor units', state: 'pending', message: pendingApproval },
    ],
  },
  delivery: {
    metrics: [
      { label: 'Service areas', detail: 'Service-area records are not modeled.', state: 'pending' },
      { label: 'Delivery fee settings', detail: 'Pricing model and scope require client approval.', state: 'pending' },
      { label: 'Order delivery fees', detail: 'Order snapshots exist; eligible revenue rules need approval.', state: 'pending' },
    ],
    charts: [
      { title: 'Service-area coverage', description: 'Coverage areas require an approved service-area data model.', kind: 'bar', unit: 'areas', state: 'pending', message: pendingApproval },
      { title: 'Delivery fees on eligible orders', description: 'Uses approved completed-order eligibility only.', kind: 'line', unit: 'minor units', state: 'pending', message: pendingApproval },
    ],
  },
  notifications: {
    metrics: [
      { label: 'Announcements', detail: 'Announcement records are not modeled.', state: 'pending' },
      { label: 'Delivery attempts', detail: 'Notification delivery history is not modeled.', state: 'pending' },
      { label: 'Delivery success rate', detail: 'No delivery events or approved denominator exist.', state: 'pending' },
    ],
    charts: [
      { title: 'Notification delivery outcomes', description: 'Delivery events and outcome definitions are required.', kind: 'donut', unit: 'notifications', state: 'pending', message: pendingApproval },
      { title: 'Notification volume over time', description: 'Requires persisted notification delivery events.', kind: 'line', unit: 'notifications', state: 'pending', message: pendingApproval },
    ],
  },
  support: {
    metrics: [
      { label: 'Open cases', detail: 'Support ticket records are not modeled.', state: 'pending' },
      { label: 'Escalations', detail: 'Escalation records and workflow are not implemented.', state: 'pending' },
      { label: 'Resolution time', detail: 'Resolution events and calculation rules are not defined.', state: 'pending' },
    ],
    charts: [
      { title: 'Cases by priority', description: 'Support ticket and priority records are not modeled.', kind: 'donut', unit: 'cases', state: 'pending', message: pendingApproval },
      { title: 'Case volume over time', description: 'Requires persisted support case history.', kind: 'line', unit: 'cases', state: 'pending', message: pendingApproval },
    ],
  },
  reports: {
    metrics: [
      { label: 'Available reports', detail: 'Report definitions are not configured.', state: 'pending' },
      { label: 'Saved reports', detail: 'Saved-report storage is not modeled.', state: 'pending' },
      { label: 'Generated reports', detail: 'Report execution history is not modeled.', state: 'pending' },
    ],
    charts: [
      { title: 'Report activity', description: 'Requires report execution history.', kind: 'bar', unit: 'reports', state: 'pending', message: pendingApproval },
      { title: 'Report scope mix', description: 'Requires approved report definitions and usage records.', kind: 'donut', unit: 'reports', state: 'pending', message: pendingApproval },
    ],
  },
  settings: {
    metrics: [
      { label: 'Platform settings', detail: 'A platform settings data model is not present.', state: 'pending' },
      { label: 'Recent changes', detail: 'Configuration history is not modeled.', state: 'pending' },
      { label: 'Pending changes', detail: 'No settings workflow is implemented.', state: 'pending' },
    ],
    charts: [
      { title: 'Changes by setting group', description: 'Requires approved settings and audit history.', kind: 'bar', unit: 'changes', state: 'pending', message: pendingApproval },
      { title: 'Configuration change outcomes', description: 'Requires persisted configuration change events.', kind: 'donut', unit: 'changes', state: 'pending', message: pendingApproval },
    ],
  },
  staff: {
    metrics: [
      { label: 'Admin staff', detail: 'No verified admin identity or directory API exists.', state: 'pending' },
      { label: 'Permission changes', detail: 'Permission mapping and audit records are not modeled.', state: 'pending' },
      { label: 'Audit events', detail: 'Audit-event storage is not present.', state: 'pending' },
    ],
    charts: [
      { title: 'Administrative activity', description: 'Requires approved admin identity and audit records.', kind: 'line', unit: 'events', state: 'pending', message: pendingApproval },
      { title: 'Audit outcomes', description: 'Requires a defined audit-event model and outcome fields.', kind: 'donut', unit: 'events', state: 'pending', message: pendingApproval },
    ],
  },
}

export function ModuleAnalytics({ moduleId, moduleLabel }: { moduleId: string; moduleLabel: string }) {
  const definition = definitions[moduleId]
  if (!definition) return null
  const heading = moduleId === 'dashboard' ? 'Analytics overview' : `${moduleLabel} analytics`

  return (
    <section className="module-analytics" aria-labelledby={`${moduleId}-analytics-title`}>
      <header className="module-analytics-heading">
        <div>
          <span className="analytics-eyebrow">INSIGHTS</span>
          <h2 id={`${moduleId}-analytics-title`}>{heading}</h2>
          <p>Values appear only when verified, authorized backend data is available.</p>
        </div>
        <div className="analytics-filters" aria-label="Analytics filters">
          <button disabled title="A verified analytics API is not connected." type="button">Date range · unavailable</button>
          {definition.hasCategoryFilter && (
            <button disabled title="Category filtering requires an approved taxonomy API." type="button">Category · unavailable</button>
          )}
        </div>
      </header>
      <div className="analytics-kpi-grid">
        {definition.metrics.map((metric) => (
          <KpiCard
            key={metric.label}
            detail={metric.detail}
            label={metric.label}
            state={metric.state}
            value={null}
          />
        ))}
      </div>
      <div className="analytics-chart-grid">
        {definition.charts.map((chart, index) => (
          <ChartPanel
            key={chart.title}
            id={`${moduleId}-chart-${index}`}
            description={chart.description}
            kind={chart.kind}
            message={chart.message}
            state={chart.state}
            title={chart.title}
            unit={chart.unit}
            series={[]}
          />
        ))}
      </div>
      <p className="analytics-integrity-note">
        <span aria-hidden="true">i</span>
        A dash means unavailable, not zero. No demo or estimated values are used.
      </p>
    </section>
  )
}
