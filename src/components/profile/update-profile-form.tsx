
"use client";

import { useState, type FormEvent, type ChangeEvent, useEffect } from "react";
import { useAuth, type UserProfile } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, UploadCloud } from "lucide-react";
import { auth, db, doc, updateDoc, storage } from "@/lib/firebase";
import { updateProfile as updateFirebaseUserProfile } from "firebase/auth";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UpdateProfileFormProps {
  currentUser: UserProfile;
}

export function UpdateProfileForm({ currentUser }: UpdateProfileFormProps) {
  const [displayName, setDisplayName] = useState(currentUser.displayName || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(currentUser.avatarUrl);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const { refreshAuthUser } = useAuth();

  useEffect(() => {
    // Update local state if currentUser prop changes (e.g., after context refresh)
    setDisplayName(currentUser.displayName || "");
    setImagePreview(currentUser.avatarUrl);
  }, [currentUser]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setImagePreview(currentUser.avatarUrl); // Revert to current avatar if no file selected
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!auth.currentUser) {
      toast({ title: "Error", description: "No authenticated user found.", variant: "destructive" });
      return;
    }
    if (!displayName.trim() && !selectedFile) {
      toast({ title: "No Changes", description: "Please enter a display name or select an image.", variant: "default" });
      return;
    }

    setIsUpdating(true);
    let newAvatarUrl: string | null = currentUser.avatarUrl; // Keep current avatar unless a new one is uploaded

    try {
      // 1. Handle Avatar Upload if a new file is selected
      if (selectedFile) {
        const avatarStorageRef = storageRef(storage, `avatars/${currentUser.uid}/${selectedFile.name}`);
        const uploadResult = await uploadBytes(avatarStorageRef, selectedFile);
        newAvatarUrl = await getDownloadURL(uploadResult.ref);
      }

      // 2. Prepare updates for Firebase Auth and Firestore
      const authUpdates: { displayName?: string; photoURL?: string | null } = {};
      const firestoreUpdates: { displayName?: string; avatarUrl?: string | null } = {};
      let hasChanges = false;

      if (displayName.trim() && displayName.trim() !== currentUser.displayName) {
        authUpdates.displayName = displayName.trim();
        firestoreUpdates.displayName = displayName.trim();
        hasChanges = true;
      }

      if (newAvatarUrl && newAvatarUrl !== currentUser.avatarUrl) {
        authUpdates.photoURL = newAvatarUrl;
        firestoreUpdates.avatarUrl = newAvatarUrl;
        hasChanges = true;
      }
      
      if (!hasChanges) {
        toast({ title: "No Changes Detected", description: "Your profile information is already up to date.", variant: "default" });
        setIsUpdating(false);
        return;
      }

      // 3. Update Firebase Auth profile (if there are changes)
      if (Object.keys(authUpdates).length > 0) {
        await updateFirebaseUserProfile(auth.currentUser, authUpdates);
      }

      // 4. Update Firestore user document (if there are changes)
      if (Object.keys(firestoreUpdates).length > 0) {
        const userDocRef = doc(db, "users", currentUser.uid);
        await updateDoc(userDocRef, firestoreUpdates);
      }
      
      toast({ title: "Success", description: "Profile updated successfully." });
      await refreshAuthUser(); // Refresh context to show updated info everywhere
      setSelectedFile(null); // Clear selected file after successful upload

    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: error.message || "Failed to update profile.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const userInitialForFallback = currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : (currentUser.email ? currentUser.email.charAt(0).toUpperCase() : "U");

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="avatarFile">Profile Picture</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            {imagePreview ? (
              <AvatarImage src={imagePreview} alt={currentUser.displayName || "User avatar"} data-ai-hint="user avatar" />
            ) : (
              <AvatarFallback className="text-3xl">{userInitialForFallback}</AvatarFallback>
            )}
          </Avatar>
          <Input
            id="avatarFile"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="max-w-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground">Recommended: Square image, less than 2MB.</p>
      </div>

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
      <Button 
        type="submit" 
        disabled={isUpdating || (displayName === (currentUser.displayName || "") && !selectedFile)}
      >
        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        Save Changes
      </Button>
    </form>
  );
}
