import { NextResponse } from 'next/server'
import { listBusinesses } from '@/lib/whatsapp/provider'
import { addLog, getState, updateState } from '@/lib/whatsapp/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await listBusinesses()

  if (!result.ok) {
    addLog({
      type: 'business_loaded',
      status: 'failed',
      description: 'Failed: Business Managers could not be loaded from Meta.',
      error: result.error,
      recommendedAction: result.error?.action,
    })
    return NextResponse.json({ data: getState().businesses, error: result.error, source: 'local' })
  }

  updateState((state) => {
    state.businesses = result.data ?? []
    state.integration.lastSyncAt = new Date().toISOString()
  })
  addLog({ type: 'business_loaded', status: 'success', description: 'Business Managers loaded from Meta.', safePayload: { count: result.data?.length ?? 0 } })
  return NextResponse.json({ data: result.data ?? [], source: 'meta' })
}
