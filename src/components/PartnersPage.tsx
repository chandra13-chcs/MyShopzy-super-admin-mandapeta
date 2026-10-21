import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { DataTable } from './DataTable'
import type { TableColumn } from './DataTable'
import { createPartner, listPartners } from '../services/api/partners'
import type { CreatePartnerInput, Partner, PartnerType } from '../services/api/partners'
import { isDemoMode, partnerPortalUrl } from '../config/env'

type PartnersPageProps = {
  isCreateRoute: boolean
  onNavigate: (path: string) => void
}

type PartnerFormValues = Omit<CreatePartnerInput, 'type'> & { type: PartnerType | '' }
type FormErrors = Partial<Record<keyof PartnerFormValues, string>>

const typeLabels: Record<PartnerType, string> = {
  restaurant: 'Restaurant',
  meat: 'Meat',
  bakery: 'Bakery',
  fruits_vegetables: 'Fruits & vegetables',
  local_store: 'Local store',
}

const typePreviews: Record<PartnerType, { categories: string[]; units: string[] }> = {
  restaurant: {
    categories: ['Meals', 'Snacks', 'Beverages'],
    units: ['Plate', 'Piece', 'Bottle'],
  },
  meat: {
    categories: ['Chicken', 'Mutton', 'Seafood'],
    units: ['Kilogram (kg)', 'Gram (g)', 'Pack'],
  },
  bakery: {
    categories: ['Breads', 'Cakes', 'Cookies'],
    units: ['Piece', 'Box', 'Kilogram (kg)'],
  },
  fruits_vegetables: {
    categories: ['Fruits', 'Vegetables', 'Leafy greens'],
    units: ['Kilogram (kg)', 'Gram (g)', 'Piece'],
  },
  local_store: {
    categories: ['Groceries', 'Household', 'Personal care'],
    units: ['Piece', 'Pack', 'Litre (L)'],
  },
}

const partnerColumns: TableColumn<Partner>[] = [
  {
    key: 'businessName',
    heading: 'Business name',
    render: (partner) => <strong className="partner-business-name">{partner.businessName}</strong>,
  },
  { key: 'shopName', heading: 'Shop name', render: (partner) => partner.shopName },
  {
    key: 'type',
    heading: 'Type',
    render: (partner) => <span className="partner-type-badge">{typeLabels[partner.type]}</span>,
  },
  { key: 'ownerEmail', heading: 'Owner email', render: (partner) => partner.ownerEmail },
  {
    key: 'createdAt',
    heading: 'Created date',
    render: (partner) => formatDate(partner.createdAt),
  },
  {
    key: 'status',
    heading: 'Status',
    render: (partner) => (
      <span className={`status-badge${partner.status.toLowerCase() === 'active' ? ' partner-status-active' : ''}`}>
        <span className="status-dot" />
        {partner.status}
      </span>
    ),
  },
  {
    key: 'portal',
    heading: 'Partner portal',
    render: (partner) => <PartnerPortalButton partner={partner} />,
  },
]

const initialValues: PartnerFormValues = {
  businessName: '',
  shopName: '',
  type: '',
  ownerEmail: '',
  ownerPhone: '',
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Unavailable'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

const portalUrlError = 'Partner portal URL is not set up. Set VITE_PARTNER_PORTAL_URL to the partner portal address (different from this app).'

function PartnerPortalButton({
  partner,
  variant = 'secondary',
}: {
  partner: Partner
  variant?: 'primary' | 'secondary'
}) {
  const [error, setError] = useState('')

  function openPortal() {
    setError('')
    let portalUrl: URL
    try {
      if (!partnerPortalUrl) throw new Error('Missing portal URL')
      portalUrl = new URL(partnerPortalUrl)
      if (
        (portalUrl.protocol !== 'http:' && portalUrl.protocol !== 'https:') ||
        portalUrl.origin === window.location.origin
      ) {
        throw new Error('Invalid portal URL')
      }
    } catch {
      setError(portalUrlError)
      return
    }

    const url = `${partnerPortalUrl.replace(/\/+$/, '')}/?partnerId=${partner.partnerId}&type=${partner.type}&name=${encodeURIComponent(partner.businessName)}&shop=${encodeURIComponent(partner.shopName)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="partner-portal-action">
      <button className={`button-${variant} partner-portal-link`} onClick={openPortal} type="button">
        Open partner portal
      </button>
      {error && <small className="partner-portal-error" role="alert">{error}</small>}
    </div>
  )
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

function isPartnerType(value: string): value is PartnerType {
  return value === 'restaurant' ||
    value === 'meat' ||
    value === 'bakery' ||
    value === 'fruits_vegetables' ||
    value === 'local_store'
}

export function PartnersPage({ isCreateRoute, onNavigate }: PartnersPageProps) {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [values, setValues] = useState<PartnerFormValues>(initialValues)
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdPartner, setCreatedPartner] = useState<Partner | null>(null)
  const submittingRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setLoadError('')

    void listPartners().then((rows) => {
      if (cancelled) return
      setPartners(rows)
      setLoadState('ready')
    }).catch((error: unknown) => {
      if (cancelled) return
      setLoadError(errorMessage(error))
      setLoadState('error')
    })

    return () => {
      cancelled = true
    }
  }, [isCreateRoute, loadAttempt])

  useEffect(() => {
    if (isCreateRoute) {
      setCreatedPartner(null)
      setValues(initialValues)
      setFieldErrors({})
      setSubmitError('')
    }
  }, [isCreateRoute])

  function updateField<Key extends keyof PartnerFormValues>(
    field: Key,
    value: PartnerFormValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  async function submitPartner(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submittingRef.current) return
    const normalized: PartnerFormValues = {
      businessName: values.businessName.trim(),
      shopName: values.shopName.trim(),
      type: values.type,
      ownerEmail: values.ownerEmail.trim(),
      ownerPhone: values.ownerPhone.trim(),
    }
    const errors: FormErrors = {}

    for (const field of ['businessName', 'shopName', 'type', 'ownerEmail', 'ownerPhone'] as const) {
      const value = normalized[field]
      if (!value) {
        errors[field] = 'This field is required.'
      } else if (value.length > 80) {
        errors[field] = 'Must be 80 characters or fewer.'
      }
    }
    if (normalized.type && !isPartnerType(normalized.type)) {
      errors.type = 'Select a valid partner type.'
    }
    if (
      normalized.ownerEmail &&
      !errors.ownerEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.ownerEmail)
    ) {
      errors.ownerEmail = 'Enter a valid email address.'
    }

    setFieldErrors(errors)
    setSubmitError('')
    if (Object.keys(errors).length > 0 || !normalized.type) return

    submittingRef.current = true
    setSubmitting(true)
    try {
      const partner = await createPartner({ ...normalized, type: normalized.type })
      setCreatedPartner(partner)
      setValues(initialValues)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const preview = values.type ? typePreviews[values.type] : null

  return (
    <div className="partners-page">
      <div className="page-heading partners-page-heading">
        <div>
          <div className="page-kicker">MYSHOPZY <span>/</span> MARKETPLACE</div>
          <h1>{isCreateRoute ? 'Add partner' : 'Partners'}</h1>
          <p>{isCreateRoute ? 'Create a partner account and prepare its starting catalogue.' : 'Manage partner accounts and open their partner portals.'}</p>
        </div>
        <div className="partner-heading-actions">
          {isDemoMode && <span className="partner-demo-badge">Demo data</span>}
          {isCreateRoute ? (
            <button className="button-secondary" onClick={() => onNavigate('/partners')} type="button">Back to partners</button>
          ) : (
            <button className="button-primary" onClick={() => onNavigate('/partners/new')} type="button">Add partner</button>
          )}
        </div>
      </div>

      {isCreateRoute ? (
        createdPartner ? (
          <section className="panel partner-success-card" aria-labelledby="partner-created-title" role="status">
            <span className="partner-success-icon" aria-hidden="true">✓</span>
            <div>
              <p className="partner-success-kicker">PARTNER CREATED</p>
              <h2 id="partner-created-title">{createdPartner.businessName} is ready</h2>
              <p>{createdPartner.shopName} · {typeLabels[createdPartner.type]}</p>
              <div className="partner-success-actions">
                <PartnerPortalButton partner={createdPartner} variant="primary" />
                <button className="button-secondary" onClick={() => onNavigate('/partners')} type="button">View partners</button>
              </div>
            </div>
          </section>
        ) : (
          <section className="panel form-panel partner-form-panel" aria-labelledby="partner-form-title">
            <div className="panel-heading">
              <div>
                <h2 id="partner-form-title">Partner details</h2>
                <p>All fields are required. Values are trimmed before saving.</p>
              </div>
              <span className="layout-tag">NEW ACCOUNT</span>
            </div>
            <form className="admin-form" onSubmit={(event) => void submitPartner(event)} noValidate>
              <FormField
                error={fieldErrors.businessName}
                id="partner-business-name"
                label="Business name"
                maxLength={80}
                onChange={(value) => updateField('businessName', value)}
                value={values.businessName}
              />
              <FormField
                error={fieldErrors.shopName}
                id="partner-shop-name"
                label="Shop name"
                maxLength={80}
                onChange={(value) => updateField('shopName', value)}
                value={values.shopName}
              />
              <label className="form-field form-field-wide partner-type-field" htmlFor="partner-type">
                <span>Partner type</span>
                <select
                  aria-describedby={fieldErrors.type ? 'partner-type-error' : undefined}
                  aria-invalid={Boolean(fieldErrors.type)}
                  id="partner-type"
                  onChange={(event) => updateField(
                    'type',
                    isPartnerType(event.target.value) ? event.target.value : '',
                  )}
                  required
                  value={values.type}
                >
                  <option value="">Select a partner type</option>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {fieldErrors.type && <small className="partner-field-error" id="partner-type-error">{fieldErrors.type}</small>}
                <span className="sr-only" aria-live="polite">
                  {preview ? `Starting categories: ${preview.categories.join(', ')}. Units: ${preview.units.join(', ')}.` : ''}
                </span>
              </label>
              <div className="partner-type-preview form-field-wide" aria-live="polite">
                {preview ? (
                  <>
                    <strong>{typeLabels[values.type]} starts with</strong>
                    <div><span>Default categories</span><p>{preview.categories.join(' · ')}</p></div>
                    <div><span>Default units</span><p>{preview.units.join(' · ')}</p></div>
                  </>
                ) : (
                  <p>Select a partner type to preview its default categories and units.</p>
                )}
              </div>
              <FormField
                error={fieldErrors.ownerEmail}
                id="partner-owner-email"
                label="Owner email"
                maxLength={80}
                onChange={(value) => updateField('ownerEmail', value)}
                type="email"
                value={values.ownerEmail}
              />
              <FormField
                error={fieldErrors.ownerPhone}
                id="partner-owner-phone"
                label="Owner phone"
                maxLength={80}
                onChange={(value) => updateField('ownerPhone', value)}
                type="tel"
                value={values.ownerPhone}
              />
              {submitError && <p className="partner-submit-error form-field-wide" role="alert">{submitError}</p>}
              <div className="form-footer">
                <span>Each partner starts with the categories and units shown above.</span>
                <button className="button-primary" disabled={submitting} type="submit">
                  {submitting ? 'Creating partner…' : 'Create partner'}
                </button>
              </div>
            </form>
          </section>
        )
      ) : (
        <section className="panel records-panel" aria-labelledby="partners-list-title">
          <div className="panel-heading records-heading">
            <div>
              <h2 id="partners-list-title">Partner directory</h2>
              <p>Partner accounts and their portal access.</p>
            </div>
            {loadState === 'error' && (
              <button className="button-secondary" onClick={() => setLoadAttempt((attempt) => attempt + 1)} type="button">
                Retry
              </button>
            )}
          </div>
          <DataTable
            columns={partnerColumns}
            emptyMessage="New partner accounts will appear here after they are created."
            emptyTitle="No partners yet"
            error={loadState === 'error' ? loadError : undefined}
            getRowKey={(partner) => partner.partnerId}
            loading={loadState === 'loading'}
            rows={partners}
          />
        </section>
      )}
    </div>
  )
}

function FormField({
  error,
  id,
  label,
  maxLength,
  onChange,
  type = 'text',
  value,
}: {
  error?: string
  id: string
  label: string
  maxLength: number
  onChange: (value: string) => void
  type?: string
  value: string
}) {
  const errorId = `${id}-error`
  return (
    <label className="form-field" htmlFor={id}>
      <span>{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        autoComplete={id.includes('email') ? 'email' : id.includes('phone') ? 'tel' : 'organization'}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
      {error && <small className="partner-field-error" id={errorId}>{error}</small>}
    </label>
  )
}
