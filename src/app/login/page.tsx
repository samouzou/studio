"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMockAuth } from "@/hooks/use-mock-auth";
import { useRouter } from "next/navigation";
import { Scale } from "lucide-react"; // Using Scale as a generic logo icon

export default function LoginPage() {
  const { login } = useMockAuth();
  const router = useRouter();

  const handleLogin = () => {
    login();
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Scale className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">SoloLedger Lite</CardTitle>
          <CardDescription>Smart contract management for creators.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-center text-muted-foreground">
              Access your dashboard by signing in with your Google account.
            </p>
            <Button onClick={handleLogin} className="w-full" size="lg">
              <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path></svg>
              Sign in with Google
            </Button>
            <p className="px-8 text-center text-sm text-muted-foreground">
              By continuing, you agree to our{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="underline underline-offset-4 hover:text-primary">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
