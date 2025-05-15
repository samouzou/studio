
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
import { getNegotiationSuggestions, type NegotiationSuggestionsOutput } from "@/ai/flows/negotiation-suggestions-flow";
import { Loader2, UploadCloud, FileText, Wand2, AlertTriangle } from "lucide-react";
import type { Contract } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import { db, collection, addDoc, serverTimestamp as firebaseServerTimestamp, Timestamp, storage } from '@/lib/firebase'; // Firestore & Storage
import { ref as storageRefOriginal, uploadBytes, getDownloadURL } from 'firebase/storage'; // Firebase Storage functions // Renamed to avoid conflict

export function UploadContractDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isParsing, startParseTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();

  const [parsedDetails, setParsedDetails] = useState<ExtractContractDetailsOutput | null>(null);
  const [summary, setSummary] = useState<SummarizeContractTermsOutput | null>(null);
  const [negotiationSuggestions, setNegotiationSuggestions] = useState<NegotiationSuggestionsOutput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // New state for invoice-related fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [paymentInstructions, setPaymentInstructions] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setContractText("");
      setFileName("");
      setProjectName("");
      setSelectedFile(null);
      setParsedDetails(null);
      setSummary(null);
      setNegotiationSuggestions(null);
      setParseError(null);
      setIsSaving(false);
      // Reset new fields
      setClientName("");
      setClientEmail("");
      setClientAddress("");
      setPaymentInstructions("");
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
    setNegotiationSuggestions(null);

    startParseTransition(async () => {
      try {
        const [details, termsSummary, negSuggestions] = await Promise.all([
          extractContractDetails({ contractText }),
          summarizeContractTerms({ contractText }),
          getNegotiationSuggestions({ contractText }),
        ]);
        setParsedDetails(details);
        setSummary(termsSummary);
        setNegotiationSuggestions(negSuggestions);
        toast({
          title: "AI Analysis Successful",
          description: "Contract details extracted, summarized, and negotiation suggestions provided.",
        });
      } catch (error) {
        console.error("AI Parsing error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during AI processing.";
        setParseError(errorMessage);
        toast({
          title: "AI Analysis Failed",
          description: `Could not process contract with AI: ${errorMessage}`,
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
    if (!parsedDetails && !selectedFile && !contractText.trim()) {
      toast({ title: "Cannot Save", description: "No contract details available (AI parse, file, or pasted text).", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    let fileUrlToSave: string | null = null;

    try {
      if (selectedFile) {
        const fileStorageRef = storageRefOriginal(storage, `contracts/${user.uid}/${Date.now()}_${selectedFile.name}`);
        const uploadResult = await uploadBytes(fileStorageRef, selectedFile);
        fileUrlToSave = await getDownloadURL(uploadResult.ref);
      }

      const currentParsedDetails = parsedDetails || {
        brand: "Unknown Brand",
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        extractedTerms: {}
      };
      
      const currentSummary = summary || { summary: contractText.trim() ? "Summary not generated by AI." : "No summary available." };

      const cleanedExtractedTerms = currentParsedDetails.extractedTerms
        ? JSON.parse(JSON.stringify(currentParsedDetails.extractedTerms)) 
        : {};
      
      const suggestionsToSave = negotiationSuggestions 
        ? JSON.parse(JSON.stringify(negotiationSuggestions)) 
        : null;

      const contractDataForFirestore: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
        userId: user.uid,
        brand: currentParsedDetails.brand || "Unknown Brand",
        amount: currentParsedDetails.amount || 0,
        dueDate: currentParsedDetails.dueDate || new Date().toISOString().split('T')[0],
        status: 'pending' as Contract['status'],
        contractType: 'other' as Contract['contractType'],
        contractText: contractText,
        fileName: fileName.trim() || (selectedFile ? selectedFile.name : (contractText.trim() ? "Pasted Contract" : "Untitled Contract")),
        fileUrl: fileUrlToSave || null,
        summary: currentSummary.summary,
        extractedTerms: cleanedExtractedTerms,
        negotiationSuggestions: suggestionsToSave,
        invoiceStatus: 'none', 
        createdAt: firebaseServerTimestamp(),
        updatedAt: firebaseServerTimestamp(),
      };
      
      const trimmedProjectName = projectName.trim();
      if (trimmedProjectName) {
        contractDataForFirestore.projectName = trimmedProjectName;
      }

      const trimmedClientName = clientName.trim();
      if (trimmedClientName) {
        contractDataForFirestore.clientName = trimmedClientName;
      }
      const trimmedClientEmail = clientEmail.trim();
      if (trimmedClientEmail) {
        contractDataForFirestore.clientEmail = trimmedClientEmail;
      }
      const trimmedClientAddress = clientAddress.trim();
      if (trimmedClientAddress) {
        contractDataForFirestore.clientAddress = trimmedClientAddress;
      }
      const trimmedPaymentInstructions = paymentInstructions.trim();
      if (trimmedPaymentInstructions) {
        contractDataForFirestore.paymentInstructions = trimmedPaymentInstructions;
      }


      await addDoc(collection(db, 'contracts'), contractDataForFirestore);
      
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
            Upload a contract file and/or paste its text. Fill in client details for invoicing.
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
            <Label htmlFor="projectName">Project Name (Optional)</Label>
            <Input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Q3 YouTube Campaign"
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
                if (file && !fileName.trim()) {
                  setFileName(file.name);
                }
              }}
            />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Client & Payment Details (for Invoicing)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client Company Inc." className="mt-1" />
              </div>
              <div>
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="contact@client.com" className="mt-1" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Textarea id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} placeholder="123 Client St, City, Country" className="mt-1" rows={3}/>
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="paymentInstructions">Payment Instructions (Bank details, PayPal, etc.)</Label>
                <Textarea id="paymentInstructions" value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} placeholder="Bank: XYZ, Account: 12345, Swift: ABCDE..." className="mt-1" rows={3}/>
              </div>
            </CardContent>
          </Card>

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
              *Pasting text is required if you want AI to extract details, summarize, and get negotiation suggestions.
            </p>
          </div>

          <Button onClick={handleParseContract} disabled={isParsing || !contractText.trim() || isSaving} className="w-full sm:w-auto">
            {isParsing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            Process Text with AI
          </Button>

          {parseError && (
            <div className="mt-4 p-3 rounded-md bg-destructive/10 text-destructive border border-destructive/20 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">AI Processing Error</p>
                <p className="text-sm">{parseError}</p>
              </div>
            </div>
          )}

          {(parsedDetails || summary || negotiationSuggestions) && !parseError && (
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
              {negotiationSuggestions && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Negotiation Suggestions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {negotiationSuggestions.paymentTerms && <p><strong>Payment Terms:</strong> {negotiationSuggestions.paymentTerms}</p>}
                    {negotiationSuggestions.exclusivity && <p><strong>Exclusivity:</strong> {negotiationSuggestions.exclusivity}</p>}
                    {negotiationSuggestions.ipRights && <p><strong>IP Rights:</strong> {negotiationSuggestions.ipRights}</p>}
                    {negotiationSuggestions.generalSuggestions && negotiationSuggestions.generalSuggestions.length > 0 && (
                      <div>
                        <strong>General Suggestions:</strong>
                        <ul className="list-disc list-inside ml-4 text-muted-foreground">
                          {negotiationSuggestions.generalSuggestions.map((item, i) => <li key={i}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                    {(!negotiationSuggestions.paymentTerms && !negotiationSuggestions.exclusivity && !negotiationSuggestions.ipRights && (!negotiationSuggestions.generalSuggestions || negotiationSuggestions.generalSuggestions.length === 0)) && (
                      <p className="text-muted-foreground">No specific negotiation suggestions generated by AI for this text.</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
        </ScrollArea>
        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSaveContract} disabled={isParsing || (!selectedFile && !contractText.trim() && !parsedDetails) || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

