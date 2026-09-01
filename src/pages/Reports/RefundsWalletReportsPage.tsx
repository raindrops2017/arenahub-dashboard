import React, { useState, useEffect, useCallback } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { reportsApi } from "../../services/api/reportsApi";
import ReportsFilterHeader, { FilterState } from "./ReportsFilterHeader";

const fmt = (n: number) => `${(n || 0).toLocaleString()} EGP`;
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

function useDarkMode() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const check = () => setDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export const RefundsWalletReportsPage: React.FC = () => {
  const isDark = useDarkMode();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const [filters, setFilters] = useState<FilterState>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      venueId: "",
      interval: "day",
    };
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getRefundsAndWalletReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load refunds & wallet report:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const baseChartOpts: ApexOptions = {
    chart: { background: "transparent", toolbar: { show: false }, fontFamily: "Inter, system-ui, sans-serif" },
    theme: { mode: isDark ? "dark" : "light" },
    grid: { borderColor: isDark ? "#1e293b" : "#e2e8f0", strokeDashArray: 4 },
    xaxis: { labels: { style: { colors: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", fontWeight: "600" } } },
    yaxis: { labels: { style: { colors: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", fontWeight: "600" } } },
    tooltip: { theme: isDark ? "dark" : "light", style: { fontSize: "12px" } },
    legend: { labels: { colors: isDark ? "#cbd5e1" : "#334155" }, fontSize: "12px", fontWeight: 600 },
  };

  const refundChartOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 300 },
    stroke: { curve: "smooth", width: 2.5 },
    colors: ["#f43f5e", "#6366f1"],
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 } },
  };

  const summary = data?.summary || {};

  return (
    <>
      <PageMeta title="Refunds & Wallet Liability Report | ArenaHub" description="Customer wallet liability, refund volume, and transaction velocity audit" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="🏦" label="Total Wallet Liability" value={fmt(summary.totalWalletLiability)} sub={`Sum across ${summary.activeCustomerWallets || 0} active user balances`} color="rose" />
          <KpiCard icon="💸" label="Total Refund Volume" value={fmt(summary.refundVolume)} sub={`${summary.refundCount || 0} cancellations refunded`} color="amber" />
          <KpiCard icon="📈" label="Refund Rate (%)" value={pct(summary.refundRatePct)} sub="Ratio of total transaction volume" color="blue" />
          <KpiCard icon="💳" label="Wallet Redemptions" value={fmt(summary.redeemedVolume)} sub={`Average balance: ${fmt(summary.averageWalletBalance)}`} color="emerald" />
        </div>

        {/* Refund Trajectory Chart */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Refunds Volume & Frequency Trajectory
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Refund transactions credited back to customer wallets over time</p>
          {data?.series && <Chart options={refundChartOpts} series={data.series} type="area" height={280} />}
        </div>

        {/* Wallet Audit Ledger Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Wallet Audit & Refund Ledger
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Complete audit trail of deposits, deductions, and booking refunds</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Receipt #</th>
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Type</th>
                  <th className="pb-2.5">Amount</th>
                  <th className="pb-2.5">Balance (Before → After)</th>
                  <th className="pb-2.5">Description</th>
                  <th className="pb-2.5 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.table?.docs || []).map((t: any) => {
                  const isRefund = t.type === "BOOKING_REFUND";
                  const isDeposit = t.type === "DEPOSIT";
                  return (
                    <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 font-bold text-gray-900 dark:text-white">{t.receiptNumber}</td>
                      <td className="py-2.5">{t.customerName || "Customer"} <span className="text-gray-400 text-[10px]">({t.customerPhone})</span></td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isRefund ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" :
                          isDeposit ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        }`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`py-2.5 font-bold ${isRefund || isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                        {isRefund || isDeposit ? "+" : "-"}{fmt(t.amount)}
                      </td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">
                        {fmt(t.balanceBefore)} → <strong className="text-gray-900 dark:text-white">{fmt(t.balanceAfter)}</strong>
                      </td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400 max-w-[200px] truncate">{t.description || "N/A"}</td>
                      <td className="py-2.5 text-right text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
                {(!data?.table?.docs || data.table.docs.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">No transaction records found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base p-1.5 rounded-xl border ${colorMap[color] || ""}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

export default RefundsWalletReportsPage;
