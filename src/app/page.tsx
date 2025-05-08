"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMockAuth } from '@/hooks/use-mock-auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useMockAuth();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router, isAuthenticated, isLoading]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading SoloLedger Lite...</p>
    </div>
  );
}
