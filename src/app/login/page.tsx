"use client";

import { Button } from "@/components/ui/button";
import { SignUpForm } from "@/components/auth/signup-form"; // Make sure this path is correct
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react"; // Removed Scale from here
import { useEffect, useState } from "react";
import Link from 'next/link';

type FormType = 'googleLogin' | 'emailSignup' | 'emailLogin';
export default function LoginPage() {
  const { loginWithGoogle, loginWithEmailAndPassword, isAuthenticated, isLoading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async () => {
    await loginWithGoogle();
    // Navigation is handled by useEffect or AuthGuard
  };

  const handleEmailLogin = async () => {
    await loginWithEmailAndPassword(email, password);
    // Navigation is handled by useEffect or AuthGuard
  };

  if (isLoading || (!isLoading && isAuthenticated)) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            {/* Using an inline SVG for the Verza 'V' logo style */}
            <svg width="48" height="48" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
             <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontFamily="Space Grotesk, sans-serif" fontSize="38" fontWeight="bold" fill="currentColor">V</text>
            </svg>
          </div>
          <CardTitle className="text-3xl font-bold">Verza</CardTitle>
          <CardDescription>Smart contract management for creators.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Conditional rendering based on isSignUp state */}
            {isSignUp ? (
              <>
                {/* Sign Up Form */}
                <SignUpForm />
                <p className="px-8 text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  {/* Toggle to combined Login view */}
                  <Button variant="link" onClick={() => setIsSignUp(false)} className="p-0 h-auto">
                    Sign in
                  </Button>
                </p>
              </>
            ) : (
              {/* Combined Login View (Google and Email/Password) */}
              <>
                {/* Google Login Button */}
                <p className="text-center text-muted-foreground">
                  Access your dashboard by signing in with your Google account.
                </p>
                <Button onClick={handleLogin} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    // Google Icon SVG
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
                  )}
                  Sign in with Google
                </Button>

                {/* Separator */}
                <div className="flex items-center my-4">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                {/* Email/Password Login Form */}
                <div className="space-y-4">
                   <p className="text-center text-muted-foreground">
                    Sign in with your email and password.
                  </p>
                  <div className="grid gap-2">
                    <Label htmlFor="email-login">Email</Label>
                    <Input id="email-login" type="email" placeholder="m@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password-login">Password</Label>
                    <Input id="password-login" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  </div>
                  <Button onClick={handleEmailLogin} className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Sign In with Email"
                    )}
                  </Button>
                </div>

                {/* Toggle to Sign Up */}
                 <p className="px-8 text-center text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Button variant="link" onClick={() => setIsSignUp(true)} className="p-0 h-auto">
                    Sign up with email
                  </Button>
                </p>
              </>
            )}
            <p className="px-8 text-center text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <Link href="#" className="underline underline-offset-4 hover:text-primary">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="#" className="underline underline-offset-4 hover:text-primary">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
