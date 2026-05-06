import { NextRequest, NextResponse } from 'next/server'
import { addInboxMessage, addLog, createId, getState, maskPhone } from '@/lib/whatsapp/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(getState().conversations)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { conversationId?: string; to?: string; text?: string }
  const state = getState()
  const conversation = state.conversations.find((item) => item.id === body.conversationId)

  if (!conversation && !body.to) {
    return NextResponse.json({ error: 'conversationId or to is required.' }, { status: 400 })
  }

  const recipient = body.to ?? conversation?.phone ?? ''
  if (!body.text?.trim()) return NextResponse.json({ error: 'Reply text is required.' }, { status: 400 })

  addInboxMessage({
    id: createId('msg'),
    conversationId: conversation?.id ?? `conv-${recipient}`,
    direction: 'outbound',
    from: state.integration.phoneNumberId ?? 'not-selected',
    to: recipient,
    text: body.text,
    status: 'queued',
    timestamp: new Date().toISOString(),
  })

  addLog({
    type: 'inbox_updated',
    status: 'info',
    description: 'Inbox reply queued locally. Free-form replies require an open 24h service window and a real send endpoint.',
    safePayload: { recipient: maskPhone(recipient) },
    recommendedAction: 'Use approved templates outside the 24h customer service window.',
  })

  return NextResponse.json(getState().conversations)
}
