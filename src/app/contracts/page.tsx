
"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { ContractList } from "@/components/contracts/contract-list";
import { UploadContractDialog } from "@/components/contracts/upload-contract-dialog";
import type { Contract } from "@/types";
import { Input } from "@/components/ui/input";
import { Search, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
// Ensure onSnapshot is correctly imported and used.
import { db, collection, query, where, onSnapshot, orderBy as firestoreOrderBy, Timestamp } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Ensure there's a user and auth is not loading before setting up the listener
    if (user && user.uid && !authLoading) { // Added explicit user.uid check for clarity
      setIsLoadingContracts(true); // Start loading when setting up a new listener or user changes
      const contractsCol = collection(db, 'contracts');
      
      // Note: Firestore queries with a 'where' filter and 'orderBy' on different fields
      // often require a composite index (e.g., on 'userId' and 'createdAt desc').
      // Check your browser's developer console for Firestore index-related warnings if issues persist.
      const q = query(
        contractsCol,
        where('userId', '==', user.uid),
        firestoreOrderBy('createdAt', 'desc')
      );

      // onSnapshot returns an unsubscribe function
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const contractList = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            // Firestore SDK should return Timestamp objects if they are stored as such.
            createdAt: data.createdAt as Timestamp, 
            updatedAt: data.updatedAt ? (data.updatedAt as Timestamp) : undefined,
          } as Contract; // Cast to Contract type
        });
        setContracts(contractList);
        setIsLoadingContracts(false);
      }, (error) => {
        console.error("Error fetching contracts with onSnapshot:", error);
        setContracts([]); // Reset contracts on error
        setIsLoadingContracts(false);
        // TODO: Optionally, add a toast notification for the user here
      });

      // Cleanup: Unsubscribe from the listener when the component unmounts
      // or when user/authLoading changes, triggering the effect to re-run.
      return () => unsubscribe();
    } else if (!authLoading && !user) {
      // No user, or auth check finished and no user. Clear contracts and stop loading.
      setContracts([]);
      setIsLoadingContracts(false);
    }
    // Dependencies for useEffect: re-run if user or authLoading state changes.
  }, [user, authLoading]);

  const handleContractAdded = (newContract: Contract) => {
    // Optimistic update for immediate UI feedback.
    // onSnapshot will provide the source of truth eventually.
    setContracts(prevContracts => {
       const contractExists = prevContracts.some(c => c.id === newContract.id);
       if (contractExists) {
         // If contract already exists (e.g. from a quick update), map and replace it
         return prevContracts.map(c => c.id === newContract.id ? newContract : c);
       } else {
         // Add new contract. Assuming new contracts should appear at the top due to orderBy.
         // This needs to be consistent with how onSnapshot updates the list.
         // If onSnapshot always replaces the list, this specific logic might just be for perceived speed.
         const updatedList = [newContract, ...prevContracts];
         updatedList.sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()); // Re-sort if adding
         return updatedList;
       }
     });
  };

  const filteredContracts = contracts.filter(contract =>
    (contract.brand || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.fileName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.contractType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContractList = () => {
    // Show skeletons while auth is loading OR (user is present AND contract data is still loading)
    if (authLoading || (user && isLoadingContracts)) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    // After loading, if no user, prompt to log in
    if (!user) {
      return <p className="text-muted-foreground mt-4">Please log in to view your contracts.</p>;
    }
    // If user is logged in, and we are not loading contracts anymore, and the list is empty
    if (contracts.length === 0 && !isLoadingContracts) {
      return <p className="text-muted-foreground mt-4">No contracts found. Add your first contract to get started!</p>;
    }
    // If user logged in and contracts exist (or filtered list is empty but base list might not be)
    return <ContractList contracts={filteredContracts} />;
  };

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Manage all your brand deals and agreements."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" disabled> {/* Export functionality not implemented yet */}
              <Download className="mr-2 h-4 w-4" /> Export All
            </Button>
            {/* Only show UploadContractDialog if user is logged in */}
            {user && <UploadContractDialog onContractAdded={handleContractAdded} />}
          </div>
        }
      />

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contracts by brand, file, or type..."
            className="pl-10 w-full md:w-1/2 lg:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            // Disable search if no user or still loading initial contracts
            disabled={!user || isLoadingContracts} 
          />
        </div>
      </div>
      
      {renderContractList()}
    </>
  );
}
