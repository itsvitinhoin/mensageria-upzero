import { NextRequest, NextResponse } from 'next/server'
import { getState, updateState } from '@/lib/whatsapp/store'
import type { LogStatus, WhatsAppLogType } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const params = new URL(req.url).searchParams
  const status = params.get('status') as LogStatus | null
  const type = params.get('type') as WhatsAppLogType | null
  const limit = Math.min(Number(params.get('limit') ?? '300'), 1000)
  let logs = getState().logs

  if (status) logs = logs.filter((log) => log.status === status)
  if (type) logs = logs.filter((log) => log.type === type)

  return NextResponse.json(logs.slice(0, limit))
}

export async function DELETE() {
  updateState((state) => {
    state.logs = []
  })
  return NextResponse.json({ ok: true })
}
