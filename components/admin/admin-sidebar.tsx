'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { FileText, LogOut, MessageSquare, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/lib/actions/auth'
import type { SessionUser } from '@/lib/types'

interface AdminSidebarProps {
  session?: SessionUser | null
  storeName?: string
}

const NAV_ITEMS = [
  { name: 'Mensageria', href: '/mensageria', icon: MessageSquare },
  { name: 'Privacy', href: '/privacy', icon: FileText },
]

export function AdminSidebar({ session, storeName }: AdminSidebarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  if (pathname === '/login') return null

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border/60 bg-card/95 backdrop-blur">
      <div className="flex h-20 shrink-0 items-center gap-3 border-b border-border/60 px-5">
        <Image src="/icon.png" alt="Up Zero" width={34} height={34} className="h-9 w-9 rounded-lg object-contain" priority />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">{storeName || 'Up Zero'}</p>
          <p className="truncate text-[11px] text-muted-foreground">WhatsApp Business</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border/60 p-4">
        {session ? (
          <div className="mb-3 min-w-0">
            <p className="truncate text-[13px] font-medium">{session.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{session.email}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 flex-1 gap-2 text-xs"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            Tema
          </Button>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon" className="h-9 w-9" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  )
}
