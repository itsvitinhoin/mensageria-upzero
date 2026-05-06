import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone, renderTemplate } from '@/lib/whatsapp/engine'
import { sendTemplateMessage } from '@/lib/whatsapp/provider'
import { addInboxMessage, addLog, createId, getState, maskId, maskPhone, updateIntegration } from '@/lib/whatsapp/store'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    recipientPhone?: string
    templateId?: string
    values?: Record<string, string>
    optInConfirmed?: boolean
  }

  const state = getState()
  const phoneNumber = state.phoneNumbers.find((item) => item.id === state.integration.phoneNumberId)
  const template = state.templates.find((item) => item.id === (body.templateId ?? state.integration.selectedTemplateId))
  const recipient = normalizePhone(body.recipientPhone ?? '')

  if (!state.integration.phoneNumberId || !phoneNumber) {
    const error = 'No WhatsApp phone number is selected.'
    addLog({ type: 'message_sent', status: 'failed', description: `Failed: ${error}`, recommendedAction: 'Select a connected WhatsApp phone number.' })
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  if (!template || template.status !== 'APPROVED') {
    const error = 'An APPROVED template is required to initiate a WhatsApp conversation.'
    addLog({ type: 'message_sent', status: 'failed', description: `Failed: ${error}`, recommendedAction: 'Select an approved template.' })
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  if (!recipient) {
    const error = 'Recipient WhatsApp number is invalid.'
    addLog({ type: 'message_sent', status: 'failed', description: `Failed: ${error}`, recommendedAction: 'Use country code + area code + phone number.' })
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  if (!body.optInConfirmed) {
    const error = 'WhatsApp opt-in confirmation is required before sending.'
    addLog({ type: 'message_sent', status: 'failed', description: `Failed: ${error}`, safePayload: { recipient: maskPhone(recipient) }, recommendedAction: 'Confirm the recipient opted in to WhatsApp messages.' })
    return NextResponse.json({ ok: false, error }, { status: 400 })
  }

  const values = body.values ?? {}
  const preview = renderTemplate(template.body, values)
  const result = await sendTemplateMessage({
    phoneNumberId: state.integration.phoneNumberId,
    to: recipient,
    template,
    values,
  })

  if (!result.ok) {
    addLog({
      type: 'message_sent',
      status: 'failed',
      description: 'Failed: Meta did not accept the test WhatsApp message.',
      safePayload: { recipient: maskPhone(recipient), template: template.name },
      error: result.error,
      recommendedAction: result.error?.action ?? 'Check phone number, template status, opt-in and Meta permissions.',
    })
    return NextResponse.json({ ok: false, error: result.error, preview }, { status: 200 })
  }

  const messageId = result.data?.messages?.[0]?.id ?? createId('wamid')
  updateIntegration({ lastTestMessageId: messageId })
  addInboxMessage({
    id: createId('msg'),
    metaMessageId: messageId,
    conversationId: `conv-${recipient}`,
    direction: 'outbound',
    from: state.integration.phoneNumberId,
    to: recipient,
    text: preview,
    status: 'sent',
    timestamp: new Date().toISOString(),
    templateId: template.id,
  })
  addLog({
    type: 'message_sent',
    status: 'success',
    description: 'WhatsApp template message sent through Meta.',
    safePayload: { messageId: maskId(messageId), recipient: maskPhone(recipient), template: template.name },
    recommendedAction: 'Open WhatsApp, confirm delivery, reply, then check Inbox/webhook.',
  })

  return NextResponse.json({ ok: true, messageId, preview })
}
