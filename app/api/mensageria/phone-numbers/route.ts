import { NextRequest, NextResponse } from 'next/server'
import { listPhoneNumbers } from '@/lib/whatsapp/provider'
import { addLog, getState, maskId, updateState } from '@/lib/whatsapp/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const state = getState()
  const wabaId = new URL(req.url).searchParams.get('wabaId') ?? state.integration.wabaId

  if (!wabaId) {
    return NextResponse.json({ data: state.phoneNumbers, error: { message: 'No WABA selected.' }, source: 'local' })
  }

  const result = await listPhoneNumbers(wabaId)

  if (!result.ok) {
    addLog({
      type: 'phone_selected',
      status: 'failed',
      description: 'Failed: WhatsApp phone numbers could not be loaded from Meta.',
      safePayload: { wabaId: maskId(wabaId) },
      error: result.error,
      recommendedAction: result.error?.action,
    })
    return NextResponse.json({ data: state.phoneNumbers, error: result.error, source: 'local' })
  }

  updateState((next) => {
    next.phoneNumbers = result.data ?? []
    next.integration.lastSyncAt = new Date().toISOString()
  })
  addLog({ type: 'phone_selected', status: 'info', description: 'WhatsApp phone numbers loaded from Meta.', safePayload: { wabaId: maskId(wabaId), count: result.data?.length ?? 0 } })
  return NextResponse.json({ data: result.data ?? [], source: 'meta' })
}
