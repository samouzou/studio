
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { AtRiskPayments } from "@/components/dashboard/at-risk-payments";
import { UpcomingIncomeList } from "@/components/dashboard/upcoming-income";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { DollarSign, FileText, AlertCircle, CalendarCheck, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db, collection, query, where, getDocs, Timestamp } from '@/lib/firebase';
import type { Contract, EarningsDataPoint, UpcomingIncome, AtRiskPayment } from "@/types";
import { MOCK_EARNINGS_DATA } from "@/data/mock-data"; // Keep for chart as placeholder
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to add days to a date
const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

interface DashboardStats {
  totalPendingIncome: number;
  upcomingIncomeCount: number;
  totalContractsCount: number;
  atRiskPaymentsCount: number;
  totalOverdueCount: number;
  paidThisMonthAmount: number;
  upcomingIncomeList: UpcomingIncome[];
  atRiskPaymentsList: AtRiskPayment[];
  earningsChartData: EarningsDataPoint[];
}

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingData(true);
      const fetchDashboardData = async () => {
        try {
          const contractsCol = collection(db, 'contracts');
          const q = query(contractsCol, where('userId', '==', user.uid));
          const contractSnapshot = await getDocs(q);
          
          const fetchedContracts: Contract[] = contractSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            // Ensure timestamps are correctly handled
            let createdAt = data.createdAt;
            if (createdAt && !(createdAt instanceof Timestamp)) {
              if (createdAt.seconds && typeof createdAt.seconds === 'number') {
                createdAt = new Timestamp(createdAt.seconds, createdAt.nanoseconds || 0);
              } else {
                createdAt = Timestamp.now(); // Fallback
              }
            }
            let updatedAt = data.updatedAt;
            if (updatedAt && !(updatedAt instanceof Timestamp)) {
              if (updatedAt.seconds && typeof updatedAt.seconds === 'number') {
                updatedAt = new Timestamp(updatedAt.seconds, updatedAt.nanoseconds || 0);
              } else {
                updatedAt = Timestamp.now(); // Fallback
              }
            }
            return { 
              id: docSnap.id, 
              ...data,
              createdAt: createdAt || Timestamp.now(), // Ensure createdAt is a Timestamp
              updatedAt: updatedAt, // Can be undefined if not set
            } as Contract;
          });
          
          const today = new Date();
          const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const sevenDaysFromTodayMidnight = addDays(todayMidnight, 7);

          const upcomingIncomeSource: UpcomingIncome[] = [];
          const atRiskPaymentsList: AtRiskPayment[] = [];
          let totalPendingIncome = 0;
          let paidThisMonthAmount = 0;
          let totalOverdueCount = 0;

          fetchedContracts.forEach(c => {
            const contractDueDate = new Date(c.dueDate + 'T00:00:00'); // Ensure parsing as local date

            // Upcoming Income & Total Pending Income
            if ((c.status === 'pending' || c.status === 'invoiced') && contractDueDate >= todayMidnight) {
              upcomingIncomeSource.push({ id: c.id, brand: c.brand, amount: c.amount, dueDate: c.dueDate });
              if(c.status === 'pending' || c.status === 'invoiced'){ // double check status for pending income sum
                 totalPendingIncome += c.amount;
              }
            }

            // Paid This Month
            if (c.status === 'paid') {
              const paidDate = contractDueDate; // Assuming payment happens around due date for simplicity
              if (paidDate.getMonth() === today.getMonth() && 
                  paidDate.getFullYear() === today.getFullYear()) {
                paidThisMonthAmount += c.amount;
              }
            }

            // At Risk Payments & Overdue Count
            let isAtRisk = false;
            let riskReason = "";
            let effectiveStatus = c.status;

            if (c.status === 'overdue') {
              isAtRisk = true;
              riskReason = 'Payment overdue';
              totalOverdueCount++;
            } else if (c.status === 'pending') {
              if (contractDueDate < todayMidnight) { // Past due
                isAtRisk = true;
                riskReason = 'Payment overdue';
                effectiveStatus = 'overdue'; 
                totalOverdueCount++;
              } else if (contractDueDate < sevenDaysFromTodayMidnight) { // Due soon (today up to next 6 days)
                isAtRisk = true;
                riskReason = 'Due soon';
              }
            }

            if (isAtRisk) {
              atRiskPaymentsList.push({
                id: c.id,
                brand: c.brand,
                amount: c.amount,
                dueDate: c.dueDate,
                status: effectiveStatus,
                riskReason: riskReason,
              });
            }
          });

          upcomingIncomeSource.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
          atRiskPaymentsList.sort((a, b) => {
            const aIsOverdue = a.riskReason === 'Payment overdue';
            const bIsOverdue = b.riskReason === 'Payment overdue';
            if (aIsOverdue && !bIsOverdue) return -1;
            if (!aIsOverdue && bIsOverdue) return 1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          });

          setStats({
            totalPendingIncome,
            upcomingIncomeCount: upcomingIncomeSource.length,
            totalContractsCount: fetchedContracts.length,
            atRiskPaymentsCount: atRiskPaymentsList.length,
            totalOverdueCount,
            paidThisMonthAmount,
            upcomingIncomeList: upcomingIncomeSource,
            atRiskPaymentsList: atRiskPaymentsList,
            earningsChartData: MOCK_EARNINGS_DATA, 
          });

        } catch (error) {
          console.error("Error fetching dashboard data:", error);
          setStats(null);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchDashboardData();
    } else if (!authLoading && !user) {
      setStats(null);
      setIsLoadingData(false);
    }
  }, [user, authLoading]);

  if (authLoading || isLoadingData) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Overview of your earnings, contracts, and payment timelines."
        />
        <DashboardFilters /> {/* Filters can be shown while loading */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-[350px] w-full" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
        <div className="mt-6">
          <Skeleton className="h-[200px] w-full" />
        </div>
      </>
    );
  }

  if (!user) {
     return (
        <div className="flex flex-col items-center justify-center h-full">
            <AlertCircle className="w-12 h-12 text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Please log in to view your dashboard.</p>
        </div>
     )
  }
  
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
         <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Could not load dashboard data.</h2>
        <p className="text-muted-foreground">Please try again later.</p>
      </div>
    );
  }


  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your earnings, contracts, and payment timelines."
      />
      
      <DashboardFilters />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard 
          title="Total Pending Income" 
          value={`$${stats.totalPendingIncome.toLocaleString()}`}
          icon={DollarSign}
          description={`${stats.upcomingIncomeCount} upcoming payments`}
        />
        <SummaryCard 
          title="Active Contracts" 
          value={stats.totalContractsCount.toString()}
          icon={FileText}
          description="Total contracts managed"
        />
        <SummaryCard 
          title="Payments At Risk" 
          value={stats.atRiskPaymentsCount.toString()}
          icon={AlertCircle}
          description={`${stats.totalOverdueCount} overdue`}
          className={stats.atRiskPaymentsCount > 0 ? "border-destructive text-destructive dark:border-destructive/70" : ""}
        />
         <SummaryCard 
          title="Paid This Month" 
          value={`$${stats.paidThisMonthAmount.toLocaleString()}`}
          icon={CalendarCheck}
          description="Successfully received"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EarningsChart data={stats.earningsChartData} />
        </div>
        <div className="lg:col-span-1 space-y-6">
           <UpcomingIncomeList incomeSources={stats.upcomingIncomeList.slice(0,5)} />
        </div>
      </div>

      <div className="mt-6">
        <AtRiskPayments payments={stats.atRiskPaymentsList} />
      </div>
    </>
  );
}

