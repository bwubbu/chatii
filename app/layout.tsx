import type { Metadata } from 'next'
import './globals.css'
import BlackHeader from '@/components/BlackHeader'
import { UserProvider } from '@/components/UserContext'
import { usePathname } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Chatii',
  description: 'Your AI Chat Assistant',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isChatPage = pathname.startsWith('/chat');
  return (
    <html lang="en">
      <body>
        <UserProvider>
          {!isChatPage && <BlackHeader />}
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
