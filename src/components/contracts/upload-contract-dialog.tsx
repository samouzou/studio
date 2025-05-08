"use client";

import { useState, useTransition } from "react";
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

interface UploadContractDialogProps {
  onContractAdded: (newContract: Contract) => void;
}

export function UploadContractDialog({ onContractAdded }: UploadContractDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [contractText, setContractText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isParsing, startTransition] = useTransition();
  const { toast } = useToast();

  const [parsedDetails, setParsedDetails] = useState<ExtractContractDetailsOutput | null>(null);
  const [summary, setSummary] = useState<SummarizeContractTermsOutput | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      // For MVP, we're focusing on text input. File reading can be added later.
      // For now, if a file is selected, we'll just use its name.
      // User still needs to paste text.
      // const text = await file.text();
      // setContractText(text);
      toast({ title: "File selected", description: `${file.name} selected. Please paste contract text below.` });
    }
  };

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

    startTransition(async () => {
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

  const handleSaveContract = () => {
    // For MVP, this is a mock save. In a real app, this would go to a database.
    if (!parsedDetails) {
      toast({ title: "Cannot Save", description: "No contract details parsed yet.", variant: "destructive" });
      return;
    }
    const newContract: Contract = {
      id: crypto.randomUUID(),
      brand: parsedDetails.brand || "Unknown Brand",
      amount: parsedDetails.amount || 0,
      dueDate: parsedDetails.dueDate || new Date().toISOString().split('T')[0],
      status: 'pending', // Default status
      contractType: 'other', // Default type
      contractText: contractText,
      fileName: fileName || "Pasted Contract",
      summary: summary?.summary || "No summary available.",
      createdAt: new Date().toISOString(),
      // extractedTerms: {} // Can be expanded later
    };
    onContractAdded(newContract);
    toast({ title: "Contract Saved (Mock)", description: `${newContract.brand} contract added to the list.` });
    setIsOpen(false);
    // Reset state for next time
    setContractText("");
    setFileName("");
    setParsedDetails(null);
    setSummary(null);
    setParseError(null);
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
            Upload a contract file (PDF, DOCX) or paste the text directly to parse its terms.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-200px)]">
        <div className="grid gap-6 p-1 pr-4"> {/* Added padding for scrollbar */}
          {/* For MVP, focusing on text input. File upload UI is minimal. */}
          {/* <div className="grid w-full max-w-sm items-center gap-1.5">
            <Label htmlFor="contractFile">Upload Contract File</Label>
            <Input id="contractFile" type="file" onChange={handleFileChange} accept=".pdf,.doc,.docx,.txt" />
            {fileName && <p className="text-sm text-muted-foreground">Selected: {fileName}</p>}
          </div>
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div> */}
          <div>
            <Label htmlFor="contractText">Paste Contract Text</Label>
            <Textarea
              id="contractText"
              value={contractText}
              onChange={(e) => setContractText(e.target.value)}
              placeholder="Paste the full text of your contract here..."
              rows={10}
              className="mt-1"
            />
          </div>

          <Button onClick={handleParseContract} disabled={isParsing || !contractText.trim()} className="w-full sm:w-auto">
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

          {(parsedDetails || summary) && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-semibold text-foreground">AI Analysis Results</h3>
              {parsedDetails && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-md">Extracted Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Brand:</strong> {parsedDetails.brand || 'N/A'}</p>
                    <p><strong>Amount:</strong> {parsedDetails.amount ? `$${parsedDetails.amount.toLocaleString()}` : 'N/A'}</p>
                    <p><strong>Due Date:</strong> {parsedDetails.dueDate ? new Date(parsedDetails.dueDate).toLocaleDateString() : 'N/A'}</p>
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
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveContract} disabled={isParsing || !parsedDetails}>
            Save Contract
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
