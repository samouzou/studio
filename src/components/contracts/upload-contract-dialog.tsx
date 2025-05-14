
"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { extractContractDetails, ExtractContractDetailsOutput } from "@/ai/flows/extract-contract-details";
import { summarizeContractTerms, SummarizeContractTermsOutput } from "@/ai/flows/summarize-contract-terms";
import { Loader2, UploadCloud, FileText, Wand2, AlertTriangle } from "lucide-react";
import type { Contract } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { db, collection, addDoc, serverTimestamp as firebaseServerTimestamp, Timestamp } from '@/lib/firebase'; // Firestore

interface UploadContractDialogProps {
  onContractAdded: (newContract: Contract) => void;
}

export function UploadContractDialog({ onContractAdded }: UploadContractDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsing, startParseTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const [parsedDetails, setParsedDetails] = useState<ExtractContractDetailsOutput | null>(null);
  const [summary, setSummary] = useState<SummarizeContractTermsOutput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setContractText("");
      setFileName("");
      setParsedDetails(null);
      setSummary(null);
      setParseError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleParseContract = async () => {
    if (!contractText.trim()) {
      toast({
        title: "Error",
        description: "Please paste contract text to parse.",
        variant: "destructive",
      });
      return;
    }

    setParseError(null);
    setParsedDetails(null);
    setSummary(null);

    startParseTransition(async () => {
      try {
        const [details, termsSummary] = await Promise.all([
          extractContractDetails({ contractText }),
          summarizeContractTerms({ contractText }),
        ]);
        setParsedDetails(details);
        setSummary(termsSummary);
        toast({
          title: "Parsing Successful",
          description: "Contract details extracted and summarized.",
        });
      } catch (error) {
        console.error("Parsing error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during parsing.";
        setParseError(errorMessage);
        toast({
          title: "Parsing Failed",
          description: `Could not parse contract: ${errorMessage}`,
          variant: "destructive",
        });
      }
    });
  };

  const handleSaveContract = async () => {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to save a contract.", variant: "destructive" });
      return;
    }
    if (!parsedDetails) {
      toast({ title: "Cannot Save", description: "No contract details parsed yet.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // Data for Firestore document
      const contractDataForFirestore = {
        userId: user.uid,
        brand: parsedDetails.brand || "Unknown Brand",
        amount: parsedDetails.amount || 0,
        dueDate: parsedDetails.dueDate || new Date().toISOString().split('T')[0], // Stays as YYYY-MM-DD string
        status: 'pending' as Contract['status'],
        contractType: 'other' as Contract['contractType'],
        contractText: contractText,
        fileName: fileName || "Pasted Contract",
        summary: summary?.summary || "No summary available.",
        extractedTerms: parsedDetails.extractedTerms || {},
        createdAt: firebaseServerTimestamp(), // Use server timestamp
        updatedAt: firebaseServerTimestamp(), // Use server timestamp
      };

      const docRef = await addDoc(collection(db, 'contracts'), contractDataForFirestore);
      
      // Create a contract object for local state update with client-side timestamps
      // This ensures the UI can render it immediately without fetching again.
      // The actual Firestore document will have the server-generated timestamp.
      const contractForLocalState: Contract = {
        id: docRef.id,
        userId: user.uid,
        brand: parsedDetails.brand || "Unknown Brand",
        amount: parsedDetails.amount || 0,
        dueDate: parsedDetails.dueDate || new Date().toISOString().split('T')[0],
        status: 'pending',
        contractType: 'other',
        contractText: contractText,
        fileName: fileName || "Pasted Contract",
        summary: summary?.summary || "No summary available.",
        extractedTerms: parsedDetails.extractedTerms || {},
        createdAt: Timestamp.now(), // Client-side Timestamp for immediate UI update
        updatedAt: Timestamp.now(), // Client-side Timestamp for immediate UI update
      };

      onContractAdded(contractForLocalState);

      toast({ title: "Contract Saved", description: `${contractForLocalState.brand} contract added successfully.` });
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving contract:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Save Failed",
        description: `Could not save contract: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UploadCloud className="mr-2 h-4 w-4" /> Add Contract
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Add New Contract
          </DialogTitle>
          <DialogDescription>
            Paste the contract text below to parse its terms using AI. File upload coming soon.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-250px)]">
        <div className="grid gap-6 p-1 pr-4">
           <div>
            <Label htmlFor="fileName">File Name (Optional)</Label>
            <Input 
              id="fileName" 
              type="text" 
              value={fileName} 
              onChange={(e) => setFileName(e.target.value)}
              placeholder="e.g., BrandX_Sponsorship_Q4.pdf"
              className="mt-1" 
            />
          </div>
          <div>
            <Label htmlFor="contractText">Paste Contract Text*</Label>
            <Textarea
              id="contractText"
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              placeholder="Paste the full text of your contract here..."
              rows={8}
              className="mt-1"
            />
          </div>

          <Button onClick={handleParseContract} disabled={isParsing || !contractText.trim() || isSaving} className="w-full sm:w-auto">
            {isParsing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Parse with AI
          </Button>

          {parseError && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Parsing Error</p>
                <p className="text-sm">{parseError}</p>
              </div>
            </div>
          )}

          {(parsedDetails || summary) && !parseError && (
            <div className="mt-2 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">AI Analysis Results</h3>
              {parsedDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Extracted Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Brand:</strong> {parsedDetails.brand || 'N/A'}</p>
                    <p><strong>Amount:</strong> {parsedDetails.amount ? `$${parsedDetails.amount.toLocaleString()}` : 'N/A'}</p>
                    <p><strong>Due Date:</strong> {parsedDetails.dueDate ? new Date(parsedDetails.dueDate + 'T00:00:00').toLocaleDateString() : 'N/A'}</p>
                    {parsedDetails.extractedTerms?.paymentMethod && <p><strong>Payment Method:</strong> {parsedDetails.extractedTerms.paymentMethod}</p>}
                    {parsedDetails.extractedTerms?.deliverables && parsedDetails.extractedTerms.deliverables.length > 0 && (
                        <p><strong>Deliverables:</strong> {parsedDetails.extractedTerms.deliverables.join(', ')}</p>
                    )}
                  </CardContent>
                </Card>
              )}
              {summary && (
                 <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Contract Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary.summary || 'No summary generated.'}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSaveContract} disabled={isParsing || !parsedDetails || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
