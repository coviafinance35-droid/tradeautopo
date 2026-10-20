import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pump.fun LaunchGuard | Mobile Solana Sniper',
  description: 'Mobile-first Solana new-launch sniper and real-time risk guardian with automated safety verification and Safari controls.',
  openGraph: {
    title: 'Pump.fun LaunchGuard | Mobile Solana Sniper',
    description: 'Mobile-first Solana new-launch sniper and real-time risk guardian with automated safety verification and Safari controls.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pump.fun LaunchGuard | Mobile Solana Sniper',
    description: 'Mobile-first Solana new-launch sniper and real-time risk guardian with automated safety verification and Safari controls.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LaunchGuard',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark bg-[#070a12] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-touch-fullscreen" content="yes" />
      </head>
      <body suppressHydrationWarning className="min-h-screen bg-[#070a12] text-slate-100 font-sans">
        {children}
      </body>
    </html>
  );
}

