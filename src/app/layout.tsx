import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono'; // Correctly removed if not used or causing issues
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth'; 
import { AuthGuard } from '@/components/auth-gaurd';

export const metadata: Metadata = {
  title: 'Verza', // Updated title
  description: 'Smart contract management for creators.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        className={`${GeistSans.variable} antialiased font-sans`}
        suppressHydrationWarning // Added to body
      >
        <AuthProvider> 
          <AuthGuard>
            {children}
          </AuthGuard>
          <Toaster />
        </AuthProvider> 
      </body>
    </html>
  );
}
