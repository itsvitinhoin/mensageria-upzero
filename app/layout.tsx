import React from 'react'
import Script from 'next/script'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import AdminMobileHeader from '@/components/admin/admin-mobile-header'
import AdminBottomNav from '@/components/admin/admin-bottom-nav'
import AdminAuthGuard from '@/components/admin/admin-auth-guard'
import type { SessionUser } from '@/lib/types'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Up Zero | Mensageria WhatsApp',
  description: 'Operacao WhatsApp Business Cloud API, templates, inbox, campanhas e Meta App Review.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function decodeAdminSession(token: string | undefined): SessionUser | null {
  if (!token) return null

  try {
    const parts = token.split('.')
    const payload =
      parts.length >= 2
        ? JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8'))
        : JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))

    return {
      id: String(payload.id ?? payload.userId ?? payload.sub ?? 'admin-session'),
      name: String(payload.name ?? payload.email ?? 'Admin'),
      email: String(payload.email ?? 'admin@local'),
      role: 'ADMIN',
      storeId: Number.isInteger(Number(payload.store_id ?? payload.storeId))
        ? Number(payload.store_id ?? payload.storeId)
        : undefined,
    }
  } catch {
    return {
      id: 'admin-session',
      name: 'Admin',
      email: 'admin@local',
      role: 'ADMIN',
    }
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const adminToken = cookieStore.get('adminAuthToken')?.value
  const session = decodeAdminSession(adminToken)
  const isLoggedIn = Boolean(session)

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="admin-theme">
          <AdminAuthGuard isLoggedIn={isLoggedIn}>
            {isLoggedIn ? (
              <>
                <div className="flex h-screen bg-[radial-gradient(circle_at_top,_hsl(var(--muted))_0%,_transparent_45%),linear-gradient(180deg,_hsl(var(--background))_0%,_hsl(var(--muted)/0.35)_100%)] text-sm">
                  <div className="hidden md:block">
                    <AdminSidebar session={session} storeName="Up Zero" />
                  </div>
                  <main className="w-full flex-1 overflow-auto pb-20 md:pb-0">
                    <AdminMobileHeader session={session} storeName="Up Zero" />
                    {children}
                  </main>
                </div>
                <AdminBottomNav session={session} storeName="Up Zero" />
              </>
            ) : (
              children
            )}
            <Toaster />
          </AdminAuthGuard>
        </ThemeProvider>
        <Analytics />
        <Script
          id="facebook-sdk-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.fbAsyncInit = function() {
                FB.init({
                  appId: '${process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? ''}',
                  cookie: true,
                  xfbml: false,
                  version: 'v19.0'
                });
                FB.AppEvents.logPageView();
              };
              (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) { return; }
                js = d.createElement(s); js.id = id;
                js.src = 'https://connect.facebook.net/pt_BR/sdk.js';
                fjs.parentNode.insertBefore(js, fjs);
              }(document, 'script', 'facebook-jssdk'));
            `,
          }}
        />
      </body>
    </html>
  )
}
