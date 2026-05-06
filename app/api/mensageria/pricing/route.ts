import { NextRequest, NextResponse } from 'next/server'
import { estimateWhatsAppPrice, loadPricingRates } from '@/lib/whatsapp/pricing'
import { addLog } from '@/lib/whatsapp/store'
import type { PricingEstimateInput } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ rates: loadPricingRates() })
}

export async function POST(req: NextRequest) {
  const input = await req.json().catch(() => ({})) as PricingEstimateInput
  const estimate = estimateWhatsAppPrice(input)
  addLog({
    type: 'price_estimated',
    status: 'info',
    description: 'WhatsApp price estimate calculated.',
    safePayload: { ...estimate },
    recommendedAction: 'Confirm final charges in Meta billing before campaign launch.',
  })
  return NextResponse.json(estimate)
}
