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

export const RevenueReportsPage: React.FC = () => {
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
      const res = await reportsApi.getRevenueReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load revenue report:", err);
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

  const revenueTimelineOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 320 },
    stroke: { curve: "smooth", width: 2.5 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05 } },
    colors: ["#10b981", "#3b82f6", "#f59e0b"],
    yaxis: {
      ...baseChartOpts.yaxis,
      labels: {
        formatter: (v: number) => `${(v / 1000).toFixed(1)}k EGP`,
      },
    },
  };

  const paymentMethodDonutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#6366f1", "#10b981", "#3b82f6"],
    labels: (data?.paymentMethodDistribution || []).map((p: any) => p.label),
    legend: { position: "bottom", labels: { colors: isDark ? "#cbd5e1" : "#334155" } },
    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(1)}%` },
  };

  const paymentMethodDonutSeries = (data?.paymentMethodDistribution || []).map((p: any) => p.value || 0);

  const summary = data?.summary || {};

  return (
    <>
      <PageMeta title="Revenue & Payments Report | ArenaHub" description="Detailed financial and payment method analytics" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="💰" label="Gross Revenue" value={fmt(summary.grossRevenue)} sub={`Total Bookings: ${summary.totalBookings || 0}`} color="emerald" />
          <KpiCard icon="💵" label="Net Revenue" value={fmt(summary.netRevenue)} sub={`Refunds Deducted: ${fmt(summary.totalRefunds)}`} color="blue" />
          <KpiCard icon="💳" label="Card Online (Paymob)" value={fmt(summary.cardRevenue)} sub={`${summary.cardPct || 0}% of volume`} color="indigo" />
          <KpiCard icon="⏳" label="Uncollected Deposits" value={fmt(summary.outstandingDepositBalance)} sub={`${summary.depositBookingsCount || 0} deposit bookings`} color="amber" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trajectory Area Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Revenue Trajectory Over Time
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Gross bookings value vs Collected paid amount vs Coupon discounts</p>
            {data?.series && <Chart options={revenueTimelineOpts} series={data.series} type="area" height={300} />}
          </div>

          {/* Payment Method Distribution */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                Payment Method Split
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Volume by Card vs Cash vs Digital Wallet</p>
            </div>
            <div className="py-2">
              <Chart options={paymentMethodDonutOpts} series={paymentMethodDonutSeries} type="donut" height={240} />
            </div>
            <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-xs">
              {(data?.paymentMethodDistribution || []).map((pm: any) => (
                <div key={pm.label} className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span>{pm.label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{fmt(pm.value)} ({pct(pm.percentage)})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Deposit vs Full Payment Breakdown + Gateway Reconciliation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Booking Settlement Breakdown
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div>
                  <div className="font-bold text-emerald-800 dark:text-emerald-300">Full Payment Paid</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px]">{summary.fullPaidBookingsCount || 0} reservations settled in full</div>
                </div>
                <div className="font-black text-emerald-600 dark:text-emerald-400 text-sm">100% Paid</div>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                <div>
                  <div className="font-bold text-amber-800 dark:text-amber-300">Deposit Paid (Partial)</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px]">{summary.depositBookingsCount || 0} bookings with balance due</div>
                </div>
                <div className="font-black text-amber-600 dark:text-amber-400 text-sm">{fmt(summary.outstandingDepositBalance)} Due</div>
              </div>
              <div className="flex justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                <div>
                  <div className="font-bold text-blue-800 dark:text-blue-300">Pay at Venue (Cash)</div>
                  <div className="text-gray-500 dark:text-gray-400 text-[11px]">{summary.payAtVenueBookingsCount || 0} cash on arrival reservations</div>
                </div>
                <div className="font-black text-blue-600 dark:text-blue-400 text-sm">{fmt(summary.cashRevenue)}</div>
              </div>
            </div>
          </div>

          {/* Pending / Uncollected Deposits Table */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Pending / Uncollected Deposit Bookings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Reservations requiring on-site balance collection at reception</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                    <th className="pb-2.5">Code</th>
                    <th className="pb-2.5">Customer</th>
                    <th className="pb-2.5">Venue</th>
                    <th className="pb-2.5">Paid So Far</th>
                    <th className="pb-2.5 text-right font-black text-amber-600">Balance Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {(data?.pendingDepositsTable?.docs || []).slice(0, 8).map((b: any) => (
                    <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 font-bold text-gray-900 dark:text-white">{b.bookingCode}</td>
                      <td className="py-2.5">{b.customerName || "Customer"} <span className="text-gray-400 text-[10px]">({b.customerPhone})</span></td>
                      <td className="py-2.5">{b.venueName || "Venue"}</td>
                      <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">{fmt(b.paidAmount)}</td>
                      <td className="py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">{fmt(b.remainingAmount)}</td>
                    </tr>
                  ))}
                  {(!data?.pendingDepositsTable?.docs || data.pendingDepositsTable.docs.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">No pending uncollected deposit balances found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
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

export default RevenueReportsPage;
