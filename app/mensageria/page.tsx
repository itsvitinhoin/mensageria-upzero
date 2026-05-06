import MensageriaPage from '@/components/admin/mensageria/mensageria-page'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mensageria | Admin',
  description: 'Automação de mensagens WhatsApp Business',
}

export default async function AdminMensageriaPage() {
  const cookieStore = await cookies()
  if (!cookieStore.get('adminAuthToken')?.value) {
    redirect('/login')
  }

  return <MensageriaPage />
}
