import { PageHeader } from "@/components/page-header";
import { EarningsChart } from "@/components/dashboard/earnings-chart";
import { AtRiskPayments } from "@/components/dashboard/at-risk-payments";
import { UpcomingIncomeList } from "@/components/dashboard/upcoming-income";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { MOCK_EARNINGS_DATA, MOCK_UPCOMING_INCOME, MOCK_AT_RISK_PAYMENTS, MOCK_CONTRACTS } from "@/data/mock-data";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { DollarSign, FileText, AlertCircle, CalendarCheck } from "lucide-react";

export default function DashboardPage() {
  const totalPendingIncome = MOCK_UPCOMING_INCOME.reduce((sum, item) => sum + item.amount, 0);
  const totalContracts = MOCK_CONTRACTS.length;
  const totalOverdue = MOCK_AT_RISK_PAYMENTS.filter(p => p.status === 'overdue').length;
  const paidThisMonth = MOCK_CONTRACTS.filter(c => {
    const today = new Date();
    const dueDate = new Date(c.dueDate);
    return c.status === 'paid' && dueDate.getMonth() === today.getMonth() && dueDate.getFullYear() === today.getFullYear();
  }).reduce((sum, item) => sum + item.amount, 0);


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
          value={`$${totalPendingIncome.toLocaleString()}`}
          icon={DollarSign}
          description={`${MOCK_UPCOMING_INCOME.length} upcoming payments`}
        />
        <SummaryCard 
          title="Active Contracts" 
          value={totalContracts.toString()}
          icon={FileText}
          description="Total contracts managed"
        />
        <SummaryCard 
          title="Payments At Risk" 
          value={MOCK_AT_RISK_PAYMENTS.length.toString()}
          icon={AlertCircle}
          description={`${totalOverdue} overdue`}
          className={MOCK_AT_RISK_PAYMENTS.length > 0 ? "border-destructive text-destructive dark:border-destructive/70" : ""}
        />
         <SummaryCard 
          title="Paid This Month" 
          value={`$${paidThisMonth.toLocaleString()}`}
          icon={CalendarCheck}
          description="Successfully received"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EarningsChart data={MOCK_EARNINGS_DATA} />
        </div>
        <div className="lg:col-span-1 space-y-6">
           <UpcomingIncomeList incomeSources={MOCK_UPCOMING_INCOME.slice(0,5)} />
        </div>
      </div>

      <div className="mt-6">
        <AtRiskPayments payments={MOCK_AT_RISK_PAYMENTS} />
      </div>
    </>
  );
}
