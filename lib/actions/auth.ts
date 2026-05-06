'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { destroySession } from '@/lib/auth'
import type { ApiResponse } from '@/lib/types'

const loginSchema = z.object({
  email: z.string().min(1, 'E-mail e obrigatorio').email('Digite um e-mail valido'),
  password: z.string().min(6, 'A senha deve ter no minimo 6 caracteres'),
})

export async function adminStoreLoginAction(
  _prevState: ApiResponse<{ token: string }> | null,
  formData: FormData,
): Promise<ApiResponse<{ token: string }>> {
  const parsed = loginSchema.safeParse({
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dados invalidos' }
  }

  const { email, password } = parsed.data
  const base = process.env.NEXT_PUBLIC_RUST_URL?.trim()

  if (!base) {
    const localEmail = process.env.LOCAL_ADMIN_EMAIL?.trim()
    const localPassword = process.env.LOCAL_ADMIN_PASSWORD?.trim()
    if (!localEmail || !localPassword || email !== localEmail || password !== localPassword) {
      return { success: false, error: 'E-mail ou senha invalidos' }
    }

    const token = Buffer.from(JSON.stringify({ id: 'local-admin', email, role: 'ADMIN', createdAt: Date.now() })).toString('base64')
    const cookieStore = await cookies()
    cookieStore.set('adminAuthToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })
    return { success: true, data: { token } }
  }

  const response = await fetch(new URL('/admin/login', base), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })

  if (!response.ok) {
    return { success: false, error: 'E-mail ou senha invalidos' }
  }

  const data = (await response.json()) as { token?: string }
  const token = data.token
  if (!token) return { success: false, error: 'Token nao retornado pela API de admin' }

  const cookieStore = await cookies()
  cookieStore.set('adminAuthToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Number(process.env.JWT_EXP_SECONDS || 604800),
    path: '/',
  })

  return { success: true, data: { token } }
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/login')
}
