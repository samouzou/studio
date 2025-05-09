import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono'; // Corrected import path
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { MockAuthProvider } from '@/hooks/use-mock-auth';
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
        <MockAuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </MockAuthProvider>
      </body>
    </html>
  );
}
