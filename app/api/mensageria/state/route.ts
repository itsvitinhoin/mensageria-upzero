import { NextResponse } from 'next/server'
import { buildReviewChecklist, getState } from '@/lib/whatsapp/store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const state = getState()
  return NextResponse.json({
    ...state,
    reviewChecklist: buildReviewChecklist(state),
  })
}
