export interface Contract {
  id: string; // Document ID from Firestore
  userId: string; // Firebase Auth User ID
  brand: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'paid' | 'overdue' | 'at_risk' | 'invoiced';
  contractType: 'sponsorship' | 'consulting' | 'affiliate' | 'retainer' | 'other';
  extractedTerms?: { // Made optional and fields within are optional
    paymentMethod?: string;
    usageRights?: string;
    terminationClauses?: string;
    deliverables?: string[];
    lateFeePenalty?: string;
  };
  summary?: string;
  contractText?: string;
  fileName?: string;
  createdAt: string; // ISO Date string (consider Firebase Timestamp for server-side generation)
  updatedAt?: string; // ISO Date string (optional, can be set on updates)
}

export interface EarningsDataPoint {
  month: string; // e.g., "Jan", "Feb"
  year: number; // e.g., 2024
  earnings: number;
}

export interface UpcomingIncome extends Pick<Contract, 'id' | 'brand' | 'amount' | 'dueDate'> {}

export interface AtRiskPayment extends Pick<Contract, 'id' | 'brand' | 'amount' | 'dueDate' | 'status'> {
  riskReason: string;
}
