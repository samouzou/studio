
"use client";

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3, Trash2, FileText, DollarSign, CalendarDays, Briefcase, Info, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Contract } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { db, doc, getDoc, Timestamp } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from "@/hooks/use-toast";

function DetailItem({ icon: Icon, label, value, valueClassName }: { icon: React.ElementType, label: string, value: React.ReactNode, valueClassName?: string }) {
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`font-medium ${valueClassName}`}>{value || 'N/A'}</p>
      </div>
    </div>
  );
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (id && user && !authLoading) {
      setIsLoading(true);
      const fetchContract = async () => {
        try {
          const contractDocRef = doc(db, 'contracts', id as string);
          const contractSnap = await getDoc(contractDocRef);
          if (contractSnap.exists() && contractSnap.data().userId === user.uid) {
            const data = contractSnap.data();
            
            let createdAt = data.createdAt;
            if (createdAt && !(createdAt instanceof Timestamp)) { // Check if it exists and is not already a Timestamp
              if (typeof createdAt === 'string') {
                createdAt = Timestamp.fromDate(new Date(createdAt));
              } else if (createdAt.seconds && typeof createdAt.seconds === 'number' && createdAt.nanoseconds && typeof createdAt.nanoseconds === 'number') {
                // It's a Firestore-like timestamp object from JS, convert to SDK Timestamp
                createdAt = new Timestamp(createdAt.seconds, createdAt.nanoseconds);
              } else {
                // Fallback or error for unknown format
                console.warn("Unsupported createdAt format, using current date as fallback:", createdAt);
                createdAt = Timestamp.now(); 
              }
            } else if (!createdAt) {
                 createdAt = Timestamp.now(); // Should not happen for new data
            }


            let updatedAt = data.updatedAt;
            if (updatedAt && !(updatedAt instanceof Timestamp)) { // Check if it exists and is not already a Timestamp
               if (typeof updatedAt === 'string') {
                updatedAt = Timestamp.fromDate(new Date(updatedAt));
              } else if (updatedAt.seconds && typeof updatedAt.seconds === 'number' && updatedAt.nanoseconds && typeof updatedAt.nanoseconds === 'number') {
                updatedAt = new Timestamp(updatedAt.seconds, updatedAt.nanoseconds);
              } else {
                console.warn("Unsupported updatedAt format:", updatedAt);
                updatedAt = undefined; // Or handle as needed
              }
            } // If updatedAt is undefined or already a Timestamp, it's fine

            setContract({
              id: contractSnap.id,
              ...data,
              createdAt: createdAt, // Ensured to be a Timestamp
              updatedAt: updatedAt, // Ensured to be a Timestamp or undefined
            } as Contract);
          } else {
            setContract(null);
            toast({ title: "Error", description: "Contract not found or you don't have permission to view it.", variant: "destructive" });
            router.push('/contracts');
          }
        } catch (error) {
          console.error("Error fetching contract:", error);
          setContract(null);
          toast({ title: "Fetch Error", description: "Could not load contract details.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      };
      fetchContract();
    } else if (!authLoading && !user) {
      router.push('/login');
    } else if (!id) {
        setIsLoading(false);
    }
  }, [id, user, authLoading, router, toast]);


  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-8 w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-full pt-10">
         <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Contract Not Found</h2>
        <p className="text-muted-foreground mb-6">The contract you are looking for does not exist or could not be loaded.</p>
        <Button asChild variant="outline">
          <Link href="/contracts">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contracts
          </Link>
        </Button>
      </div>
    );
  }
  
  const formattedDueDate = contract.dueDate ? new Date(contract.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A';
  
  const formattedCreatedAt = contract.createdAt instanceof Timestamp
    ? contract.createdAt.toDate().toLocaleDateString()
    : 'N/A';


  return (
    <>
      <PageHeader
        title={(contract.brand || "Contract") + " - " + (contract.fileName || "Details")}
        description={`Details for contract ID: ${contract.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/contracts">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button variant="outline" disabled><Edit3 className="mr-2 h-4 w-4" /> Edit</Button>
            <Button variant="destructive" disabled><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Key Information</span>
                <ContractStatusBadge status={contract.status} />
              </CardTitle>
              <CardDescription>Core details of the agreement with {contract.brand}.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem icon={Briefcase} label="Brand" value={contract.brand} />
              <DetailItem icon={DollarSign} label="Amount" value={`$${contract.amount.toLocaleString()}`} />
              <DetailItem icon={CalendarDays} label="Due Date" value={formattedDueDate} />
              <DetailItem icon={FileText} label="Contract Type" value={<span className="capitalize">{contract.contractType}</span>} />
              <DetailItem icon={Info} label="File Name" value={contract.fileName || "N/A"} />
               <DetailItem icon={CalendarDays} label="Created At" value={formattedCreatedAt} />
            </CardContent>
          </Card>

          {contract.extractedTerms && Object.keys(contract.extractedTerms).length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Extracted Terms</CardTitle>
                <CardDescription>Specific terms identified from the contract document by AI.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {contract.extractedTerms.deliverables && contract.extractedTerms.deliverables.length > 0 && (
                  <div>
                    <strong className="text-foreground">Deliverables:</strong>
                    <ul className="list-disc list-inside ml-4 text-muted-foreground">
                      {contract.extractedTerms.deliverables.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {contract.extractedTerms.paymentMethod && <p><strong className="text-foreground">Payment Method:</strong> <span className="text-muted-foreground">{contract.extractedTerms.paymentMethod}</span></p>}
                {contract.extractedTerms.usageRights && <p><strong className="text-foreground">Usage Rights:</strong> <span className="text-muted-foreground">{contract.extractedTerms.usageRights}</span></p>}
                {contract.extractedTerms.terminationClauses && <p><strong className="text-foreground">Termination:</strong> <span className="text-muted-foreground">{contract.extractedTerms.terminationClauses}</span></p>}
                {contract.extractedTerms.lateFeePenalty && <p><strong className="text-foreground">Late Fee/Penalty:</strong> <span className="text-muted-foreground">{contract.extractedTerms.lateFeePenalty}</span></p>}
                 {Object.keys(contract.extractedTerms).length === 0 && <p className="text-muted-foreground">No specific terms were extracted by AI.</p>}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
           <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>AI Generated Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-3">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {contract.summary || 'No AI summary available for this contract.'}
                </p>
              </ScrollArea>
            </CardContent>
          </Card>

          {contract.contractText && (
             <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Full Contract Text (Excerpt)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px] pr-3">
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {contract.contractText.substring(0,1000)}
                    {contract.contractText.length > 1000 && "..."}
                  </p>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
