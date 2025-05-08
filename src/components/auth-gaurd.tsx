"use client";

import { useMockAuth } from "@/hooks/use-mock-auth";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode} from 'react';
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout"; // Import AppLayout
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useMockAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== "/login") {
    // This case should ideally be handled by the useEffect redirect,
    // but as a fallback, show loading or null.
    return null; 
  }
  
  if (isAuthenticated && pathname === "/login") {
    router.push("/dashboard"); // Redirect to dashboard if authenticated and on login page
    return null;
  }

  // If authenticated and not on login page, wrap with AppLayout
  if (isAuthenticated && pathname !== "/login") {
    return <AppLayout>{children}</AppLayout>;
  }

  // If not authenticated and on login page, render children (login page itself)
  return <>{children}</>;
}
