
"use client";

import { useState, type FormEvent } from "react";
import { useAuth, type UserProfile } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";
import { auth, db, doc, updateDoc } from "@/lib/firebase";
import { updateProfile as updateFirebaseUserProfile } from "firebase/auth";

interface UpdateProfileFormProps {
  currentUser: UserProfile;
}

export function UpdateProfileForm({ currentUser }: UpdateProfileFormProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  // We might need a way to refresh the auth context user or rely on page reload/re-auth
  // For now, this updates Firebase Auth and Firestore.

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast({ title: "Error", description: "No authenticated user found.", variant: "destructive" });
      return;
    }
    if (!displayName.trim()) {
      toast({ title: "Error", description: "Display name cannot be empty.", variant: "destructive" });
      return;
    }

    setIsUpdating(true);
    try {
      // Update Firebase Auth profile
      await updateFirebaseUserProfile(auth.currentUser, { displayName: displayName.trim() });

      // Update Firestore user document
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, { displayName: displayName.trim() });

      toast({ title: "Success", description: "Profile updated successfully." });
      // Consider how to update the useAuth context's user object here if needed for immediate reflection.
      // For now, onAuthStateChanged will pick it up on next auth state check or app reload.
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="displayName">Display Name</Label>
        <Input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Your Name"
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={isUpdating || displayName === (currentUser.displayName || "")}>
        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Changes
      </Button>
    </form>
  );
}
