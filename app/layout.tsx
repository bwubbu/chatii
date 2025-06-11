import type { Metadata } from 'next'
import './globals.css'
import BlackHeader from '@/components/BlackHeader'
import { UserProvider } from '@/components/UserContext'

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
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <BlackHeader />
          {children}
        </UserProvider>
      </body>
    </html>
  )
}
