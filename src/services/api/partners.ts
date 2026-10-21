import { isDemoMode } from '../../config/env'

export type PartnerType =
  | 'restaurant'
  | 'meat'
  | 'bakery'
  | 'fruits_vegetables'
  | 'local_store'

export type Partner = {
  partnerId: string
  businessName: string
  shopName: string
  type: PartnerType
  ownerEmail: string
  ownerPhone: string
  createdAt: string
  status: string
}

export type CreatePartnerInput = Pick<
  Partner,
  'businessName' | 'shopName' | 'type' | 'ownerEmail' | 'ownerPhone'
>

const storageKey = 'myshopzy_admin_demo_partners'

function isPartnerType(value: unknown): value is PartnerType {
  return value === 'restaurant' ||
    value === 'meat' ||
    value === 'bakery' ||
    value === 'fruits_vegetables' ||
    value === 'local_store'
}

function isPartner(value: unknown): value is Partner {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.partnerId === 'string' &&
    /^[A-Za-z0-9_-]{1,64}$/.test(record.partnerId) &&
    typeof record.businessName === 'string' &&
    typeof record.shopName === 'string' &&
    isPartnerType(record.type) &&
    typeof record.ownerEmail === 'string' &&
    typeof record.ownerPhone === 'string' &&
    typeof record.createdAt === 'string' &&
    typeof record.status === 'string'
}

function readDemoPartners(): Partner[] {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === null) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved demo partner data is invalid. Clear the demo partner storage to continue.')
  }

  if (!Array.isArray(parsed) || !parsed.every(isPartner)) {
    throw new Error('Saved demo partner data has an invalid format.')
  }
  return parsed
}

function requireDemoMode(): never {
  throw new Error('Partner API is not connected. Set VITE_DEMO_MODE=true to use local demo data.')
}

export async function listPartners(): Promise<Partner[]> {
  if (!isDemoMode) {
    // The production implementation will call GET /admin/partners.
    return requireDemoMode()
  }
  return readDemoPartners()
}

export async function createPartner(input: CreatePartnerInput): Promise<Partner> {
  if (!isDemoMode) {
    // The production implementation will call POST /admin/partners.
    return requireDemoMode()
  }

  const partner: Partner = {
    ...input,
    partnerId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: 'active',
  }
  const partners = readDemoPartners()
  window.localStorage.setItem(storageKey, JSON.stringify([partner, ...partners]))
  return partner
}
