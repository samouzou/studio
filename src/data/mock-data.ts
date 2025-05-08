import type { Contract, EarningsDataPoint, UpcomingIncome, AtRiskPayment } from '@/types';

export const MOCK_USER = {
  name: 'Alex Creator',
  email: 'alex.creator@example.com',
  avatarUrl: 'https://picsum.photos/100/100?image=823',
};

const today = new Date();
const formatDate = (date: Date): string => date.toISOString().split('T')[0];
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: '1',
    brand: 'Nike',
    amount: 4500,
    dueDate: formatDate(addDays(today, 30)),
    status: 'pending',
    contractType: 'sponsorship',
    extractedTerms: {
      deliverables: ['1 Instagram Reel', '2 Story posts'],
      paymentMethod: 'Bank Transfer',
    },
    summary: 'Standard sponsorship agreement for social media promotion.',
    fileName: 'Nike_Sponsorship_Q3.pdf',
    createdAt: formatDate(addDays(today, -10)),
  },
  {
    id: '2',
    brand: 'Adobe',
    amount: 2000,
    dueDate: formatDate(addDays(today, -5)), // Overdue
    status: 'overdue',
    contractType: 'consulting',
    extractedTerms: {
      deliverables: ['Workshop on Adobe XD'],
      lateFeePenalty: '2% per week',
    },
    summary: 'Consulting services for a design workshop.',
    fileName: 'Adobe_Consulting_May.docx',
    createdAt: formatDate(addDays(today, -40)),
  },
  {
    id: '3',
    brand: 'Squarespace',
    amount: 3000,
    dueDate: formatDate(addDays(today, 60)),
    status: 'pending',
    contractType: 'affiliate',
    summary: 'Affiliate marketing terms for promoting Squarespace.',
    fileName: 'Squarespace_Affiliate.pdf',
    createdAt: formatDate(addDays(today, -5)),
  },
  {
    id: '4',
    brand: 'Skillshare',
    amount: 1500,
    dueDate: formatDate(addDays(today, -35)), // Paid
    status: 'paid',
    contractType: 'sponsorship',
    summary: 'Paid sponsorship for creating an online course.',
    fileName: 'Skillshare_Course_Sponsorship.pdf',
    createdAt: formatDate(addDays(today, -70)),
  },
  {
    id: '5',
    brand: "Loom",
    amount: 750,
    dueDate: formatDate(addDays(today, 15)),
    status: "invoiced",
    contractType: "sponsorship",
    fileName: "Loom_Video_Ad.pdf",
    createdAt: formatDate(addDays(today, -2)),
  }
];

export const MOCK_EARNINGS_DATA: EarningsDataPoint[] = [
  { month: 'Jan', year: 2024, earnings: 5000 },
  { month: 'Feb', year: 2024, earnings: 7500 },
  { month: 'Mar', year: 2024, earnings: 6000 },
  { month: 'Apr', year: 2024, earnings: 8200 },
  { month: 'May', year: 2024, earnings: 4500 },
  { month: 'Jun', year: 2024, earnings: 9500 },
];

export const MOCK_UPCOMING_INCOME: UpcomingIncome[] = MOCK_CONTRACTS
  .filter(c => c.status === 'pending' || c.status === 'invoiced')
  .map(({ id, brand, amount, dueDate }) => ({ id, brand, amount, dueDate }))
  .sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

export const MOCK_AT_RISK_PAYMENTS: AtRiskPayment[] = MOCK_CONTRACTS
  .filter(c => c.status === 'overdue' || (c.status === 'pending' && new Date(c.dueDate) < addDays(today, 7)))
  .map(({ id, brand, amount, dueDate, status }) => ({
    id,
    brand,
    amount,
    dueDate,
    status,
    riskReason: status === 'overdue' ? 'Payment overdue' : 'Due soon, no invoice sent',
  }));

export const MOCK_PROJECT_NAMES: string[] = ["Q3 Campaign", "Summer Promo", "Creator Collab", "Product Launch"];
export const MOCK_BRAND_NAMES: string[] = ["Nike", "Adobe", "Squarespace", "Skillshare", "Loom", "Canva", "Figma"];
