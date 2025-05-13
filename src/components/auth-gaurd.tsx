"use client";

import { useAuth } from "@/hooks/use-auth"; // Updated import
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode} from 'react';
import { useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Skeleton } from "@/components/ui/skeleton"; 

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth(); // Updated hook usage
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
    // Redirect authenticated users away from login page
    if (!isLoading && isAuthenticated && pathname === "/login") {
      router.push("/dashboard");
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

  // If not authenticated and on login page, render children (login page itself)
  if (!isAuthenticated && pathname === "/login") {
    return <>{children}</>;
  }
  
  // If authenticated and not on login page, wrap with AppLayout
  if (isAuthenticated && pathname !== "/login") {
    return <AppLayout>{children}</AppLayout>;
  }

  // Fallback for edge cases (e.g. redirecting)
  return null;
}
