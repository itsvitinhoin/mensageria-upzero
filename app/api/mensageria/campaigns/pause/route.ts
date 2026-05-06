import { NextRequest, NextResponse } from 'next/server'
import { addLog, getState, saveCampaign } from '@/lib/whatsapp/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { campaignId } = await req.json().catch(() => ({})) as { campaignId?: string }
  const campaign = getState().campaigns.find((item) => item.id === campaignId)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 })

  saveCampaign({ ...campaign, status: 'Paused', updatedAt: new Date().toISOString() })
  addLog({
    type: 'campaign_paused',
    status: 'success',
    description: 'Campaign paused.',
    safePayload: { campaign: campaign.name },
    recommendedAction: 'Resume only after reviewing audience, opt-in and template status.',
  })
  return NextResponse.json(getState())
}
