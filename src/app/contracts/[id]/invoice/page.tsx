
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea'; // For editing HTML if needed later
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db, doc, getDoc, updateDoc, Timestamp } from '@/lib/firebase';
import type { Contract } from '@/types';
import { generateInvoiceHtml, type GenerateInvoiceHtmlInput } from '@/ai/flows/generate-invoice-html-flow';
import { ArrowLeft, FileText, Loader2, Wand2, Save, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function ManageInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [generatedInvoiceHtml, setGeneratedInvoiceHtml] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && user && !authLoading) {
      setIsLoadingContract(true);
      const fetchContract = async () => {
        try {
          const contractDocRef = doc(db, 'contracts', id);
          const contractSnap = await getDoc(contractDocRef);
          if (contractSnap.exists() && contractSnap.data().userId === user.uid) {
            const data = contractSnap.data() as Contract; // Cast to contract
            setContract({ ...data, id: contractSnap.id });
            if (data.invoiceHtmlContent) {
              setGeneratedInvoiceHtml(data.invoiceHtmlContent);
            }
            if (data.invoiceNumber) {
              setInvoiceNumber(data.invoiceNumber);
            } else {
              // Generate a proposed invoice number if none exists
              setInvoiceNumber(`INV-${data.brand?.substring(0,3).toUpperCase() || 'AAA'}-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${id.substring(0,4).toUpperCase()}`);
            }
          } else {
            toast({ title: "Error", description: "Contract not found or access denied.", variant: "destructive" });
            router.push('/contracts');
          }
        } catch (error) {
          console.error("Error fetching contract:", error);
          toast({ title: "Fetch Error", description: "Could not load contract details.", variant: "destructive" });
        } finally {
          setIsLoadingContract(false);
        }
      };
      fetchContract();
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [id, user, authLoading, router, toast]);

  const handleGenerateInvoice = async () => {
    if (!contract) return;
    setIsGenerating(true);
    try {
       // Prepare deliverables for the AI
      const deliverablesForAI = contract.extractedTerms?.deliverables?.map((desc, index) => ({
        description: desc,
        quantity: 1, // Default quantity
        // Try to extract amount from contract or use a portion if multiple deliverables
        unitPrice: contract.extractedTerms?.deliverables && contract.extractedTerms.deliverables.length > 0 ? contract.amount / contract.extractedTerms.deliverables.length : contract.amount,
        total: contract.extractedTerms?.deliverables && contract.extractedTerms.deliverables.length > 0 ? contract.amount / contract.extractedTerms.deliverables.length : contract.amount,
      })) || [{ description: contract.projectName || `Services for ${contract.brand}`, quantity: 1, unitPrice: contract.amount, total: contract.amount }];


      const input: GenerateInvoiceHtmlInput = {
        creatorName: user?.displayName || "Your Name/Company",
        creatorAddress: "Your Address, City, Country", // Placeholder
        creatorEmail: user?.email || "your@email.com", // Placeholder
        clientName: contract.clientName || contract.brand,
        clientAddress: contract.clientAddress,
        clientEmail: contract.clientEmail,
        invoiceNumber: invoiceNumber,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: contract.dueDate,
        contractId: contract.id,
        projectName: contract.projectName,
        deliverables: deliverablesForAI,
        totalAmount: contract.amount,
        paymentInstructions: contract.paymentInstructions,
      };
      const result = await generateInvoiceHtml(input);
      setGeneratedInvoiceHtml(result.invoiceHtml);
      toast({ title: "Invoice Generated", description: "AI has generated the invoice HTML." });
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({ title: "Generation Failed", description: "Could not generate invoice with AI.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (!contract || !generatedInvoiceHtml || !invoiceNumber) {
      toast({ title: "Cannot Save", description: "No invoice HTML or number to save.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const contractDocRef = doc(db, 'contracts', contract.id);
      await updateDoc(contractDocRef, {
        invoiceHtmlContent: generatedInvoiceHtml,
        invoiceNumber: invoiceNumber,
        invoiceStatus: contract.invoiceStatus === 'none' || !contract.invoiceStatus ? 'draft' : contract.invoiceStatus, // Set to draft if new
        updatedAt: Timestamp.now(),
      });
      setContract(prev => prev ? {...prev, invoiceHtmlContent: generatedInvoiceHtml, invoiceNumber: invoiceNumber, invoiceStatus: contract.invoiceStatus === 'none' || !contract.invoiceStatus ? 'draft' : contract.invoiceStatus } : null);
      toast({ title: "Invoice Saved", description: "Invoice details have been saved to the contract." });
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast({ title: "Save Failed", description: "Could not save invoice details.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingContract || authLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-1/3" />
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Contract Not Found</h2>
        <Button asChild variant="outline" onClick={() => router.push('/contracts')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contracts
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Invoice for ${contract.brand} - ${contract.projectName || contract.id}`}
        description={contract.invoiceNumber ? `Invoice #: ${contract.invoiceNumber} | Status: ${contract.invoiceStatus || 'None'}` : "Generate and manage the invoice for this contract."}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/contracts/${id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Contract
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Management</CardTitle>
            <CardDescription>
              Current Invoice Number: <strong>{invoiceNumber || "Not set"}</strong>. Status: <strong className="capitalize">{contract.invoiceStatus || "None"}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input 
              type="text" 
              value={invoiceNumber} 
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Enter Invoice Number (e.g. INV-001)"
              className="max-w-sm"
            />
            <div className="flex gap-2">
              <Button onClick={handleGenerateInvoice} disabled={isGenerating || isSaving}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                {generatedInvoiceHtml ? "Re-generate with AI" : "Generate with AI"}
              </Button>
              <Button onClick={handleSaveInvoice} disabled={isSaving || !generatedInvoiceHtml || !invoiceNumber}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Invoice
              </Button>
            </div>
             <p className="text-xs text-muted-foreground">
                Generating an invoice will use the contract details. Saving will update the contract record.
             </p>
          </CardContent>
        </Card>

        {generatedInvoiceHtml && (
          <Card>
            <CardHeader>
              <CardTitle>Invoice Preview</CardTitle>
              <CardDescription>This is the HTML content of your invoice. You can copy it or use browser print-to-PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-background overflow-auto max-h-[60vh]"
                dangerouslySetInnerHTML={{ __html: generatedInvoiceHtml }} 
              />
            </CardContent>
          </Card>
        )}
         {!generatedInvoiceHtml && contract.invoiceHtmlContent && (
           <Card>
            <CardHeader>
              <CardTitle>Previously Saved Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose dark:prose-invert max-w-none p-4 border rounded-md bg-background overflow-auto max-h-[60vh]"
                dangerouslySetInnerHTML={{ __html: contract.invoiceHtmlContent }} 
              />
               <Button onClick={handleGenerateInvoice} disabled={isGenerating || isSaving} variant="link" className="mt-2">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Re-generate with AI to make changes
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </>
  );
}
