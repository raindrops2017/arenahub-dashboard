import React, { useState, useEffect, useCallback, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { reportsApi } from "../../services/api/reportsApi";
import ReportsFilterHeader, { FilterState } from "./ReportsFilterHeader";

const fmt = (n?: number) => `${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`;
const pct = (n?: number) => `${(n || 0).toFixed(1)}%`;

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
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

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
      const res = await reportsApi.getRevenueReport({
        ...filters,
        staffId: selectedStaffId || undefined,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to load revenue breakdown report:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedStaffId]);

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
    colors: ["#6366f1", "#10b981", "#f59e0b"],
    labels: (data?.paymentMethodDistribution || []).map((p: any) => p.label),
    legend: { position: "bottom", labels: { colors: isDark ? "#cbd5e1" : "#334155" } },
    dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(1)}%` },
  };

  const paymentMethodDonutSeries = (data?.paymentMethodDistribution || []).map((p: any) => p.value || 0);

  const summary = data?.summary || {};
  const staffCollections: any[] = data?.staffCashCollections || [];
  const staffTransactions: any[] = data?.staffCashTransactions || [];

  // Filter staff transactions if selected staff
  const activeStaff = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffCollections.find((s) => s.staffId === selectedStaffId) || null;
  }, [selectedStaffId, staffCollections]);

  return (
    <>
      <PageMeta
        title="Revenue & Cash Settlement Report | San Siro"
        description="Multi-dimensional revenue analytics, payment breakdowns, discounts, refunds, and staff cash collection audits."
      />

      <div className="space-y-6">
        {/* Reports Header with Pitch & Date Range Filters */}
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* ─── 1. EXECUTIVE REVENUE WATERFALL KPI CARDS ─── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
            <span>📈</span> Earned Revenue & Inflow Overview ({filters.venueId ? "Single Pitch" : "All Pitches"})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              icon="💰"
              label="Gross Pitch Revenue"
              value={fmt(summary.grossRevenue)}
              sub={`Total Bookings: ${summary.totalBookings || 0}`}
              color="emerald"
            />
            <KpiCard
              icon="🏷️"
              label="Discounts (Coupons)"
              value={`-${fmt(summary.discountSavings)}`}
              sub="Direct coupon savings granted"
              color="rose"
            />
            <KpiCard
              icon="💵"
              label="Net Realized Revenue"
              value={fmt(summary.netRevenue)}
              sub={`After discounts & ${fmt(summary.totalRefunds)} refunds`}
              color="blue"
            />
            <KpiCard
              icon="📥"
              label="Physical Cash Inflow"
              value={fmt(summary.physicalCashInflow)}
              sub="Total new cash + card received"
              color="indigo"
            />
          </div>
        </div>

        {/* ─── 2. PAYMENT INFLOW & REFUND BREAKDOWN CARDS ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card (Paymob) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Paymob Card (Online)
              </span>
              <span className="text-base p-1.5 rounded-xl border bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                💳
              </span>
            </div>
            <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
              {fmt(summary.cardRevenue)}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
              <span>Share: {pct(summary.cardPct)}</span>
              {summary.cardRefunds > 0 && (
                <span className="text-red-500">Refunds: {fmt(summary.cardRefunds)}</span>
              )}
            </div>
          </div>

          {/* Collected Cash */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Paid via Cash (Reception)
              </span>
              <span className="text-base p-1.5 rounded-xl border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                💵
              </span>
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {fmt(summary.cashRevenue)}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Share: {pct(summary.cashPct)} • Collected by staff
            </div>
          </div>

          {/* Wallet Redemptions */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Paid via Digital Wallet
              </span>
              <span className="text-base p-1.5 rounded-xl border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                👛
              </span>
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {fmt(summary.walletRevenue)}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              Redeemed store credits • {pct(summary.walletPct)} volume
            </div>
          </div>

          {/* Refunds Breakdown */}
          <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Refunds & Payouts
              </span>
              <span className="text-base p-1.5 rounded-xl border bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">
                🔄
              </span>
            </div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              {fmt(summary.totalRefunds)}
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex flex-col gap-0.5">
              <span>Wallet Credit: {fmt(summary.refundsWallet)}</span>
              <span>Cash Payouts: {fmt(summary.refundsCashPayout)}</span>
            </div>
          </div>
        </div>

        {/* ─── 3. CHARTS ROW: REVENUE TIMELINE & PAYMENT METHOD SPLIT ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Trajectory Area Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Revenue Trajectory Over Time
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Gross bookings value vs Collected paid amount vs Coupon discounts
            </p>
            {data?.series && <Chart options={revenueTimelineOpts} series={data.series} type="area" height={300} />}
          </div>

          {/* Payment Method Distribution */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                Payment Method Split
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Card (Paymob) vs Reception Cash vs Wallet Credits
              </p>
            </div>
            <div className="py-2">
              <Chart options={paymentMethodDonutOpts} series={paymentMethodDonutSeries} type="donut" height={240} />
            </div>
            <div className="space-y-1.5 pt-3 border-t border-gray-100 dark:border-gray-700/80 text-xs">
              {(data?.paymentMethodDistribution || []).map((pm: any) => (
                <div key={pm.label} className="flex justify-between items-center text-gray-600 dark:text-gray-300">
                  <span>{pm.label}</span>
                  <span className="font-bold text-gray-900 dark:text-white font-mono">
                    {fmt(pm.value)} ({pct(pm.percentage)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── 4. STAFF CASH COLLECTION & SETTLEMENT AUDIT ─── */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🧑‍💼</span>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Staff Cash Collection & Settlement Audit
                </h2>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Shows physical cash collected by each employee so admin can balance out and collect the physical cash from them.
              </p>
            </div>

            {/* Staff Filter Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Filter Staff:</span>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 cursor-pointer"
              >
                <option value="">All Staff Members</option>
                {staffCollections.map((s) => (
                  <option key={s.staffId || "unassigned"} value={s.staffId || ""}>
                    {s.staffName} ({fmt(s.totalCashCollected)})
                  </option>
                ))}
              </select>
              {selectedStaffId && (
                <button
                  onClick={() => setSelectedStaffId("")}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-red-500 transition cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Staff Summary Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 uppercase font-bold">
                <tr>
                  <th className="py-3 px-4 rounded-l-xl">Staff Member / Collector</th>
                  <th className="py-3 px-4">Email / ID</th>
                  <th className="py-3 px-4">Cash Transactions</th>
                  <th className="py-3 px-4">Total Cash Collected</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {staffCollections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      No cash collections recorded for this period.
                    </td>
                  </tr>
                ) : (
                  staffCollections.map((s) => {
                    const isSelected = selectedStaffId === (s.staffId || "");
                    return (
                      <tr
                        key={s.staffId || "unassigned"}
                        className={`transition ${
                          isSelected
                            ? "bg-indigo-50/60 dark:bg-indigo-950/40 font-semibold"
                            : "hover:bg-gray-50/60 dark:hover:bg-gray-700/30"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {s.staffName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                          {s.staffEmail || "—"}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-gray-700 dark:text-gray-300">
                          {s.transactionCount} bookings
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {fmt(s.totalCashCollected)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedStaffId(isSelected ? "" : s.staffId || "")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                            }`}
                          >
                            {isSelected ? "Auditing ✓" : "Audit Items"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Filtered Staff Detailed Cash Transactions */}
          {selectedStaffId && activeStaff && (
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <span>📋</span> Detailed Cash Ledger for {activeStaff.staffName} ({fmt(activeStaff.totalCashCollected)})
                </h3>
                <span className="text-[11px] text-gray-400">Showing up to 50 recent cash settlements</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800 font-bold uppercase text-gray-500 text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Txn ID</th>
                      <th className="py-2.5 px-3">Booking Code</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Settlement Date</th>
                      <th className="py-2.5 px-3 text-right">Cash Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {staffTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-gray-400">
                          No transactions found for this staff member.
                        </td>
                      </tr>
                    ) : (
                      staffTransactions.map((tx: any) => (
                        <tr key={tx._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                            {tx.transactionId}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-brand-600">
                            {tx.bookingCode}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {tx.customerName}
                            </span>{" "}
                            <span className="text-gray-400 text-[10px]">({tx.customerPhone})</span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-500 text-[11px]">
                            {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400">
                            {fmt(tx.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ─── 5. PENDING / UNCOLLECTED DEPOSITS TABLE ─── */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Pending / Uncollected Deposit Bookings
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Bookings with remaining balance due at venue reception upon check-in
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 text-xs font-bold font-mono">
              Total Due: {fmt(summary.outstandingDepositBalance)}
            </span>
          </div>

          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/30 text-gray-500 uppercase font-bold">
                <tr>
                  <th className="py-2.5 px-3">Code</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Pitch</th>
                  <th className="py-2.5 px-3">Paid Deposit</th>
                  <th className="py-2.5 px-3 text-right text-amber-600">Balance Due at Venue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.pendingDepositsTable?.docs || []).slice(0, 10).map((b: any) => (
                  <tr key={b._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 px-3 font-bold text-brand-600 font-mono">{b.bookingCode}</td>
                    <td className="py-2.5 px-3">
                      {b.customerName || "Customer"}{" "}
                      <span className="text-gray-400 text-[10px]">({b.customerPhone})</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold">{b.venueName || "Pitch"}</td>
                    <td className="py-2.5 px-3 text-emerald-600 font-mono font-semibold">
                      {fmt(b.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono text-amber-600 dark:text-amber-400">
                      {fmt(b.remainingAmount)}
                    </td>
                  </tr>
                ))}
                {(!data?.pendingDepositsTable?.docs || data.pendingDepositsTable.docs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      No pending uncollected deposit balances found for this period.
                    </td>
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

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base p-1.5 rounded-xl border ${colorMap[color] || ""}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight font-mono">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

export default RevenueReportsPage;
