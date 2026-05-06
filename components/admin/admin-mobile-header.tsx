'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionUser } from '@/lib/types'

type AdminMobileHeaderProps = {
  session?: SessionUser | null
  storeName?: string
}

export default function AdminMobileHeader({ session: _session, storeName }: AdminMobileHeaderProps) {
  const pathname = usePathname()

  if (pathname === '/login') return null

  return (
    <div className="md:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/60 bg-card/95 px-4 backdrop-blur">
      <Link href="/mensageria" className="flex min-w-0 items-center gap-2">
        <Image src="/icon.png" alt="Up Zero" width={26} height={26} className="h-7 w-7 rounded-lg object-contain" priority />
        <div className="min-w-0">
          <span className="block truncate whitespace-nowrap text-sm font-semibold leading-tight">
            {storeName || 'Up Zero'}
          </span>
          <span className="block truncate text-[10px] text-muted-foreground leading-tight">
            Mensageria WhatsApp
          </span>
        </div>
      </Link>

      <Link href="/privacy">
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg" aria-label="Privacy policy">
          <FileText className="h-5 w-5" />
        </Button>
      </Link>
    </div>
  )
}
