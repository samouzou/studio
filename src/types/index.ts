
import type { Timestamp } from 'firebase/firestore';

export interface Contract {
  id: string; // Document ID from Firestore
  userId: string; // Firebase Auth User ID
  brand: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'overdue' | 'at_risk' | 'invoiced';
  contractType: 'sponsorship' | 'consulting' | 'affiliate' | 'retainer' | 'other';
  projectName?: string; // Optional project name
  extractedTerms?: {
    paymentMethod?: string;
    usageRights?: string;
    terminationClauses?: string;
    deliverables?: string[];
    lateFeePenalty?: string;
  };
  summary?: string;
  contractText?: string;
  fileName?: string;
  fileUrl: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface EarningsDataPoint {
  month: string; // e.g., "Jan", "Feb"
  year: number; // e.g., 2024
  earnings: number;
}

export interface UpcomingIncome extends Pick<Contract, 'id' | 'brand' | 'amount' | 'dueDate' | 'projectName'> {}

export interface AtRiskPayment extends Pick<Contract, 'id' | 'brand' | 'amount' | 'dueDate' | 'status' | 'projectName'> {
  riskReason: string;
}
