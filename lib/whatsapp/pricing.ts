import fs from 'fs'
import path from 'path'
import type { MessageCategory, PricingEstimate, PricingEstimateInput, PricingRate } from './types'

export const PRICING_DISCLAIMER =
  'Final charges are determined by Meta. This is an estimate based on the configured rate card.'

const DEFAULT_RATES: PricingRate[] = [
  { country: 'BR', currency: 'USD', category: 'Marketing', unitCost: 0, source: 'example' },
  { country: 'BR', currency: 'USD', category: 'Utility', unitCost: 0, source: 'example' },
  { country: 'BR', currency: 'USD', category: 'Authentication', unitCost: 0, source: 'example' },
  { country: 'BR', currency: 'USD', category: 'Service', unitCost: 0, source: 'example' },
]

function ratesPath() {
  const configuredFile = process.env.WHATSAPP_PRICING_FILE?.replace(/[^a-zA-Z0-9_.-]/g, '')
  return path.join(process.cwd(), 'data', configuredFile || 'whatsapp-pricing.example.json')
}

export function loadPricingRates(): PricingRate[] {
  try {
    const parsed = JSON.parse(fs.readFileSync(ratesPath(), 'utf-8')) as { rates?: PricingRate[] }
    if (Array.isArray(parsed.rates)) return parsed.rates
  } catch {
    // Empty/default pricing is intentional when no rate card has been configured.
  }

  return DEFAULT_RATES
}

export function estimateWhatsAppPrice(input: PricingEstimateInput): PricingEstimate {
  const quantity = Math.max(0, Number(input.quantity) || 0)
  const rates = loadPricingRates()
  const normalizedCategory = input.category as MessageCategory
  const configured = rates.find((rate) =>
    rate.country.toUpperCase() === input.country.toUpperCase() &&
    rate.currency.toUpperCase() === input.currency.toUpperCase() &&
    rate.category === normalizedCategory,
  )

  const manualUnitCost = Number(input.unitCost)
  const hasManualCost = Number.isFinite(manualUnitCost) && manualUnitCost > 0
  const unitCost = hasManualCost ? manualUnitCost : configured?.unitCost ?? 0

  return {
    category: normalizedCategory,
    country: input.country.toUpperCase(),
    quantity,
    currency: input.currency.toUpperCase(),
    unitCost,
    total: Number((unitCost * quantity).toFixed(6)),
    source: hasManualCost ? 'manual' : configured?.source ?? 'example',
    disclaimer: PRICING_DISCLAIMER,
  }
}
