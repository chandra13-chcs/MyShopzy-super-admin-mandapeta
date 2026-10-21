export type Pagination = {
  limit: number
  offset: number
  total: number
}

export type ApiList<T> = {
  data: T[]
  meta: {
    requestId?: string
    pagination: Pagination
  }
}

export type ApiItem<T> = {
  data: T
  meta: {
    requestId?: string
  }
}

export type ApiErrorDetail = {
  field?: string
  code?: string
  message?: string
}

export class ApiClientError extends Error {
  readonly status: number | null
  readonly code: string
  readonly requestId?: string
  readonly details?: ApiErrorDetail[]

  constructor({
    message,
    status = null,
    code = 'API_ERROR',
    requestId,
    details,
  }: {
    message: string
    status?: number | null
    code?: string
    requestId?: string
    details?: ApiErrorDetail[]
  }) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
  }
}

export type ListParams = {
  limit?: number
  offset?: number
  q?: string
  sort?: string
  [filter: string]: string | number | undefined
}

export type OrderListItem = {
  id: string
  customerId: string
  customerName: string
  partnerId: string
  partnerName: string
  shopId: string
  shopName: string
  status: string
  currency: string
  itemsSubtotalMinor: string
  deliveryFeeMinor: string
  discountMinor: string
  totalMinor: string
  placedAt: string
}

export type CustomerListItem = {
  id: string
  displayName: string
  status: string
  createdAt: string
}

export type PartnerListItem = {
  id: string
  name: string
  partnerType: string
  status: string
  createdAt: string
}

export type ProductStatus = 'active' | 'archived'

export type ProductListItem = {
  id: string
  name: string
  partnerId: string
  partnerName: string
  shopId: string
  shopName: string
  categoryId: string | null
  categoryName: string | null
  sku: string | null
  priceMinor: string
  currency: string
  inventoryQuantity: number | null
  isAvailable: boolean
  status: ProductStatus
  listingStatus: ProductStatus
  createdAt: string
}

export type OrderDetailItem = {
  productId: string
  productName: string
  sku: string | null
  unitPriceMinor: string
  quantity: number
  lineTotalMinor: string
  currency: string
}

export type OrderDetail = OrderListItem & {
  items: OrderDetailItem[]
}

export type CustomerDetail = CustomerListItem

export type PartnerShop = {
  id: string
  name: string
  status: string
  createdAt: string
}

export type PartnerDetail = PartnerListItem & {
  shops: PartnerShop[]
}

export type ProductDetail = ProductListItem & {
  updatedAt: string
}

export type AdminResource = 'orders' | 'customers' | 'partners' | 'products'
export type AdminRecordByResource = {
  orders: OrderListItem
  customers: CustomerListItem
  partners: PartnerListItem
  products: ProductListItem
}
export type AdminDetailByResource = {
  orders: OrderDetail
  customers: CustomerDetail
  partners: PartnerDetail
  products: ProductDetail
}

type ApiEnvelope<T> = {
  data: T
  meta?: {
    requestId?: string
    pagination?: Pagination
  }
  error?: {
    code?: string
    message?: string
    // Legacy response compatibility; new responses place requestId in meta.
    requestId?: string
    details?: ApiErrorDetail[]
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPagination(value: unknown): value is Pagination {
  if (!isRecord(value)) return false
  return ['limit', 'offset', 'total'].every((key) =>
    Number.isSafeInteger(value[key]) && Number(value[key]) >= 0,
  )
}

function configuredBaseUrl() {
  const baseUrl = import.meta.env.VITE_SUPER_ADMIN_API_BASE_URL?.trim() ?? ''
  return baseUrl.replace(/\/+$/, '')
}

export class SuperAdminApiClient {
  private readonly baseUrl: string

  constructor(baseUrl = configuredBaseUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, '')
  }

  get isConfigured() {
    return this.baseUrl.length > 0
  }

  async list<T>(
    path: string,
    params: ListParams,
    signal?: AbortSignal,
    accessToken?: string,
  ): Promise<ApiList<T>> {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }
    const payload = await this.request(url.toString(), signal, accessToken)
    if (
      !isRecord(payload) ||
      !Array.isArray(payload.data) ||
      !isRecord(payload.meta) ||
      !isPagination(payload.meta.pagination)
    ) {
      throw new ApiClientError({
        message: 'The API returned an invalid list response.',
        code: 'INVALID_RESPONSE',
      })
    }
    return payload as ApiList<T>
  }

  async get<T>(path: string, signal?: AbortSignal, accessToken?: string): Promise<ApiItem<T>> {
    const url = new URL(`${this.baseUrl}${path}`, window.location.origin)
    const payload = await this.request(url.toString(), signal, accessToken)
    if (!isRecord(payload) || !('data' in payload) || !isRecord(payload.meta)) {
      throw new ApiClientError({
        message: 'The API returned an invalid detail response.',
        code: 'INVALID_RESPONSE',
      })
    }
    return payload as ApiItem<T>
  }

  private async request(
    url: string,
    signal?: AbortSignal,
    accessToken?: string,
  ): Promise<unknown> {
    if (!this.isConfigured) {
      throw new ApiClientError({
        message: 'Configure VITE_SUPER_ADMIN_API_BASE_URL to connect an approved Super Admin API.',
        code: 'API_NOT_CONFIGURED',
      })
    }
    if (!accessToken) {
      throw new ApiClientError({
        message: 'Sign in to an authorized Super Admin account before requesting records.',
        code: 'AUTHENTICATION_REQUIRED',
      })
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        credentials: 'omit',
        signal,
      })
    } catch (error) {
      if (signal?.aborted) throw error
      throw new ApiClientError({
        message: 'The Super Admin API could not be reached.',
        code: 'NETWORK_ERROR',
      })
    }

    const responseText = await response.text()
    let payload: unknown
    try {
      payload = responseText ? JSON.parse(responseText) : null
    } catch {
      throw new ApiClientError({
        message: 'The Super Admin API returned an invalid JSON response.',
        status: response.status,
        code: 'INVALID_RESPONSE',
      })
    }

    if (!response.ok) {
      const body = isRecord(payload) ? payload as ApiEnvelope<unknown> : null
      const apiError = body && isRecord(body.error) ? body.error : null
      const requestId = body && isRecord(body.meta) && typeof body.meta.requestId === 'string'
        ? body.meta.requestId
        : typeof apiError?.requestId === 'string' ? apiError.requestId : undefined
      throw new ApiClientError({
        message: typeof apiError?.message === 'string'
          ? apiError.message
          : `The Super Admin API request failed with status ${response.status}.`,
        status: response.status,
        code: typeof apiError?.code === 'string' ? apiError.code : 'HTTP_ERROR',
        requestId,
        details: Array.isArray(apiError?.details) ? apiError.details as ApiErrorDetail[] : undefined,
      })
    }

    return payload
  }
}

export const superAdminApi = new SuperAdminApiClient()

const resourcePaths: Record<AdminResource, string> = {
  orders: '/api/v1/admin/orders',
  customers: '/api/v1/admin/customers',
  partners: '/api/v1/admin/partners',
  products: '/api/v1/admin/catalog/products',
}

export function listAdminResource<R extends AdminResource>(
  resource: R,
  params: ListParams,
  signal?: AbortSignal,
  accessToken?: string,
) {
  return superAdminApi.list<AdminRecordByResource[R]>(
    resourcePaths[resource],
    params,
    signal,
    accessToken,
  )
}

export function getAdminResource<R extends AdminResource>(
  resource: R,
  id: string,
  signal?: AbortSignal,
  accessToken?: string,
) {
  return superAdminApi.get<AdminDetailByResource[R]>(
    `${resourcePaths[resource]}/${encodeURIComponent(id)}`,
    signal,
    accessToken,
  )
}
