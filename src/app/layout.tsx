import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth'; // Updated import
import { AuthGuard } from '@/components/auth-gaurd';

export const metadata: Metadata = {
  title: 'SoloLedger Lite',
  description: 'Smart contract management for creators.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased font-sans`}>
        <AuthProvider> {/* Updated Provider */}
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </AuthProvider> {/* Updated Provider */}
      </body>
    </html>
  );
}
