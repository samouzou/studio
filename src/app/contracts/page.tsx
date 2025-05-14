
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
import { db, collection, query, where, onSnapshot, orderBy as firestoreOrderBy, Timestamp } from '@/lib/firebase';
import { Skeleton } from "@/components/ui/skeleton";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoadingContracts, setIsLoadingContracts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingContracts(true);
      const contractsCol = collection(db, 'contracts');
      const q = query(
        contractsCol,
        where('userId', '==', user.uid),
        firestoreOrderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const contractList = querySnapshot.docs.map(docSnap => {
          const data = docSnap.data();
          // Ensure Timestamps are correctly handled. Firestore SDK should return them as Timestamp objects.
          // If there's any doubt or legacy data, more robust conversion might be needed here.
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt as Timestamp, // Assuming it's already a Timestamp
            updatedAt: data.updatedAt as Timestamp | undefined, // Assuming it's already a Timestamp or undefined
          } as Contract;
        });
        setContracts(contractList);
        setIsLoadingContracts(false);
      }, (error) => {
        console.error("Error fetching contracts with onSnapshot:", error);
        setContracts([]); // Clear contracts on error
        setIsLoadingContracts(false);
        // Optionally, show a toast to the user
      });

      return () => unsubscribe(); // Cleanup listener on component unmount
    } else if (!authLoading && !user) {
      // Not logged in, or finished auth check and no user
      setContracts([]);
      setIsLoadingContracts(false);
    }
  }, [user, authLoading]);

  const handleContractAdded = (newContract: Contract) => {
    // Optimistic update: add to the top of the list.
    // onSnapshot will eventually provide the consistent list from Firestore.
    setContracts(prevContracts => [newContract, ...prevContracts.filter(c => c.id !== newContract.id)]);
  };

  const filteredContracts = contracts.filter(contract =>
    (contract.brand || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.fileName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.contractType || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderContractList = () => {
    if (authLoading || isLoadingContracts) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (!user) {
      return <p className="text-muted-foreground mt-4">Please log in to view your contracts.</p>;
    }
    if (contracts.length === 0 && !isLoadingContracts) {
      return <p className="text-muted-foreground mt-4">No contracts found. Add your first contract to get started!</p>;
    }
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
            disabled={!user || isLoadingContracts}
          />
        </div>
      </div>
      
      {renderContractList()}
    </>
  );
}
