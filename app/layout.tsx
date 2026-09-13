import type { Metadata } from 'next'
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import { ViewTransition } from 'react'
import { AuthProvider } from '@/lib/auth-context'
import { DashboardThemeProvider } from '@/lib/dashboard-theme-context'
import { Navbar } from '@/components/shared/navbar'
import { site } from '@/lib/content'
import './globals.css'

// Weights are enumerated deliberately: V1 loaded 600 as well, which nothing used.
const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <DashboardThemeProvider>
            <Navbar />
            <ViewTransition>{children}</ViewTransition>
          </DashboardThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
