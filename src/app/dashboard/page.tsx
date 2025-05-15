
"use client";

import { useEffect, useState, useMemo } from "react";
import type { DateRange } from "react-day-picker";
import { PageHeader } from "@/components/page-header";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { AtRiskPayments } from "@/components/dashboard/at-risk-payments";
import { UpcomingIncomeList } from "@/components/dashboard/upcoming-income";
import { DashboardFilters, type DashboardFilterState } from "@/components/dashboard/dashboard-filters";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { DollarSign, FileText, AlertCircle, CalendarCheck, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { db, collection, query, where, getDocs, Timestamp } from '@/lib/firebase';
import type { Contract, EarningsDataPoint, UpcomingIncome, AtRiskPayment } from "@/types";
import { MOCK_EARNINGS_DATA } from "@/data/mock-data";
import { Skeleton } from "@/components/ui/skeleton";

const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

interface DashboardStats {
  totalPendingIncome: number;
  upcomingIncomeCount: number;
  totalContractsCount: number; // This will be total contracts *before* filtering for display
  atRiskPaymentsCount: number;
  totalOverdueCount: number;
  paidThisMonthAmount: number;
  upcomingIncomeList: UpcomingIncome[];
  atRiskPaymentsList: AtRiskPayment[];
  earningsChartData: EarningsDataPoint[]; // Stays mock for now
}

const initialFilterState: DashboardFilterState = {
  brand: "all",
  project: "all",
  dateRange: undefined,
};

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [filters, setFilters] = useState<DashboardFilterState>(initialFilterState);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);

  // Fetch all contracts for the user once
  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingData(true);
      const fetchAllContracts = async () => {
        try {
          const contractsCol = collection(db, 'contracts');
          const q = query(contractsCol, where('userId', '==', user.uid));
          const contractSnapshot = await getDocs(q);
          
          const fetchedContracts: Contract[] = contractSnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            let createdAt = data.createdAt;
            if (createdAt && !(createdAt instanceof Timestamp)) {
              if (createdAt.seconds && typeof createdAt.seconds === 'number') {
                createdAt = new Timestamp(createdAt.seconds, createdAt.nanoseconds || 0);
              } else { createdAt = Timestamp.now(); }
            }
            let updatedAt = data.updatedAt;
            if (updatedAt && !(updatedAt instanceof Timestamp)) {
              if (updatedAt.seconds && typeof updatedAt.seconds === 'number') {
                updatedAt = new Timestamp(updatedAt.seconds, updatedAt.nanoseconds || 0);
              } else { updatedAt = Timestamp.now(); }
            }
            return { 
              id: docSnap.id, 
              ...data,
              createdAt: createdAt || Timestamp.now(),
              updatedAt: updatedAt,
            } as Contract;
          });
          setAllContracts(fetchedContracts);

          // Extract unique brand and project names for filters
          const brands = new Set<string>();
          const projects = new Set<string>();
          fetchedContracts.forEach(c => {
            if (c.brand) brands.add(c.brand);
            if (c.projectName) projects.add(c.projectName);
          });
          setAvailableBrands(Array.from(brands).sort());
          setAvailableProjects(Array.from(projects).sort());

        } catch (error) {
          console.error("Error fetching all contracts:", error);
          setAllContracts([]);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchAllContracts();
    } else if (!authLoading && !user) {
      setAllContracts([]);
      setIsLoadingData(false);
    }
  }, [user, authLoading]);

  // Calculate stats whenever allContracts or filters change
  useEffect(() => {
    if (isLoadingData || !user) return; // Don't calculate if still loading or no user

    const filteredContracts = allContracts.filter(c => {
      const brandMatch = filters.brand === "all" || c.brand === filters.brand;
      const projectMatch = filters.project === "all" || c.projectName === filters.project;
      
      let dateMatch = true;
      if (filters.dateRange?.from) {
        const contractDueDate = new Date(c.dueDate + 'T00:00:00');
        const fromDate = new Date(filters.dateRange.from.getFullYear(), filters.dateRange.from.getMonth(), filters.dateRange.from.getDate());
        
        if (filters.dateRange.to) {
          const toDate = new Date(filters.dateRange.to.getFullYear(), filters.dateRange.to.getMonth(), filters.dateRange.to.getDate(), 23, 59, 59);
          dateMatch = contractDueDate >= fromDate && contractDueDate <= toDate;
        } else {
          dateMatch = contractDueDate >= fromDate && contractDueDate < addDays(fromDate, 1) ; // Match single day
        }
      }
      return brandMatch && projectMatch && dateMatch;
    });
    
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const sevenDaysFromTodayMidnight = addDays(todayMidnight, 7);

    const upcomingIncomeSource: UpcomingIncome[] = [];
    const atRiskPaymentsList: AtRiskPayment[] = [];
    let totalPendingIncome = 0;
    let paidThisMonthAmount = 0;
    let totalOverdueCount = 0;

    filteredContracts.forEach(c => {
      const contractDueDate = new Date(c.dueDate + 'T00:00:00'); 

      if ((c.status === 'pending' || c.status === 'invoiced') && contractDueDate >= todayMidnight) {
        upcomingIncomeSource.push({ id: c.id, brand: c.brand, amount: c.amount, dueDate: c.dueDate, projectName: c.projectName });
        if(c.status === 'pending' || c.status === 'invoiced'){
           totalPendingIncome += c.amount;
        }
      }

      if (c.status === 'paid') {
        const paidDate = contractDueDate; 
        if (paidDate.getMonth() === today.getMonth() && 
            paidDate.getFullYear() === today.getFullYear()) {
          paidThisMonthAmount += c.amount;
        }
      }

      let isAtRisk = false;
      let riskReason = "";
      let effectiveStatus = c.status;

      if (c.status === 'overdue') {
        isAtRisk = true;
        riskReason = 'Payment overdue';
        totalOverdueCount++;
      } else if (c.status === 'pending' || c.status === 'invoiced') { // Include invoiced here
        if (contractDueDate < todayMidnight) { 
          isAtRisk = true;
          riskReason = 'Payment overdue';
          effectiveStatus = 'overdue'; 
          totalOverdueCount++;
        } else if (contractDueDate < sevenDaysFromTodayMidnight) { 
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
          projectName: c.projectName,
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
      totalContractsCount: allContracts.length, // Show total contracts before filtering
      atRiskPaymentsCount: atRiskPaymentsList.length,
      totalOverdueCount,
      paidThisMonthAmount,
      upcomingIncomeList: upcomingIncomeSource,
      atRiskPaymentsList: atRiskPaymentsList,
      earningsChartData: MOCK_EARNINGS_DATA, 
    });

  }, [allContracts, filters, user, isLoadingData]);

  const handleFiltersChange = (newFilters: DashboardFilterState) => {
    setFilters(newFilters);
  };

  if (authLoading || isLoadingData) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          description="Overview of your earnings, contracts, and payment timelines."
        />
        <DashboardFilters 
          availableBrands={[]} 
          availableProjects={[]} 
          onFiltersChange={handleFiltersChange}
          initialFilters={initialFilterState} 
        />
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
      
      <DashboardFilters 
        availableBrands={availableBrands} 
        availableProjects={availableProjects} 
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <SummaryCard 
          title="Pending Income (Filtered)" 
          value={`$${stats.totalPendingIncome.toLocaleString()}`}
          icon={DollarSign}
          description={`${stats.upcomingIncomeCount} upcoming payments`}
        />
        <SummaryCard 
          title="Total Active Contracts" 
          value={stats.totalContractsCount.toString()} // This shows total before filtering
          icon={FileText}
          description="All contracts managed"
        />
        <SummaryCard 
          title="Payments At Risk (Filtered)" 
          value={stats.atRiskPaymentsCount.toString()}
          icon={AlertCircle}
          description={`${stats.totalOverdueCount} overdue`}
          className={stats.atRiskPaymentsCount > 0 ? "border-destructive text-destructive dark:border-destructive/70" : ""}
        />
         <SummaryCard 
          title="Paid This Month (Filtered)" 
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
