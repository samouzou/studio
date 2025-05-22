
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, CheckCircle, XCircle, AlertTriangle as AlertTriangleIcon, Link as LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
// import { getFunctions, httpsCallable } from 'firebase/functions'; // For future backend calls
// import { functions } from '@/lib/firebase';

export function StripeConnectCard() {
  const { user, refreshAuthUser } = useAuth();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!user) return null;

  const handleConnectStripe = async () => {
    setIsProcessing(true);
    toast({
      title: "Initiating Stripe Connect",
      description: "Calling backend to create Stripe account and generate onboarding link...",
    });
    // Placeholder for calling:
    // const createAccountCallable = httpsCallable(functions, 'createStripeConnectedAccount');
    // const accountResult = await createAccountCallable();
    // const { stripeAccountId } = accountResult.data as { stripeAccountId: string };
    // if (stripeAccountId) {
    //   await refreshAuthUser(); // Refresh to get the new stripeAccountId
    //   const createAccountLinkCallable = httpsCallable(functions, 'createStripeAccountLink');
    //   const linkResult = await createAccountLinkCallable({ stripeAccountId }); // Pass accountId if needed or backend gets from user
    //   const { url } = linkResult.data as { url: string };
    //   window.location.href = url;
    // }
    setTimeout(() => { // Simulating backend call
      toast({ title: "Backend Action Required", description: "Connect Stripe Account function needs to be implemented.", variant: "default" });
      setIsProcessing(false);
    }, 2000);
  };

  const handleManageStripeAccount = async () => {
    setIsProcessing(true);
    toast({
      title: "Fetching Stripe Account Link",
      description: "Calling backend to generate account management link...",
    });
    // Placeholder for calling:
    // const createAccountLinkCallable = httpsCallable(functions, 'createStripeAccountLink');
    // const result = await createAccountLinkCallable({ stripeAccountId: user.stripeAccountId });
    // const { url } = result.data as { url: string };
    // window.location.href = url;
    setTimeout(() => { // Simulating backend call
      toast({ title: "Backend Action Required", description: "Manage Stripe Account function needs to be implemented.", variant: "default" });
      setIsProcessing(false);
    }, 2000);
  };


  const renderStatusDetails = () => {
    if (!user.stripeAccountId || user.stripeAccountStatus === 'none') {
      return <Badge variant="outline">Not Connected</Badge>;
    }
    let statusText = user.stripeAccountStatus.replace(/_/g, ' ');
    statusText = statusText.charAt(0).toUpperCase() + statusText.slice(1);

    let badgeVariant: "default" | "secondary" | "destructive" | "outline" = "outline";
    let Icon = AlertTriangleIcon;

    switch (user.stripeAccountStatus) {
      case 'active':
        badgeVariant = 'default'; Icon = CheckCircle;
        break;
      case 'onboarding_incomplete':
      case 'pending_verification':
        badgeVariant = 'secondary'; Icon = Loader2; statusText = "Onboarding Incomplete";
        break;
      case 'restricted':
      case 'restricted_soon':
        badgeVariant = 'destructive'; Icon = AlertTriangleIcon;
        break;
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
           <Badge variant={badgeVariant} className={`capitalize ${badgeVariant === 'default' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}>
            <Icon className={`mr-1 h-3 w-3 ${badgeVariant === 'secondary' ? 'animate-spin' : ''}`} />
            {statusText}
          </Badge>
        </div>
        {user.stripeAccountId && (
          <p className="text-xs text-muted-foreground">Account ID: {user.stripeAccountId}</p>
        )}
        {user.stripeAccountStatus === 'active' && (
          <>
            <p className={`text-sm flex items-center ${user.stripeChargesEnabled ? 'text-green-600' : 'text-destructive'}`}>
              {user.stripeChargesEnabled ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
              Payments: {user.stripeChargesEnabled ? 'Enabled' : 'Disabled'}
            </p>
            <p className={`text-sm flex items-center ${user.stripePayoutsEnabled ? 'text-green-600' : 'text-destructive'}`}>
              {user.stripePayoutsEnabled ? <CheckCircle className="mr-2 h-4 w-4" /> : <XCircle className="mr-2 h-4 w-4" />}
              Payouts: {user.stripePayoutsEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </>
        )}
      </div>
    );
  };

  const getButtonAction = () => {
    if (!user.stripeAccountId || user.stripeAccountStatus === 'none' || user.stripeAccountStatus === 'onboarding_incomplete' || user.stripeAccountStatus === 'pending_verification') {
      return {
        text: user.stripeAccountId ? "Complete Stripe Onboarding" : "Connect Stripe Account",
        handler: handleConnectStripe,
        Icon: LinkIcon,
      };
    }
    // For 'active', 'restricted', 'restricted_soon'
    return {
      text: "Manage Stripe Account",
      handler: handleManageStripeAccount,
      Icon: ExternalLink,
    };
  };

  const buttonAction = getButtonAction();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg viewBox="0 0 42 28" width="32" height="20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-indigo-600 dark:text-indigo-400"><path d="M27.65 10.716c0-2.339-1.045-3.532-3.865-3.532-1.818 0-3.03.66-3.825 1.602V7.45H16.26v12.96h3.6V14.7c0-1.11.446-1.683 1.338-1.683.852 0 1.338.572 1.338 1.683v5.71h3.704v-5.45c0-1.11.405-1.683 1.257-1.683.893 0 1.339.572 1.339 1.683v5.45h3.704V13.34c0-2.219-.962-3.492-3.532-3.492-.961 0-1.836.32-2.553.884v-.018Z" fill="#fff"></path><path d="M15.007 27.416c8.284 0 15-6.716 15-15 0-8.284-6.716-15-15-15s-15 6.716-15 15c0 8.284 6.716 15 15 15Z" fill="url(#a)"></path><path d="M38.375 12.601c1.43-.623 2.06-1.206 2.06-2.227 0-.98-.893-1.43-2.47-1.43a6.169 6.169 0 0 0-3.07.787l-.787-3.07c.893-.447 2.227-.788 3.857-.788 3.492 0 5.49 1.683 5.49 4.512 0 2.21-.961 3.492-3.532 4.553v.18c2.146.357 3.03 1.603 3.03 3.206 0 2.94-2.227 4.27-5.572 4.27a9.13 9.13 0 0 1-4.634-1.025l.828-3.114c.92.554 2.268.937 3.622.937 2.227 0 3.491-.981 3.491-2.674 0-1.39-.787-2.06-2.47-2.06h-1.716v-2.9Zm17.564-5.45c0-2.339-1.045-3.532-3.865-3.532-1.818 0-3.03.66-3.825 1.602V7.45H44.54v12.96h3.6V14.7c0-1.11.446-1.683 1.338-1.683.852 0 1.338.572 1.338 1.683v5.71h3.704v-5.45c0-1.11.405-1.683 1.257-1.683.893 0 1.339.572 1.339 1.683v5.45h3.704V13.34c0-2.219-.962-3.492-3.532-3.492-.961 0-1.836.32-2.553.884v-.018Z" fill="currentColor"></path><defs><linearGradient id="a" x1="15.007" y1="-.584" x2="15.007" y2="27.416" gradientUnits="userSpaceOnUse"><stop stopColor="#635BFF"></stop><stop offset="1" stopColor="#5433FF"></stop></linearGradient></defs></svg>
          Connect with Stripe
        </CardTitle>
        <CardDescription>Connect your Stripe account to receive payments directly from your clients.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-muted/50">
          {renderStatusDetails()}
        </div>

        <Button
          onClick={buttonAction.handler}
          disabled={isProcessing}
          className="w-full sm:w-auto"
        >
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <buttonAction.Icon className="mr-2 h-4 w-4" />
          )}
          {buttonAction.text}
        </Button>

        <p className="text-xs text-muted-foreground">
          By connecting your Stripe account, you agree to Stripe's <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Connected Account Agreement</a>.
          Verza facilitates this connection but does not store your sensitive Stripe credentials.
        </p>
      </CardContent>
    </Card>
  );
}
