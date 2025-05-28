
"use client";

import { useEffect, useState, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db, doc, getDoc, updateDoc, Timestamp } from '@/lib/firebase';
import type { Contract } from '@/types';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';

export default function EditContractPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [brand, setBrand] = useState('');
  const [projectName, setProjectName] = useState('');
  const [amount, setAmount] = useState<number | string>('');
  const [dueDate, setDueDate] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  useEffect(() => {
    if (id && user && !authLoading) {
      setIsLoadingContract(true);
      const fetchContract = async () => {
        try {
          const contractDocRef = doc(db, 'contracts', id);
          const contractSnap = await getDoc(contractDocRef);
          if (contractSnap.exists() && contractSnap.data().userId === user.uid) {
            const data = contractSnap.data() as Contract;
            setContract(data);
            // Pre-fill form fields
            setBrand(data.brand || '');
            setProjectName(data.projectName || '');
            setAmount(data.amount || '');
            setDueDate(data.dueDate || '');
            setClientName(data.clientName || '');
            setClientEmail(data.clientEmail || '');
            setClientAddress(data.clientAddress || '');
            setPaymentInstructions(data.paymentInstructions || '');
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

  const handleSaveChanges = async (e: FormEvent) => {
    e.preventDefault();
    if (!contract || !user) {
      toast({ title: "Error", description: "Contract or user data missing.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    const contractAmount = parseFloat(amount as string);
    if (isNaN(contractAmount) || contractAmount < 0) {
        toast({ title: "Invalid Amount", description: "Please enter a valid positive number for the amount.", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    try {
      const contractDocRef = doc(db, 'contracts', id);
      const updates: Partial<Contract> = {
        brand: brand.trim(),
        projectName: projectName.trim() || null, // Use null if empty to remove field
        amount: contractAmount,
        dueDate: dueDate,
        clientName: clientName.trim() || null,
        clientEmail: clientEmail.trim() || null,
        clientAddress: clientAddress.trim() || null,
        paymentInstructions: paymentInstructions.trim() || null,
        updatedAt: Timestamp.now(),
      };

      // Filter out null values to effectively remove fields if they are emptied
      const finalUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== null));


      await updateDoc(contractDocRef, finalUpdates);
      toast({ title: "Contract Updated", description: "Changes saved successfully." });
      router.push(`/contracts/${id}`);
    } catch (error) {
      console.error("Error updating contract:", error);
      toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingContract || authLoading) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="Edit Contract" description="Loading contract details..." />
        <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Contract Not Found</h2>
        <Button asChild variant="outline">
          <Link href="/contracts"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Contracts</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit Contract: ${contract.brand}`}
        description="Modify the details of your contract."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/contracts/${id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Cancel</Link>
          </Button>
        }
      />
      <form onSubmit={handleSaveChanges}>
        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
            <CardDescription>Update the core information for this agreement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="brand">Brand Name</Label>
                <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="projectName">Project Name (Optional)</Label>
                <Input id="projectName" value={projectName} onChange={(e) => setProjectName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" step="0.01" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Client & Payment Information</CardTitle>
            <CardDescription>Update details relevant for invoicing the client.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" value={clientName} onChange={(e) => setClientName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="clientEmail">Client Email</Label>
                <Input id="clientEmail" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="mt-6">
              <Label htmlFor="clientAddress">Client Address</Label>
              <Textarea id="clientAddress" value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} rows={3} className="mt-1" />
            </div>
            <div className="mt-6">
              <Label htmlFor="paymentInstructions">Payment Instructions</Label>
              <Textarea id="paymentInstructions" value={paymentInstructions} onChange={(e) => setPaymentInstructions(e.target.value)} rows={3} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push(`/contracts/${id}`)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </form>
    </>
  );
}
