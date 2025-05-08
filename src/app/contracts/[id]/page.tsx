"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit3, Trash2, FileText, DollarSign, CalendarDays, Briefcase, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { MOCK_CONTRACTS } from '@/data/mock-data';
import type { Contract } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractStatusBadge } from '@/components/contracts/contract-status-badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
  return (
    <div className="flex items-start space-x-3">
      <Icon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value || 'N/A'}</p>
      </div>
    </div>
  );
}

export default function ContractDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    if (id) {
      const foundContract = MOCK_CONTRACTS.find(c => c.id === id);
      setContract(foundContract || null);
    }
  }, [id]);

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
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

  return (
    <>
      <PageHeader
        title={contract.brand + " - " + (contract.fileName || "Contract Details")}
        description={`Details for contract ID: ${contract.id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/contracts">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Link>
            </Button>
            <Button variant="outline"><Edit3 className="mr-2 h-4 w-4" /> Edit</Button>
            <Button variant="destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
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
              <DetailItem icon={FileText} label="Brand" value={contract.brand} />
              <DetailItem icon={DollarSign} label="Amount" value={`$${contract.amount.toLocaleString()}`} />
              <DetailItem icon={CalendarDays} label="Due Date" value={new Date(contract.dueDate).toLocaleDateString()} />
              <DetailItem icon={Briefcase} label="Contract Type" value={<span className="capitalize">{contract.contractType}</span>} />
              <DetailItem icon={Info} label="File Name" value={contract.fileName} />
               <DetailItem icon={CalendarDays} label="Created At" value={new Date(contract.createdAt).toLocaleDateString()} />
            </CardContent>
          </Card>

          {contract.extractedTerms && Object.keys(contract.extractedTerms).length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Extracted Terms</CardTitle>
                <CardDescription>Specific terms identified from the contract document.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {contract.extractedTerms.deliverables && (
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
                  {contract.summary || 'No summary available for this contract.'}
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
