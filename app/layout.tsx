import type { Metadata } from 'next'
import './globals.css'
import BlackHeader from '@/components/BlackHeader'
import ConditionalFooter from '@/components/ConditionalFooter'
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
      <body className="flex flex-col min-h-screen">
        <UserProvider>
          <LanguageProvider>
            <BlackHeader />
            <main className="flex-1">
              {children}
            </main>
            <ConditionalFooter />
          </LanguageProvider>
        </UserProvider>
      </body>
    </html>
  )
}
