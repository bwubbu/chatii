import type { Metadata } from 'next'
import './globals.css'
import BlackHeader from '@/components/BlackHeader'
import { UserProvider } from '@/components/UserContext'
import { LanguageProvider } from '@/components/LanguageContext'

export const metadata: Metadata = {
  title: 'RamahAI',
  description: 'Your AI Chat Assistant',
  generator: 'v0.dev',
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark.png', type: 'image/png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: [
      { url: '/icon.png', type: 'image/png' },
    ],
    shortcut: '/icon.png',
  },
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
          <LanguageProvider>
            <BlackHeader />
            {children}
          </LanguageProvider>
        </UserProvider>
      </body>
    </html>
  )
}
