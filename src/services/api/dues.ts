import { isDemoMode } from '../../config/env'

export type DueStatus = 'pending-review' | 'confirmed' | 'waived' | 'paid'

export type DuePayment = {
  amountMinor: number
  reference: string
  recordedAt: string
}

export type Due = {
  dueId: string
  customerId: string
  customerName: string
  orderId: string
  reason: string
  amountMinor: number
  status: DueStatus
  riderNote: string
  waiverReason: string | null
  payments: DuePayment[]
}

const storageKey = 'myshopzy_admin_demo_dues'

const sampleDues: Due[] = [
  {
    dueId: 'due-1001',
    customerId: 'customer-101',
    customerName: 'Ananya Rao',
    orderId: 'ORD-2841',
    reason: 'Cash on delivery shortfall',
    amountMinor: 12500,
    status: 'pending-review',
    riderNote: 'Customer asked to verify the change given at delivery.',
    waiverReason: null,
    payments: [],
  },
  {
    dueId: 'due-1002',
    customerId: 'customer-102',
    customerName: 'Kiran Kumar',
    orderId: 'ORD-2836',
    reason: 'Additional delivery charge',
    amountMinor: 5000,
    status: 'confirmed',
    riderNote: 'Additional distance approved by dispatch.',
    waiverReason: null,
    payments: [],
  },
  {
    dueId: 'due-1003',
    customerId: 'customer-103',
    customerName: 'Meera Reddy',
    orderId: 'ORD-2829',
    reason: 'Unpaid order balance',
    amountMinor: 8200,
    status: 'pending-review',
    riderNote: 'Payment could not be collected at the door.',
    waiverReason: null,
    payments: [],
  },
]

function isDueStatus(value: unknown): value is DueStatus {
  return value === 'pending-review' || value === 'confirmed' || value === 'waived' || value === 'paid'
}

function isDuePayment(value: unknown): value is DuePayment {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Number.isSafeInteger(record.amountMinor) &&
    typeof record.amountMinor === 'number' &&
    record.amountMinor > 0 &&
    typeof record.reference === 'string' &&
    typeof record.recordedAt === 'string'
}

function isDue(value: unknown): value is Due {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record.dueId === 'string' &&
    typeof record.customerId === 'string' &&
    typeof record.customerName === 'string' &&
    typeof record.orderId === 'string' &&
    typeof record.reason === 'string' &&
    typeof record.amountMinor === 'number' &&
    Number.isSafeInteger(record.amountMinor) &&
    record.amountMinor >= 0 &&
    isDueStatus(record.status) &&
    typeof record.riderNote === 'string' &&
    (typeof record.waiverReason === 'string' || record.waiverReason === null) &&
    Array.isArray(record.payments) &&
    record.payments.every(isDuePayment)
}

function readDemoDues(): Due[] {
  const saved = window.localStorage.getItem(storageKey)
  if (saved === null) {
    const initialDues = sampleDues.map((due) => ({ ...due, payments: [] }))
    window.localStorage.setItem(storageKey, JSON.stringify(initialDues))
    return initialDues
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(saved)
  } catch {
    throw new Error('Saved demo dues data is invalid. Clear the demo dues storage to continue.')
  }

  if (!Array.isArray(parsed) || !parsed.every(isDue)) {
    throw new Error('Saved demo dues data has an invalid format.')
  }
  return parsed
}

function requireDemoMode(): never {
  throw new Error('Dues API is not connected. Set VITE_DEMO_MODE=true to use local demo data.')
}

function updateDue(dueId: string, update: (due: Due) => Due): Due {
  const dues = readDemoDues()
  const index = dues.findIndex((due) => due.dueId === dueId)
  if (index === -1) throw new Error('The selected due could not be found.')

  const updatedDue = update(dues[index])
  const nextDues = dues.map((due, dueIndex) => dueIndex === index ? updatedDue : due)
  window.localStorage.setItem(storageKey, JSON.stringify(nextDues))
  return updatedDue
}

export async function listDues(): Promise<Due[]> {
  if (!isDemoMode) {
    // The production implementation will call GET /admin/dues.
    return requireDemoMode()
  }
  return readDemoDues()
}

export async function confirmDue(dueId: string): Promise<Due> {
  if (!isDemoMode) {
    // The production implementation will call POST /admin/dues/:id/confirm.
    return requireDemoMode()
  }
  return updateDue(dueId, (due) => {
    if (due.status !== 'pending-review') throw new Error('Only dues pending review can be confirmed.')
    return { ...due, status: 'confirmed' }
  })
}

export async function waiveDue(dueId: string, reason: string): Promise<Due> {
  if (!isDemoMode) {
    // The production implementation will call POST /admin/dues/:id/waive.
    return requireDemoMode()
  }
  const normalizedReason = reason.trim()
  if (!normalizedReason) throw new Error('A reason is required to waive a due.')
  return updateDue(dueId, (due) => {
    if (due.status !== 'pending-review' && due.status !== 'confirmed') {
      throw new Error('Only pending or confirmed dues can be waived.')
    }
    return { ...due, status: 'waived', waiverReason: normalizedReason }
  })
}

export async function recordDuePayment(
  dueId: string,
  input: { amountMinor: number; reference: string },
): Promise<Due> {
  if (!isDemoMode) {
    // The production implementation will call POST /admin/customers/:id/dues/payments.
    return requireDemoMode()
  }
  const reference = input.reference.trim()
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('Enter a valid payment amount greater than zero.')
  }
  if (!reference) throw new Error('A payment reference is required.')
  return updateDue(dueId, (due) => {
    if (due.status !== 'confirmed') throw new Error('Payments can only be recorded for confirmed dues.')
    if (input.amountMinor > due.amountMinor) throw new Error('Payment amount cannot exceed the remaining due.')
    const amountMinor = due.amountMinor - input.amountMinor
    return {
      ...due,
      amountMinor,
      status: amountMinor === 0 ? 'paid' : due.status,
      payments: [
        ...due.payments,
        { amountMinor: input.amountMinor, reference, recordedAt: new Date().toISOString() },
      ],
    }
  })
}
