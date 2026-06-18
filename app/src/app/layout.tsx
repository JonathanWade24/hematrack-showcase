import '@/styles/globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import { PHIProvider } from '@/contexts/PHIContext'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SCD Dashboard',
  description: 'Sickle Cell Disease Research Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased ${inter.className}`}>
        <Providers>
          <PHIProvider>
            {children}
          </PHIProvider>
        </Providers>
      </body>
    </html>
  )
}
