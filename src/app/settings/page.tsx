
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { PageHeader } from "@/components/page-header";
import { SubscriptionCard } from "@/components/settings/subscription-card";
import { StripeConnectCard } from "@/components/settings/stripe-connect-card";
import { useAuth } from "@/hooks/use-auth";
import { AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, isLoading, refreshAuthUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isRefreshingStripeStatus, setIsRefreshingStripeStatus] = useState(false);

  useEffect(() => {
    if (searchParams.get('stripe_connect_return') === 'true') {
      setIsRefreshingStripeStatus(true);
      toast({
        title: "Refreshing Stripe Status",
        description: "Attempting to fetch the latest status for your Stripe Connected Account...",
      });
      refreshAuthUser().finally(() => {
        setIsRefreshingStripeStatus(false);
        // Clean the URL by removing query parameters
        const newPath = window.location.pathname; 
        router.replace(newPath, { scroll: false });
        toast({
          title: "Stripe Status Refreshed",
          description: "Your Stripe Connected Account status should now be up to date. If it still shows incomplete, the Stripe webhook might be slightly delayed.",
          duration: 7000,
        });
      });
    }
  }, [searchParams, refreshAuthUser, router, toast]);


  if (isLoading || isRefreshingStripeStatus) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {isRefreshingStripeStatus ? "Refreshing Stripe status..." : "Loading settings..."}
        </p>
      </div>
    );
  }

  if (!user) {
    // This case should ideally be handled by AuthGuard redirecting to login
    return (
      <div className="flex flex-col items-center justify-center h-full pt-10">
        <AlertCircle className="w-12 w-12 text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Please log in to view your settings.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage your account, subscription, and payment preferences."
      />
      <div className="space-y-6">
        <SubscriptionCard />
        <StripeConnectCard />
      </div>
    </>
  );
}
