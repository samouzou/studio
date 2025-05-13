import type { EarningsDataPoint } from '@/types';

// MOCK_USER is removed, will come from Firebase Auth
// MOCK_CONTRACTS, MOCK_UPCOMING_INCOME, MOCK_AT_RISK_PAYMENTS are removed, will be derived from Firestore

export const MOCK_EARNINGS_DATA: EarningsDataPoint[] = [
  { month: 'Jan', year: 2024, earnings: 5000 },
  { month: 'Feb', year: 2024, earnings: 7500 },
  { month: 'Mar', year: 2024, earnings: 6000 },
  { month: 'Apr', year: 2024, earnings: 8200 },
  { month: 'May', year: 2024, earnings: 4500 },
  { month: 'Jun', year: 2024, earnings: 9500 },
  // Add more months if needed for a full year view
  { month: 'Jul', year: 2024, earnings: 6800 },
  { month: 'Aug', year: 2024, earnings: 7200 },
  { month: 'Sep', year: 2024, earnings: 0 }, // Placeholder for future months
  { month: 'Oct', year: 2024, earnings: 0 },
  { month: 'Nov', year: 2024, earnings: 0 },
  { month: 'Dec', year: 2024, earnings: 0 },
];

export const MOCK_PROJECT_NAMES: string[] = ["Q3 Campaign", "Summer Promo", "Creator Collab", "Product Launch", "Annual Review Campaign"];
export const MOCK_BRAND_NAMES: string[] = ["Nike", "Adobe", "Squarespace", "Skillshare", "Loom", "Canva", "Figma", "Monday.com", "Notion"];
