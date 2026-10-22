import type { PartnerType } from '../services/api/partners'

// Production reads commission rates from the backend.
export const partnerCommissionRates: Record<PartnerType, number> = {
  restaurant: 10,
  meat: 10,
  bakery: 10,
  fruits_vegetables: 5,
  local_store: 5,
}
