'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, LogOut, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/lib/actions/auth'
import type { SessionUser } from '@/lib/types'

type AdminBottomNavProps = {
  session?: SessionUser | null
  storeName?: string
}

const NAV = [
  { name: 'Mensageria', href: '/mensageria', icon: MessageSquare },
  { name: 'Privacy', href: '/privacy', icon: FileText },
]

export default function AdminBottomNav({ session: _session, storeName: _storeName }: AdminBottomNavProps) {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-stretch">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('flex flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors', active ? 'text-primary' : 'text-muted-foreground')}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-none">{item.name}</span>
            </Link>
          )
        })}
        <form action={logoutAction} className="flex flex-1">
          <button type="submit" className="flex flex-1 flex-col items-center justify-center gap-1 px-1 text-muted-foreground transition-colors">
            <LogOut className="h-5 w-5" />
            <span className="text-[11px] font-medium leading-none">Sair</span>
          </button>
        </form>
      </div>
    </nav>
  )
}
