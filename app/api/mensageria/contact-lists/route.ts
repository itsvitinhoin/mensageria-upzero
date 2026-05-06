import { NextRequest, NextResponse } from 'next/server'
import { normalizePhone } from '@/lib/whatsapp/engine'
import { addLog, createId, deleteContactList, getState, saveContact, saveContactList } from '@/lib/whatsapp/store'
import type { Contact, ContactList } from '@/lib/whatsapp/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = getState()
  return NextResponse.json({ contacts: state.contacts, lists: state.contactLists })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    kind?: 'contact' | 'list'
    id?: string
    name?: string
    phone?: string
    countryCode?: string
    email?: string
    tags?: string[]
    source?: string
    optInWhatsapp?: boolean
    contactIds?: string[]
    filters?: ContactList['filters']
    description?: string
  }
  const now = new Date().toISOString()

  if (body.kind === 'contact') {
    const normalizedPhone = normalizePhone(body.phone ?? '', body.countryCode ?? '55')
    if (!normalizedPhone) return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 })

    const contact: Contact = {
      id: body.id ?? createId('contact'),
      name: String(body.name ?? 'Contato').trim(),
      phone: normalizedPhone,
      countryCode: body.countryCode ?? normalizedPhone.slice(0, 2),
      email: body.email,
      tags: body.tags ?? [],
      source: body.source,
      status: 'active',
      optInWhatsapp: Boolean(body.optInWhatsapp),
      createdAt: now,
      updatedAt: now,
    }
    saveContact(contact)
    addLog({
      type: 'contact_created',
      status: contact.optInWhatsapp ? 'success' : 'needs_attention',
      description: contact.optInWhatsapp ? 'Contact saved with WhatsApp opt-in.' : 'Contact saved without WhatsApp opt-in.',
      recommendedAction: contact.optInWhatsapp ? 'Add the contact to a list or campaign.' : 'Do not send campaigns until opt-in is confirmed.',
    })
    return NextResponse.json(getState())
  }

  const list: ContactList = {
    id: body.id ?? createId('list'),
    name: String(body.name ?? 'Nova lista').trim(),
    description: body.description,
    filters: body.filters ?? {},
    contactIds: body.contactIds ?? [],
    createdAt: now,
    updatedAt: now,
  }
  saveContactList(list)
  addLog({
    type: 'contact_list_created',
    status: 'success',
    description: 'Contact list saved.',
    safePayload: { name: list.name, contacts: list.contactIds.length },
    recommendedAction: 'Associate this list with a campaign and verify opt-in before sending.',
  })
  return NextResponse.json(getState())
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Partial<ContactList> & { id?: string }
  if (!body.id) return NextResponse.json({ error: 'List id is required.' }, { status: 400 })

  const existing = getState().contactLists.find((list) => list.id === body.id)
  if (!existing) return NextResponse.json({ error: 'List not found.' }, { status: 404 })

  saveContactList({ ...existing, ...body, updatedAt: new Date().toISOString() })
  return NextResponse.json(getState())
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'List id is required.' }, { status: 400 })
  deleteContactList(id)
  return NextResponse.json(getState())
}
