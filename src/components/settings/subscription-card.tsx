
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase'; // Assuming functions is exported from firebase.ts for same-project calls
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Settings2, CheckCircle, XCircle, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function SubscriptionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [isProcessingPortal, setIsProcessingPortal] = useState(false);

  if (!user) return null;

  const handleSubscribe = async () => {
    setIsProcessingCheckout(true);
    try {
      const createCheckoutSession = httpsCallable(functions, 'createStripeSubscriptionCheckoutSession');
      const result = await createCheckoutSession();
      const { sessionId } = result.data as { sessionId: string };
      
      // For client-side Stripe, you'd typically get the Stripe.js instance here
      // This is a simplified example assuming redirect if sessionId is directly a URL
      // or you handle Stripe.js redirection logic.
      // For Stripe Checkout, you usually redirect to a Stripe-hosted page.
      // If Stripe.js is needed:
      // const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
      // await stripe?.redirectToCheckout({ sessionId });
      // For now, let's assume the sessionId might be directly usable or a full URL
      // (though typically it's an ID for Stripe.js to use)
      if (sessionId && (window as any).Stripe) {
         const stripe = (window as any).Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
         await stripe.redirectToCheckout({ sessionId });
      } else if (sessionId) {
        // Fallback if Stripe.js isn't loaded yet, or if it's a direct URL (less common for checkout sessions)
        window.location.href = sessionId; 
      } else {
        throw new Error("Could not retrieve a valid session ID from Stripe.");
      }
    } catch (error: any) {
      console.error("Error creating Stripe subscription checkout session:", error);
      toast({
        title: "Subscription Error",
        description: error.message || "Could not initiate subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsProcessingPortal(true);
    try {
      const createPortalSession = httpsCallable(functions, 'createStripeCustomerPortalSession');
      const result = await createPortalSession();
      const { url } = result.data as { url: string };
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Could not retrieve customer portal URL.");
      }
    } catch (error: any) {
      console.error("Error creating Stripe customer portal session:", error);
      toast({
        title: "Error",
        description: error.message || "Could not open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingPortal(false);
    }
  };

  const formatDateSafe = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      // Firestore Timestamp has .toDate() method
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return format(timestamp.toDate(), "PPP");
      }
      // If it's already a Date object or a string that can be parsed
      return format(new Date(timestamp), "PPP");
    } catch (e) {
      return "Invalid Date";
    }
  };

  const renderStatusBadge = () => {
    if (!user.subscriptionStatus || user.subscriptionStatus === 'none') {
      return <Badge variant="outline">No Active Subscription</Badge>;
    }
    switch (user.subscriptionStatus) {
      case 'trialing':
        return <Badge className="bg-blue-500 text-white hover:bg-blue-600">Free Trial</Badge>;
      case 'active':
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Active</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      case 'incomplete':
        return <Badge variant="outline">Incomplete</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{user.subscriptionStatus.replace('_', ' ')}</Badge>;
    }
  };
  
  const isEffectivelySubscribed = user.subscriptionStatus === 'active' || (user.subscriptionStatus === 'trialing' && user.trialEndsAt && user.trialEndsAt.toMillis() > Date.now());

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Subscription Plan
        </CardTitle>
        <CardDescription>Manage your Verza Pro subscription and billing details.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <p className="font-semibold text-lg">Verza Pro</p>
            <p className="text-sm text-muted-foreground">$10.00 / month</p>
          </div>
          {renderStatusBadge()}
        </div>

        {user.subscriptionStatus === 'trialing' && user.trialEndsAt && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-md">
            <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
            <span>
              Your free trial {user.trialEndsAt.toMillis() > Date.now() ? `ends on ${formatDateSafe(user.trialEndsAt)}` : `ended on ${formatDateSafe(user.trialEndsAt)}`}.
            </span>
          </div>
        )}

        {user.subscriptionStatus === 'active' && user.subscriptionEndsAt && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-md">
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400"/>
            <span>
                Your subscription is active. Renews on {formatDateSafe(user.subscriptionEndsAt)}.
            </span>
          </div>
        )}
        
        {user.subscriptionStatus === 'canceled' && user.subscriptionEndsAt && (
           <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 border-l-4 border-destructive bg-red-50 dark:bg-red-900/20 rounded-md">
            <XCircle className="h-5 w-5 text-destructive"/>
            <span>
                Your subscription was canceled. Access ends on {formatDateSafe(user.subscriptionEndsAt)}.
            </span>
          </div>
        )}

        {user.subscriptionStatus === 'past_due' && (
           <div className="flex items-center gap-2 text-sm text-destructive p-3 border-l-4 border-destructive bg-red-50 dark:bg-red-900/20 rounded-md">
            <AlertCircle className="h-5 w-5"/>
            <span>
                Your payment is past due. Please update your payment method.
            </span>
          </div>
        )}


        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isEffectivelySubscribed && user.subscriptionStatus !== 'past_due' && (
            <Button
              onClick={handleSubscribe}
              disabled={isProcessingCheckout || isProcessingPortal}
              className="flex-1"
            >
              {isProcessingCheckout ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              {user.subscriptionStatus === 'trialing' && user.trialEndsAt && user.trialEndsAt.toMillis() > Date.now() ? 'Subscribe Now' : 'Subscribe to Verza Pro'}
            </Button>
          )}

          {(isEffectivelySubscribed || user.subscriptionStatus === 'past_due' || user.subscriptionStatus === 'canceled') && (
            <Button
              onClick={handleManageSubscription}
              disabled={isProcessingCheckout || isProcessingPortal}
              variant="outline"
              className="flex-1"
            >
              {isProcessingPortal ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Settings2 className="mr-2 h-4 w-4" />
              )}
              Manage Subscription
            </Button>
          )}
        </div>
         <p className="text-xs text-muted-foreground text-center pt-2">
            Subscription management and payments are securely handled by Stripe.
          </p>
      </CardContent>
    </Card>
  );
}

