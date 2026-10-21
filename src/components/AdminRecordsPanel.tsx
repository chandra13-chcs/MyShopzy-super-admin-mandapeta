import { useEffect, useMemo, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { ApiClientError, listAdminResource, superAdminApi } from '../api/client'
import { auth0Config } from '../auth/config'
import type {
  AdminResource,
  CustomerListItem,
  ListParams,
  OrderListItem,
  PartnerListItem,
  ProductListItem,
} from '../api/client'
import { DataTable } from './DataTable'
import type { TableColumn } from './DataTable'

type RecordRow = {
  id: string
  values: string[]
  status: string
}

type LoadState =
  | { kind: 'error'; message: string; requestId?: string }
  | { kind: 'ready'; rows: RecordRow[]; pagination: { limit: number; offset: number; total: number } }
type StoredLoadState = {
  key: string
  value: LoadState
}

type SupportedModule = AdminResource

const pageSize = 25
const unavailableMessage = 'Sign in with an authorized Super Admin account to view protected records.'

const resourceByModule: Partial<Record<string, SupportedModule>> = {
  dashboard: 'orders',
  orders: 'orders',
  customers: 'customers',
  partners: 'partners',
  products: 'products',
}

const sortByModule: Record<SupportedModule, { label: string; value: string }[]> = {
  orders: [
    { label: 'Newest orders', value: 'placedAt:desc' },
    { label: 'Oldest orders', value: 'placedAt:asc' },
    { label: 'Highest total', value: 'totalMinor:desc' },
    { label: 'Lowest total', value: 'totalMinor:asc' },
  ],
  customers: [
    { label: 'Newest customers', value: 'createdAt:desc' },
    { label: 'Oldest customers', value: 'createdAt:asc' },
    { label: 'Name A–Z', value: 'displayName:asc' },
    { label: 'Name Z–A', value: 'displayName:desc' },
  ],
  partners: [
    { label: 'Newest partners', value: 'createdAt:desc' },
    { label: 'Oldest partners', value: 'createdAt:asc' },
    { label: 'Name A–Z', value: 'name:asc' },
    { label: 'Name Z–A', value: 'name:desc' },
  ],
  products: [
    { label: 'Newest listings', value: 'createdAt:desc' },
    { label: 'Oldest listings', value: 'createdAt:asc' },
    { label: 'Name A–Z', value: 'name:asc' },
    { label: 'Name Z–A', value: 'name:desc' },
  ],
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unavailable' : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatMinorUnits(value: string, currency: string) {
  return `${currency} ${value} minor units`
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ApiClientError({ message: 'The API returned an invalid record.', code: 'INVALID_RESPONSE' })
  }
  return value as Record<string, unknown>
}

function requireString(record: Record<string, unknown>, field: string) {
  if (typeof record[field] !== 'string') {
    throw new ApiClientError({ message: `The API returned an invalid ${field} field.`, code: 'INVALID_RESPONSE' })
  }
  return record[field]
}

function requireProductStatus(record: Record<string, unknown>, field: string) {
  const value = requireString(record, field)
  if (value !== 'active' && value !== 'archived') {
    throw new ApiClientError({ message: `The API returned an invalid ${field} field.`, code: 'INVALID_RESPONSE' })
  }
  return value
}

function requireMinorUnitString(record: Record<string, unknown>, field: string) {
  const value = requireString(record, field)
  if (!/^\d+$/.test(value)) {
    throw new ApiClientError({ message: `The API returned an invalid ${field} amount.`, code: 'INVALID_RESPONSE' })
  }
  return value
}

function nullableString(record: Record<string, unknown>, field: string) {
  const value = record[field]
  if (value === null) return null
  if (typeof value !== 'string') {
    throw new ApiClientError({ message: `The API returned an invalid ${field} field.`, code: 'INVALID_RESPONSE' })
  }
  return value
}

function nullableSafeInteger(record: Record<string, unknown>, field: string) {
  const value = record[field]
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new ApiClientError({ message: `The API returned an invalid ${field} field.`, code: 'INVALID_RESPONSE' })
  }
  return value
}

function mapRows(resource: SupportedModule, data: unknown[]): RecordRow[] {
  if (resource === 'orders') {
    return data.map((value) => {
      const record = requireRecord(value)
      const row: OrderListItem = {
        id: requireString(record, 'id'),
        customerId: requireString(record, 'customerId'),
        customerName: requireString(record, 'customerName'),
        partnerId: requireString(record, 'partnerId'),
        partnerName: requireString(record, 'partnerName'),
        shopId: requireString(record, 'shopId'),
        shopName: requireString(record, 'shopName'),
        status: requireString(record, 'status'),
        currency: requireString(record, 'currency'),
        itemsSubtotalMinor: requireMinorUnitString(record, 'itemsSubtotalMinor'),
        deliveryFeeMinor: requireMinorUnitString(record, 'deliveryFeeMinor'),
        discountMinor: requireMinorUnitString(record, 'discountMinor'),
        totalMinor: requireMinorUnitString(record, 'totalMinor'),
        placedAt: requireString(record, 'placedAt'),
      }
      return {
        id: row.id,
        status: row.status,
      values: [
          row.id,
          row.customerName,
          row.partnerName,
          formatDate(row.placedAt),
          formatMinorUnits(row.totalMinor, row.currency),
          row.status,
      ],
      }
    })
  }
  if (resource === 'customers') {
    return data.map((value) => {
      const record = requireRecord(value)
      const row: CustomerListItem = {
        id: requireString(record, 'id'),
        displayName: requireString(record, 'displayName'),
        status: requireString(record, 'status'),
        createdAt: requireString(record, 'createdAt'),
      }
      return {
        id: row.id,
        status: row.status,
        values: [row.displayName, row.id, 'Not included in this read-only view', formatDate(row.createdAt), row.status],
      }
    })
  }
  if (resource === 'partners') {
    return data.map((value) => {
      const record = requireRecord(value)
      const row: PartnerListItem = {
        id: requireString(record, 'id'),
        name: requireString(record, 'name'),
        partnerType: requireString(record, 'partnerType'),
        status: requireString(record, 'status'),
        createdAt: requireString(record, 'createdAt'),
      }
      return {
        id: row.id,
        status: row.status,
        values: [row.name, row.id, row.partnerType, formatDate(row.createdAt), row.status],
      }
    })
  }
  return data.map((value) => {
    const record = requireRecord(value)
    const inventoryQuantity = nullableSafeInteger(record, 'inventoryQuantity')
    const categoryName = nullableString(record, 'categoryName')
    if (typeof record.isAvailable !== 'boolean') {
      throw new ApiClientError({ message: 'The API returned an invalid isAvailable field.', code: 'INVALID_RESPONSE' })
    }
    const row: ProductListItem = {
      id: requireString(record, 'id'),
      name: requireString(record, 'name'),
      partnerId: requireString(record, 'partnerId'),
      partnerName: requireString(record, 'partnerName'),
      shopId: requireString(record, 'shopId'),
      shopName: requireString(record, 'shopName'),
      categoryId: nullableString(record, 'categoryId'),
      categoryName,
      sku: nullableString(record, 'sku'),
      priceMinor: requireMinorUnitString(record, 'priceMinor'),
      currency: requireString(record, 'currency'),
      inventoryQuantity,
      isAvailable: record.isAvailable,
      status: requireProductStatus(record, 'status'),
      listingStatus: requireProductStatus(record, 'listingStatus'),
      createdAt: requireString(record, 'createdAt'),
    }
    return {
      id: row.id,
      status: row.status,
      values: [
        row.name,
        `${row.partnerName} / ${row.shopName}`,
        row.categoryName ?? 'Uncategorized',
        formatMinorUnits(row.priceMinor, row.currency),
        row.inventoryQuantity === null ? 'Not tracked' : String(row.inventoryQuantity),
        row.status,
      ],
    }
  })
}

function dataColumns(resource: SupportedModule, headings: string[]): TableColumn<RecordRow>[] {
  const displayedHeadings = resource === 'partners'
    ? headings.map((heading) => heading === 'Submitted' ? 'Created' : heading)
    : headings
  return displayedHeadings.map((heading, index) => ({
    key: `${resource}-${index}`,
    heading,
    render: (row) => index === row.values.length - 1
      ? <span className="record-status">{row.status}</span>
      : <span title={row.values[index]}>{row.values[index]}</span>,
  }))
}

function toQuery(module: SupportedModule, params: ListParams): ListParams {
  if (module === 'orders') return { ...params, sort: params.sort ?? 'placedAt:desc' }
  if (module === 'customers') return { ...params, sort: params.sort ?? 'createdAt:desc' }
  if (module === 'partners') return { ...params, sort: params.sort ?? 'createdAt:desc' }
  return { ...params, sort: params.sort ?? 'createdAt:desc' }
}

export function AdminRecordsPanel({
  moduleId,
  moduleLabel,
  activeView,
  headings,
}: {
  moduleId: string
  moduleLabel: string
  activeView: string
  headings: string[]
}) {
  const {
    getAccessTokenSilently,
    isAuthenticated,
    isLoading: isAuthLoading,
    user,
  } = useAuth0()
  const resource = resourceByModule[moduleId]
  const availableView = activeView === 'Overview' ||
    (moduleId === 'dashboard' && activeView === 'Recent platform orders') ||
    (moduleId === 'orders' && activeView === 'All orders') ||
    (moduleId === 'customers' && activeView === 'Customer directory') ||
    (moduleId === 'partners' && activeView === 'Partner directory') ||
    (moduleId === 'products' && activeView === 'Product catalogue')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState(resource ? sortByModule[resource][0].value : '')
  const [offset, setOffset] = useState(0)
  const [storedState, setStoredState] = useState<StoredLoadState | null>(null)
  const requestKey = JSON.stringify({
    resource,
    activeView,
    offset,
    search: search.trim(),
    sort,
    subject: isAuthenticated ? user?.sub : undefined,
  })
  const columns = useMemo(() => dataColumns(resource ?? 'orders', headings), [headings, resource])

  useEffect(() => {
    if (!resource || !availableView || !superAdminApi.isConfigured || !isAuthenticated) return

    const controller = new AbortController()
    const params: ListParams = toQuery(resource, {
      limit: pageSize,
      offset,
      q: search.trim() || undefined,
      sort,
    })

    getAccessTokenSilently({
      authorizationParams: {
        audience: auth0Config.audience,
        scope: 'openid profile email',
      },
    })
      .then((accessToken) => {
        if (controller.signal.aborted) return null
        return listAdminResource(resource, params, controller.signal, accessToken)
      })
      .then((result) => {
        if (!result || controller.signal.aborted) return
        setStoredState({
          key: requestKey,
          value: {
            kind: 'ready',
            rows: mapRows(resource, result.data),
            pagination: result.meta.pagination,
          },
        })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        if (error instanceof ApiClientError) {
          setStoredState({
            key: requestKey,
            value: {
              kind: 'error',
              message: error.message,
              requestId: error.requestId,
            },
          })
          return
        }
        setStoredState({
          key: requestKey,
          value: { kind: 'error', message: 'An unexpected client error prevented loading records.' },
        })
      })

    return () => controller.abort()
  }, [
    activeView,
    availableView,
    getAccessTokenSilently,
    isAuthenticated,
    offset,
    requestKey,
    resource,
    search,
    sort,
  ])

  const title = moduleId === 'dashboard'
    ? 'Recent platform orders'
    : moduleId === 'partners'
    ? 'Partner directory'
    : moduleId === 'products'
      ? 'Product catalogue'
      : `${moduleLabel} records`

  if (!resource || !availableView) {
    return (
      <section className="panel records-panel" aria-labelledby="records-title">
        <div className="panel-heading">
          <div><h2 id="records-title">{activeView}</h2><p>This view has no approved read-only data contract in this batch.</p></div>
        </div>
        <DataTable
          columns={columns}
          rows={[]}
          getRowKey={(row) => row.id}
          emptyTitle="Read-only data unavailable"
          emptyMessage="This module view remains a presentation-only layout until its data model and API contract are approved."
          loading={false}
        />
      </section>
    )
  }

  const state: LoadState | { kind: 'unavailable'; message: string } | { kind: 'loading' } =
    !superAdminApi.isConfigured
      ? {
          kind: 'unavailable',
          message: 'Configure VITE_SUPER_ADMIN_API_BASE_URL. Admin routes are not registered until the approved authorization phase.',
        }
      : isAuthLoading
        ? { kind: 'loading' }
      : !isAuthenticated
        ? { kind: 'unavailable', message: unavailableMessage }
      : storedState?.key === requestKey
        ? storedState.value
        : { kind: 'loading' }
  const rows = state.kind === 'ready' ? state.rows : []
  const pagination = state.kind === 'ready' ? state.pagination : { limit: pageSize, offset, total: 0 }
  const error = state.kind === 'error'
    ? `${state.message}${state.requestId ? ` (Request ID: ${state.requestId})` : ''}`
    : undefined
  const emptyMessage = state.kind === 'unavailable' ? state.message : state.kind === 'ready'
    ? 'The API returned no records for these filters.'
    : unavailableMessage

  return (
    <section className="panel records-panel" aria-labelledby="records-title">
      <div className="panel-heading records-heading">
        <div>
          <h2 id="records-title">{title}</h2>
          <p>Read-only records from the authorized Super Admin API.</p>
        </div>
        <div className="records-actions">
          <label className="toolbar-search">
            <span className="sr-only">Search records</span>
            <input
              aria-label="Search records"
              onChange={(event) => {
                setSearch(event.target.value)
                setOffset(0)
              }}
              placeholder="Search records"
              value={search}
            />
          </label>
          <label className="records-sort">
            <span className="sr-only">Sort records</span>
            <select
              aria-label="Sort records"
              onChange={(event) => {
                setSort(event.target.value)
                setOffset(0)
              }}
              value={sort}
            >
              {sortByModule[resource].map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        emptyTitle={state.kind === 'ready' ? 'No records found' : 'Admin API unavailable'}
        emptyMessage={emptyMessage}
        loading={state.kind === 'loading'}
        error={error}
      />
      <div className="table-footer">
        <span>
          {state.kind === 'ready' && state.pagination.total > 0
            ? `Showing ${pagination.offset + 1}–${Math.min(pagination.offset + rows.length, pagination.total)} of ${pagination.total}`
            : state.kind === 'ready'
              ? 'Showing 0 records'
              : 'Record count unavailable'}
        </span>
        <div className="pagination-layout" aria-label="Pagination">
          <span>Rows per page</span>
          <span>{pageSize}</span>
          <button
            aria-label="Previous page"
            className="pagination-button"
            disabled={state.kind !== 'ready' || offset === 0}
            onClick={() => setOffset(Math.max(0, offset - pageSize))}
            type="button"
          >‹</button>
          <button
            aria-label="Next page"
            className="pagination-button"
            disabled={state.kind !== 'ready' || offset + pageSize >= pagination.total}
            onClick={() => setOffset(offset + pageSize)}
            type="button"
          >›</button>
        </div>
      </div>
    </section>
  )
}
