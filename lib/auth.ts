import { cookies } from 'next/headers'
import type { SessionUser, UserRole } from './types'

function normalizeRole(value: unknown): UserRole {
  const role = String(value ?? '').toUpperCase()
  return role === 'SALES_MANAGER' ? 'SALES_MANAGER' : 'ADMIN'
}

function decodeTokenPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    const raw = parts.length >= 2 ? parts[1] : token
    const normalized = raw.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('adminAuthToken')
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('adminAuthToken')?.value
  if (!token) return null

  const payload = decodeTokenPayload(token)
  if (!payload) {
    return { id: 'admin-session', name: 'Admin', email: 'admin@local', role: 'ADMIN' }
  }

  const storeId = Number(payload.store_id ?? payload.storeId)
  return {
    id: String(payload.id ?? payload.userId ?? payload.sub ?? 'admin-session'),
    name: String(payload.name ?? payload.email ?? 'Admin'),
    email: String(payload.email ?? 'admin@local'),
    role: normalizeRole(payload.role),
    storeId: Number.isInteger(storeId) && storeId > 0 ? storeId : undefined,
  }
}
