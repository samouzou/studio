
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
import { storage } from '@/lib/firebase'; // Storage instance
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage functions

interface UploadContractDialogProps {
  // onContractAdded prop removed
}

export function UploadContractDialog({ /* onContractAdded removed */ }: UploadContractDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsing, startParseTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();

  const [parsedDetails, setParsedDetails] = useState<ExtractContractDetailsOutput | null>(null);
  const [summary, setSummary] = useState<SummarizeContractTermsOutput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setContractText("");
      setFileName("");
      setSelectedFile(null);
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
    if (!parsedDetails && !selectedFile) { 
      toast({ title: "Cannot Save", description: "No contract details parsed or file selected.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let fileUrlToSave: string | null = null;

    try {
      if (selectedFile) {
        const fileRef = storageRef(storage, `contracts/${user.uid}/${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileRef, selectedFile);
        fileUrlToSave = await getDownloadURL(uploadResult.ref);
      }

      const currentParsedDetails = parsedDetails || {
        brand: "Unknown Brand",
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        extractedTerms: {}
      };
      
      const currentSummary = summary || { summary: "No summary available." };

      // Clean extractedTerms to remove any undefined properties before saving to Firestore
      const cleanedExtractedTerms = currentParsedDetails.extractedTerms 
        ? JSON.parse(JSON.stringify(currentParsedDetails.extractedTerms)) 
        : {};

      const contractDataForFirestore: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
        userId: user.uid,
        brand: currentParsedDetails.brand || "Unknown Brand",
        amount: currentParsedDetails.amount || 0,
        dueDate: currentParsedDetails.dueDate || new Date().toISOString().split('T')[0],
        status: 'pending' as Contract['status'],
        contractType: 'other' as Contract['contractType'],
        contractText: contractText, 
        fileName: fileName || (selectedFile ? selectedFile.name : (contractText.trim() ? "Pasted Contract" : "Untitled Contract")),
        fileUrl: fileUrlToSave || null, 
        summary: currentSummary.summary,
        extractedTerms: cleanedExtractedTerms,
        createdAt: firebaseServerTimestamp(),
        updatedAt: firebaseServerTimestamp(),
      };

      await addDoc(collection(db, 'contracts'), contractDataForFirestore);
      
      // contractForLocalState and onContractAdded call removed
      // The onSnapshot listener in ContractsPage will handle updating the UI.

      toast({ title: "Contract Saved", description: `${contractDataForFirestore.brand} contract added successfully.` });
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
            Upload a contract file and/or paste its text below to parse its terms using AI.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-250px)]">
        <div className="grid gap-6 p-1 pr-4">
           <div>
            <Label htmlFor="fileName">File Name (Optional - auto-fills on upload)</Label>
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
            <Label htmlFor="contractFile">Upload Contract File (Optional)</Label>
            <Input
              id="contractFile"
              type="file"
              className="mt-1"
              onChange={(e) => {
                const file = e.target.files ? e.target.files[0] : null;
                setSelectedFile(file);
                if (file) {
                  setFileName(file.name); 
                }
              }}
            />
          </div>
          <div>
            <Label htmlFor="contractText">Paste Contract Text (for AI Parsing)*</Label>
            <Textarea
              id="contractText"
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              placeholder="Paste the full text of your contract here if you want AI to extract details and summarize..."
              rows={8}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              *Pasting text is required if you want AI to extract details and summarize.
            </p>
          </div>

          <Button onClick={handleParseContract} disabled={isParsing || !contractText.trim() || isSaving} className="w-full sm:w-auto">
            {isParsing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Parse Text with AI
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
          <Button onClick={handleSaveContract} disabled={isParsing || (!parsedDetails && !selectedFile) || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
