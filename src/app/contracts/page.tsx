"use client"; // This page needs to be client component to manage contracts state

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { ContractList } from "@/components/contracts/contract-list";
import { UploadContractDialog } from "@/components/contracts/upload-contract-dialog";
import { MOCK_CONTRACTS } from "@/data/mock-data";
import type { Contract } from "@/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Load initial mock contracts
  useEffect(() => {
    setContracts(MOCK_CONTRACTS.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const handleContractAdded = (newContract: Contract) => {
    setContracts(prevContracts => [newContract, ...prevContracts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const filteredContracts = contracts.filter(contract =>
    contract.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contract.fileName && contract.fileName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    contract.contractType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Contracts"
        description="Manage all your brand deals and agreements."
        actions={
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Export All
            </Button>
            <UploadContractDialog onContractAdded={handleContractAdded} />
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
          />
        </div>
      </div>
      
      <ContractList contracts={filteredContracts} />
    </>
  );
}
