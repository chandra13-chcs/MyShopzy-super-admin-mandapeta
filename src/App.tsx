import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { TableColumn } from './components/DataTable'
import { superAdminApi } from './api/client'
import { AdminRecordsPanel } from './components/AdminRecordsPanel'
import { DuesPage } from './components/DuesPage'
import { ModuleAnalytics } from './components/ModuleAnalytics'
import { AuthControls } from './auth/AuthControls'
import './App.css'

type IconName =
  | 'grid'
  | 'store'
  | 'box'
  | 'cart'
  | 'bike'
  | 'users'
  | 'wallet'
  | 'pin'
  | 'bell'
  | 'help'
  | 'chart'
  | 'settings'
  | 'shield'
  | 'search'
  | 'chevron'
  | 'arrow'
  | 'download'
  | 'filter'
  | 'clock'
  | 'lock'
  | 'more'
  | 'close'
  | 'check'
  | 'file'
  | 'globe'
  | 'layers'

type ModuleDefinition = {
  id: string
  label: string
  icon: IconName
  description: string
  eyebrow: string
  features: string[]
  columns: string[]
  filters: string[]
  actions: string[]
}

type UnavailableRow = {
  id: string
  name: string
  detail: string
  status: string
}

const modules: ModuleDefinition[] = [
  {
    id: 'dashboard',
    label: 'Dashboard & analytics',
    icon: 'grid',
    eyebrow: 'OVERVIEW',
    description: 'Platform-wide activity, performance indicators, and operational health.',
    features: ['Marketplace overview', 'Order trends', 'Partner activity', 'Platform health'],
    columns: ['Metric', 'Current period', 'Previous period', 'Change'],
    filters: ['Date range', 'Compare with'],
    actions: ['Export dashboard'],
  },
  {
    id: 'partners',
    label: 'Partners',
    icon: 'store',
    eyebrow: 'MARKETPLACE',
    description: 'Manage partner accounts and open partner portals.',
    features: ['Partner directory', 'Onboarding applications', 'Approval review', 'Activation & suspension'],
    columns: ['Partner', 'Partner ID', 'Type', 'Submitted', 'Status'],
    filters: ['Partner type', 'Review status', 'Service area'],
    actions: ['Add partner', 'Review application', 'Change partner status'],
  },
  {
    id: 'products',
    label: 'Products & catalogue',
    icon: 'box',
    eyebrow: 'MARKETPLACE',
    description: 'Oversee catalogues, categories, product variants, prices, stock, and images.',
    features: ['Product catalogue', 'Categories', 'Variants & pricing', 'Stock & availability', 'Product images'],
    columns: ['Product', 'Partner / shop', 'Category', 'Price', 'Stock', 'Status'],
    filters: ['Partner', 'Category', 'Availability', 'Review status'],
    actions: ['Add category', 'Review product', 'Update listing'],
  },
  {
    id: 'orders',
    label: 'Platform orders',
    icon: 'cart',
    eyebrow: 'OPERATIONS',
    description: 'Search and monitor order lifecycle across all partners.',
    features: ['All orders', 'Order lifecycle', 'Exceptions & delays', 'Order detail'],
    columns: ['Order', 'Customer', 'Partner', 'Placed at', 'Total', 'Status'],
    filters: ['Order status', 'Partner', 'Payment state', 'Date range'],
    actions: ['Open order', 'Review exception', 'Export orders'],
  },
  {
    id: 'riders',
    label: 'Riders & delivery',
    icon: 'bike',
    eyebrow: 'OPERATIONS',
    description: 'Review rider records, verification, availability, assignments, and performance.',
    features: ['Rider directory', 'Onboarding & verification', 'Availability', 'Assignments', 'Earnings & performance'],
    columns: ['Rider', 'Rider ID', 'Service area', 'Availability', 'Verification'],
    filters: ['Availability', 'Verification', 'Service area'],
    actions: ['Review rider', 'View assignments', 'View earnings'],
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: 'users',
    eyebrow: 'ACCOUNTS',
    description: 'Find customer accounts and review account activity and support context.',
    features: ['Customer directory', 'Customer profile', 'Order history', 'Account controls'],
    columns: ['Customer', 'Customer ID', 'Contact', 'Joined', 'Account status'],
    filters: ['Account status', 'Joined date'],
    actions: ['View customer', 'Review account'],
  },
  {
    id: 'payments',
    label: 'Payments & settlements',
    icon: 'wallet',
    eyebrow: 'FINANCE',
    description: 'Reconcile payment status, commissions, refunds, and partner settlements.',
    features: ['Payment transactions', 'COD / UPI / gateway status', 'Commissions', 'Refunds', 'Settlements'],
    columns: ['Reference', 'Order', 'Partner', 'Method', 'Amount', 'Payment status'],
    filters: ['Payment method', 'Payment status', 'Partner', 'Date range'],
    actions: ['Reconcile payments', 'Review refund', 'Prepare settlement'],
  },
  {
    id: 'dues',
    label: 'Dues',
    icon: 'wallet',
    eyebrow: 'FINANCE',
    description: 'Review customer dues, confirm balances, and record payments.',
    features: ['Dues directory'],
    columns: ['Customer', 'Order', 'Reason', 'Amount', 'Status', 'Rider note'],
    filters: ['Due status', 'Date range'],
    actions: ['Confirm due', 'Waive due', 'Record payment'],
  },
  {
    id: 'delivery',
    label: 'Delivery & service areas',
    icon: 'pin',
    eyebrow: 'CONFIGURATION',
    description: 'Configure service areas, delivery charges, free-delivery rules, and parcel policies.',
    features: ['Service areas & zones', 'Distance / radius rules', 'Delivery charges', 'Free-delivery threshold', 'Parcel rules'],
    columns: ['Rule', 'Service area', 'Effective from', 'Last updated', 'Status'],
    filters: ['Service area', 'Rule status'],
    actions: ['Add service area', 'Configure charges', 'Edit delivery rules'],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bell',
    eyebrow: 'COMMUNICATIONS',
    description: 'Prepare platform announcements and oversee notification delivery.',
    features: ['Announcements', 'Notification templates', 'Audience targeting', 'Delivery history'],
    columns: ['Announcement', 'Audience', 'Channel', 'Scheduled', 'Status'],
    filters: ['Channel', 'Delivery status', 'Date range'],
    actions: ['Compose announcement', 'Review delivery'],
  },
  {
    id: 'support',
    label: 'Support & disputes',
    icon: 'help',
    eyebrow: 'CUSTOMER CARE',
    description: 'Triage support tickets, complaints, disputes, and escalations.',
    features: ['Support tickets', 'Complaints', 'Disputes', 'Escalations', 'Resolution history'],
    columns: ['Ticket', 'Requester', 'Related order', 'Assigned to', 'Updated', 'Priority'],
    filters: ['Ticket status', 'Priority', 'Issue type', 'Assigned staff'],
    actions: ['Assign ticket', 'Escalate issue', 'Resolve ticket'],
  },
  {
    id: 'reports',
    label: 'Reports & exports',
    icon: 'chart',
    eyebrow: 'INSIGHTS',
    description: 'Build filtered reports for orders, partners, operations, and finance.',
    features: ['Report library', 'Date & entity filters', 'Saved reports', 'CSV export'],
    columns: ['Report', 'Scope', 'Date range', 'Generated by', 'Generated at'],
    filters: ['Report type', 'Date range', 'Partner', 'Status'],
    actions: ['Run report', 'Export CSV', 'Save report'],
  },
  {
    id: 'settings',
    label: 'Platform settings',
    icon: 'settings',
    eyebrow: 'CONFIGURATION',
    description: 'Review marketplace-wide configuration and configuration history.',
    features: ['General settings', 'Marketplace preferences', 'Notification rules', 'Configuration history'],
    columns: ['Setting', 'Current value', 'Changed by', 'Changed at'],
    filters: ['Setting group', 'Changed date'],
    actions: ['Edit setting', 'Review history'],
  },
  {
    id: 'staff',
    label: 'Staff & audit',
    icon: 'shield',
    eyebrow: 'GOVERNANCE',
    description: 'Review staff access, permissions, sensitive actions, and audit history.',
    features: ['Staff directory', 'Roles & permissions', 'Sensitive-action controls', 'Audit log'],
    columns: ['Staff member', 'Role', 'Action', 'Resource', 'Timestamp', 'Outcome'],
    filters: ['Staff member', 'Action type', 'Date range'],
    actions: ['Invite staff', 'Review permissions', 'View audit event'],
  },
]

const dashboardColumns: TableColumn<UnavailableRow>[] = [
  { key: 'id', heading: 'Order', render: (row) => <span className="reference-text">{row.id}</span> },
  {
    key: 'name',
    heading: 'Customer',
    render: (row) => (
      <div className="table-primary-cell">
        <strong>{row.name}</strong>
        <span>{row.detail}</span>
      </div>
    ),
  },
  { key: 'partner', heading: 'Partner', render: () => '—' },
  { key: 'placed', heading: 'Placed at', render: () => '—' },
  { key: 'total', heading: 'Total', render: () => '—' },
  { key: 'status', heading: 'Status', render: (row) => <StatusBadge status={row.status} /> },
]

function Icon({ name }: { name: IconName }) {
  const shapes: Record<IconName, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    store: <><path d="M3 10h18l-1.5-6h-15L3 10Z" /><path d="M5 10v10h14V10M9 20v-6h6v6" /><path d="M3 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5M12 13v8" /></>,
    cart: <><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    bike: <><circle cx="5.5" cy="17.5" r="3.5" /><circle cx="18.5" cy="17.5" r="3.5" /><path d="m5.5 17.5 4-7h4l5 7h-7l-3-5M13.5 10.5h3l2 3M8 8h3" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 9h18M16 14h2" /><path d="M6 5V3h12" /></>,
    pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.5 1.5c-1.1 1.2-2.1 1.4-2.1 3M12 17.5h.01" /></>,
    chart: <><path d="M4 19V5M4 19h17M8 15l3-4 3 2 5-7" /><path d="M16 6h3v3" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.7 1.7 0 1 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 1 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1a1.7 1.7 0 0 0-1.2-2.9H4a1.7 1.7 0 1 1 0-3.4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1a1.7 1.7 0 0 0 2.9-1.2V4a1.7 1.7 0 1 1 3.4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a1.7 1.7 0 1 1 0 3.4h-.2a1.7 1.7 0 0 0-1.2.9Z" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></>,
    filter: <><path d="M4 5h16M7 12h10m-7 7h4" /><circle cx="8" cy="5" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
    more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  }

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {shapes[name]}
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="status-badge status-neutral">
      <span className="status-dot" />
      {status}
    </span>
  )
}

function AvailabilityNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`availability-notice${compact ? ' is-compact' : ''}`} role="status">
      <span className="notice-icon"><Icon name="lock" /></span>
      <span>
        <strong>Admin API not connected</strong>
        <small>Data and actions are unavailable until an authorized backend integration is approved.</small>
      </span>
    </div>
  )
}

function ConfirmationPreview({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null

    closeButtonRef.current?.focus()

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      )
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section
        aria-labelledby="confirmation-preview-title"
        aria-describedby="confirmation-preview-description"
        aria-modal="true"
        className="confirmation-dialog"
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Close confirmation preview"
          className="icon-button dialog-close"
          onClick={onClose}
          ref={closeButtonRef}
          type="button"
        >
          <Icon name="close" />
        </button>
        <span className="dialog-symbol"><Icon name="shield" /></span>
        <p className="dialog-eyebrow">UI PREVIEW ONLY</p>
        <h2 id="confirmation-preview-title">Sensitive action confirmation</h2>
        <p className="dialog-copy" id="confirmation-preview-description">
          Production actions require a verified API, backend permissions, and an audit record.
          No action can be performed from this preview.
        </p>
        <div className="dialog-actions">
          <button className="button-secondary" onClick={onClose} type="button">Close preview</button>
          <button className="button-primary" disabled type="button">Confirm action</button>
        </div>
      </section>
    </div>
  )
}

function StateExamples() {
  return (
    <details className="state-examples">
      <summary>Preview shared loading, empty, and error states</summary>
      <div className="state-examples-grid">
        <div className="state-example-card">
          <span className="loading-spinner" />
          <strong>Loading state</strong>
          <p>Example only · no request is running.</p>
        </div>
        <div className="state-example-card">
          <span className="state-icon state-empty" aria-hidden="true">⌕</span>
          <strong>Empty state</strong>
          <p>No records are available to display.</p>
        </div>
        <div className="state-example-card state-example-error">
          <span className="state-icon">!</span>
          <strong>Error state</strong>
          <p>Example only · connect an API to load records.</p>
        </div>
      </div>
    </details>
  )
}

function WorkspaceForm({ module, view }: { module: ModuleDefinition; view: string }) {
  const formLabels = getFormLabels(module.id, view)

  return (
    <section className="panel form-panel" aria-labelledby="form-title">
      <div className="panel-heading">
        <div>
          <h2 id="form-title">{view} · form layout</h2>
          <p>Fields are a UI layout only; nothing is saved or submitted.</p>
        </div>
        <span className="layout-tag">NOT CONNECTED</span>
      </div>
      <AvailabilityNotice compact />
      <form className="admin-form" onSubmit={(event) => event.preventDefault()}>
        {formLabels.map((label, index) => (
          <label className={index === formLabels.length - 1 ? 'form-field form-field-wide' : 'form-field'} key={label}>
            <span>{label}</span>
            {label.toLowerCase().includes('type') ||
            label.toLowerCase().includes('status') ||
            label.toLowerCase().includes('area') ||
            label.toLowerCase().includes('role') ||
            label.toLowerCase().includes('channel') ||
            label.toLowerCase().includes('audience') ||
            label.toLowerCase().includes('scope') ||
            label.toLowerCase().includes('category') ||
            label.toLowerCase().includes('partner') ||
            label.toLowerCase().includes('parent') ||
            label.toLowerCase().includes('priority') ||
            label.toLowerCase().includes('method') ? (
              <select disabled aria-label={label}><option>Unavailable</option></select>
            ) : label.toLowerCase().includes('reason') || label.toLowerCase().includes('notes') ? (
              <textarea disabled aria-label={label} placeholder="Unavailable until API integration" rows={3} />
            ) : (
              <input
                disabled
                aria-label={label}
                placeholder="Unavailable until API integration"
                type={label.toLowerCase().includes('image')
                  ? 'file'
                  : label.toLowerCase().includes('date') || label.toLowerCase().includes('schedule')
                    ? 'date'
                    : label.toLowerCase().includes('email')
                      ? 'email'
                      : label.toLowerCase().includes('price') ||
                          label.toLowerCase().includes('amount') ||
                          label.toLowerCase().includes('radius') ||
                          label.toLowerCase().includes('threshold') ||
                          label.toLowerCase().includes('weight') ||
                          label.toLowerCase().includes('quantity')
                        ? 'number'
                        : 'text'}
              />
            )}
          </label>
        ))}
        <div className="form-footer">
          <span>Changes require backend authorization and audit logging.</span>
          <button className="button-primary" disabled type="button">Save unavailable</button>
        </div>
      </form>
    </section>
  )
}

function getFormLabels(moduleId: string, view: string) {
  const normalizedView = view.toLowerCase()
  if (moduleId === 'partners' && normalizedView.includes('review')) {
    return ['Partner application', 'Business legal name', 'Partner type', 'Contact email', 'Contact phone', 'Service area', 'Review notes']
  }
  if (moduleId === 'partners') {
    return ['Business name', 'Legal business name', 'Partner type', 'Contact email', 'Contact phone', 'Service area', 'Application notes']
  }
  if (moduleId === 'products' && normalizedView.includes('categor')) {
    return ['Category name', 'Partner / shop', 'Parent category', 'Sort order', 'Category status', 'Notes']
  }
  if (moduleId === 'products' && normalizedView.includes('variant')) {
    return ['Product', 'Variant label', 'SKU', 'Price', 'Inventory quantity', 'Availability status']
  }
  if (moduleId === 'products' && normalizedView.includes('image')) {
    return ['Product', 'Image files', 'Image order', 'Accessibility description']
  }
  if (moduleId === 'riders') {
    return ['Rider full name', 'Contact phone', 'Service area', 'Verification status', 'Document review notes']
  }
  if (moduleId === 'customers') {
    return ['Customer account', 'Account status', 'Control reason', 'Review notes']
  }
  if (moduleId === 'delivery' && normalizedView.includes('service')) {
    return ['Service area name', 'Postal code / locality', 'Coverage radius (km)', 'Zone status', 'Effective date']
  }
  if (moduleId === 'delivery' && normalizedView.includes('charge')) {
    return ['Service area', 'Base delivery charge', 'Included distance (km)', 'Additional distance charge', 'Effective date']
  }
  if (moduleId === 'delivery' && normalizedView.includes('free')) {
    return ['Rule name', 'Service area', 'Minimum order threshold', 'Rule status', 'Effective date']
  }
  if (moduleId === 'delivery') {
    return ['Parcel type', 'Maximum parcel weight (kg)', 'Service area', 'Delivery charge', 'Policy status']
  }
  if (moduleId === 'notifications' && normalizedView.includes('template')) {
    return ['Template name', 'Notification channel', 'Message content', 'Template status']
  }
  if (moduleId === 'notifications') {
    return ['Announcement title', 'Audience', 'Notification channel', 'Schedule date', 'Announcement message']
  }
  if (moduleId === 'settings') {
    return ['Configuration key', 'Current value', 'New value', 'Reason for change']
  }
  if (moduleId === 'staff' && normalizedView.includes('permission')) {
    return ['Staff member', 'Staff role', 'Permission scope', 'Sensitive action policy', 'Reason for change']
  }
  if (moduleId === 'staff' && normalizedView.includes('sensitive')) {
    return ['Action type', 'Required permission', 'Approval policy', 'Reason for change']
  }
  if (moduleId === 'staff') {
    return ['Staff member', 'Work email', 'Staff role', 'Permission scope', 'Invitation notes']
  }
  return ['Name', 'Status', 'Effective date', 'Notes']
}

function ModuleWorkspace({
  module,
  activeView,
  onViewChange,
  onConfirmationPreview,
}: {
  module: ModuleDefinition
  activeView: string
  onViewChange: (view: string) => void
  onConfirmationPreview: () => void
}) {
  if (module.id === 'dues') {
    return <DuesPage />
  }

  const moduleColumns: TableColumn<UnavailableRow>[] = module.columns.map(
    (heading, index) => ({
      key: `${module.id}-${index}`,
      heading,
      render: (row) =>
        index === 0 ? (
          <div className="table-primary-cell">
            <strong>{row.name}</strong>
            <span>{row.detail}</span>
          </div>
        ) : index === module.columns.length - 1 ? (
          <StatusBadge status={row.status} />
        ) : (
          '—'
        ),
    }),
  )

  return (
    <div className="module-workspace">
      <AvailabilityNotice />
      {activeView === 'Overview' && <ModuleAnalytics moduleId={module.id} moduleLabel={module.label} />}

      {activeView === 'Overview' && module.id === 'dashboard' && (
        <section className="panel health-panel">
          <div className="panel-heading">
            <div><h2>Operational health</h2><p>Service connection status</p></div>
          </div>
          <div className="health-row"><span><Icon name="globe" /> Admin API</span><StatusBadge status="Not connected" /></div>
          <div className="health-row"><span><Icon name="layers" /> Data source</span><StatusBadge status="Unavailable" /></div>
          <p className="health-footnote">No health check or database connection is configured in this website.</p>
        </section>
      )}

      {activeView === 'Overview' && module.id !== 'dashboard' && (
        <section className="feature-overview panel">
          <div className="panel-heading">
            <div><h2>{module.label} workspace</h2><p>Available workspace areas. Operational data and actions require an approved admin API.</p></div>
            <span className="layout-tag">UI LAYOUT</span>
          </div>
          <div className="feature-grid">
            {module.features.map((feature, index) => (
              <button
                className="feature-card"
                key={feature}
                onClick={() => onViewChange(feature)}
                type="button"
              >
                <span className={`feature-card-icon feature-tone-${index % 4}`}><Icon name={module.icon} /></span>
                <span className="feature-card-copy"><strong>{feature}</strong><small>Open workspace layout</small></span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        </section>
      )}

      {activeView !== 'Overview' && (
        <>
          <section className="feature-intro">
            <div><span className="page-kicker">{module.eyebrow} / {activeView.toUpperCase()}</span><h2>{activeView}</h2><p>{module.description}</p></div>
            {activeView.toLowerCase().includes('audit') && <button className="preview-action" onClick={onConfirmationPreview} type="button"><Icon name="shield" /> Preview sensitive-action dialog</button>}
          </section>
          {module.id === 'dashboard' ? (
            <section className="panel chart-panel" aria-labelledby="dashboard-detail-title">
              <div className="panel-heading">
                <div>
                  <h2 id="dashboard-detail-title">{activeView}</h2>
                  <p>{module.description}</p>
                </div>
                <span className="layout-tag">NO DATA SOURCE</span>
              </div>
              <div className="chart-empty">
                <span className="chart-empty-icon"><Icon name={activeView === 'Platform health' ? 'shield' : 'chart'} /></span>
                <strong>{activeView === 'Platform health' ? 'Platform health is unavailable' : `${activeView} is unavailable`}</strong>
                <p>Connect a verified admin API to display live platform information here.</p>
              </div>
            </section>
          ) : isFormView(module.id, activeView) ? (
            <WorkspaceForm module={module} view={activeView} />
          ) : (
            <RecordsPanel module={module} columns={moduleColumns} activeView={activeView} />
          )}
        </>
      )}

      {activeView === 'Overview' && module.id === 'dashboard' && (
        <RecordsPanel module={module} columns={dashboardColumns} activeView="Recent platform orders" />
      )}

      {activeView === 'Overview' && module.id !== 'dashboard' && (
        <RecordsPanel module={module} columns={moduleColumns} activeView="Overview" />
      )}
      <StateExamples />
    </div>
  )
}

function isFormView(moduleId: string, view: string) {
  const normalizedView = view.toLowerCase()
  if (moduleId === 'partners') return normalizedView.includes('onboarding') || normalizedView.includes('review')
  if (moduleId === 'products') return normalizedView.includes('categories') || normalizedView.includes('variants') || normalizedView.includes('image')
  if (moduleId === 'riders') return normalizedView.includes('onboarding')
  if (moduleId === 'customers') return normalizedView.includes('controls')
  if (moduleId === 'delivery') return true
  if (moduleId === 'notifications') return normalizedView.includes('announcement') || normalizedView.includes('template')
  if (moduleId === 'settings') return !normalizedView.includes('history')
  if (moduleId === 'staff') return normalizedView.includes('staff') || normalizedView.includes('permission') || normalizedView.includes('sensitive')
  return false
}

function RecordsPanel({
  module,
  columns,
  activeView,
}: {
  module: ModuleDefinition
  columns: TableColumn<UnavailableRow>[]
  activeView: string
}) {
  return (
    <AdminRecordsPanel
      activeView={activeView}
      headings={columns.map((column) => column.heading)}
      moduleId={module.id}
      moduleLabel={module.label}
    />
  )
}

function App() {
  const [activeModuleId, setActiveModuleId] = useState(
    () => window.location.pathname.startsWith('/partners')
      ? 'partners'
      : window.location.pathname.startsWith('/dues')
        ? 'dues'
        : 'dashboard',
  )
  const [activeView, setActiveView] = useState('Overview')
  const [globalSearch, setGlobalSearch] = useState('')
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const closeConfirmationPreview = useCallback(() => setConfirmationOpen(false), [])
  const activeModule = modules.find((module) => module.id === activeModuleId) ?? modules[0]

  useEffect(() => {
    function restoreRoute() {
      const path = window.location.pathname
      const stateModuleId = window.history.state?.moduleId
      const restoredModule = modules.find((module) => module.id === stateModuleId)
      const nextModuleId = restoredModule?.id ?? (
        path.startsWith('/partners') ? 'partners' : path.startsWith('/dues') ? 'dues' : 'dashboard'
      )
      setActiveModuleId(nextModuleId)
      setActiveView('Overview')
    }

    window.addEventListener('popstate', restoreRoute)
    return () => window.removeEventListener('popstate', restoreRoute)
  }, [])

  const searchResults = globalSearch.trim()
    ? modules.filter((module) =>
        `${module.label} ${module.description} ${module.features.join(' ')}`
          .toLowerCase()
          .includes(globalSearch.trim().toLowerCase()),
      )
    : []

  function openModule(moduleId: string) {
    const path = moduleId === 'partners' ? '/partners' : moduleId === 'dues' ? '/dues' : '/'
    window.history.pushState({ moduleId }, '', path)
    setActiveModuleId(moduleId)
    setActiveView('Overview')
    setGlobalSearch('')
    setMobileNavOpen(false)
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') setGlobalSearch('')
    if (event.key === 'Enter' && searchResults[0]) openModule(searchResults[0].id)
  }

  const workspaceViews = ['Overview', ...activeModule.features]

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileNavOpen ? ' is-mobile-open' : ''}`} aria-label="Main navigation">
        <a className="brand" href="#dashboard" onClick={(event) => { event.preventDefault(); openModule('dashboard') }}>
          <img className="brand-mark" src="/myshopzy-logo.png" alt="" />
          <span className="brand-copy"><span className="brand-name">MyShopzy</span><strong>Super Admin</strong></span>
        </a>
        <div className="sidebar-label">PLATFORM</div>
        <nav className="side-nav">
          {modules.map((module) => (
            <button
              aria-current={activeModuleId === module.id ? 'page' : undefined}
              className={`nav-link${activeModuleId === module.id ? ' is-active' : ''}`}
              key={module.id}
              onClick={() => openModule(module.id)}
              type="button"
            >
              <Icon name={module.icon} />
              <span>{module.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="environment-card">
            <span className="environment-dot" />
            <span>
              <strong>Super Admin API</strong>
              <small>{superAdminApi.isConfigured ? 'Endpoint configured' : 'Endpoint not configured'}</small>
            </span>
          </div>
          <div className="sidebar-version">MYSHOPZY ADMIN <span>UI PHASE</span></div>
        </div>
      </aside>

      <div className="main-workspace">
        <header className="topbar">
          <button
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'}
            className="mobile-menu-button icon-button"
            onClick={() => setMobileNavOpen((open) => !open)}
            type="button"
          >
            <Icon name={mobileNavOpen ? 'close' : 'grid'} />
          </button>
          <div className="breadcrumb"><span>Platform</span><Icon name="chevron" /><strong>{activeModule.label}</strong></div>
          <div className="topbar-actions">
            <div className="global-search-wrap">
              <label className="global-search">
                <Icon name="search" />
                <input
                  aria-label="Search admin workspaces"
                  aria-expanded={globalSearch.trim().length > 0}
                  aria-controls="global-search-results"
                  autoComplete="off"
                  onChange={(event) => setGlobalSearch(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search workspaces..."
                  value={globalSearch}
                />
                <kbd>Enter</kbd>
              </label>
              {globalSearch.trim() && (
                <div className="search-results" id="global-search-results" role="listbox" aria-label="Matching workspaces">
                  {searchResults.length > 0 ? searchResults.map((module) => (
                    <button
                      aria-selected="false"
                      className="search-result"
                      key={module.id}
                      onClick={() => openModule(module.id)}
                      role="option"
                      type="button"
                    >
                      <span className="search-result-icon"><Icon name={module.icon} /></span>
                      <span><strong>{module.label}</strong><small>{module.eyebrow}</small></span>
                      <Icon name="arrow" />
                    </button>
                  )) : <p className="search-no-results">No matching workspaces.</p>}
                </div>
              )}
            </div>
            <button className="icon-button notification-button" disabled title="Notifications are not connected" type="button" aria-label="Notifications unavailable">
              <Icon name="bell" />
            </button>
            <AuthControls />
          </div>
        </header>

        <main className="page-content">
          <>
            <div className="page-heading">
              <div>
                <div className="page-kicker">MYSHOPZY <span>/</span> {activeModule.eyebrow}</div>
                <h1>{activeModule.label}</h1>
                <p>{activeModule.description}</p>
              </div>
              <span className="connection-badge">
                <span />
                {superAdminApi.isConfigured ? 'API endpoint configured' : 'API endpoint missing'}
              </span>
            </div>

            {activeModule.features.length > 1 && (
              <nav className="workspace-tabs workspace-tabs-top" aria-label={`${activeModule.label} sections`}>
                {workspaceViews.map((view) => (
                  <button
                    aria-current={activeView === view ? 'page' : undefined}
                    className={`workspace-tab${activeView === view ? ' is-active' : ''}`}
                    key={view}
                    onClick={() => setActiveView(view)}
                    type="button"
                  >
                    {view}
                  </button>
                ))}
              </nav>
            )}

            <ModuleWorkspace
              activeView={activeView}
              module={activeModule}
              onConfirmationPreview={() => setConfirmationOpen(true)}
              onViewChange={setActiveView}
            />
          </>

          <footer className="page-footer">
            <span>© 2026 MyShopzy</span><span>•</span><span>Supported records require authorized API access; remaining modules are previews</span>
          </footer>
        </main>
      </div>
      <ConfirmationPreview open={confirmationOpen} onClose={closeConfirmationPreview} />
    </div>
  )
}

export default App
