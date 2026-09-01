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

export const CustomersFunnelReportsPage: React.FC = () => {
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
      const res = await reportsApi.getCustomersAndFunnelReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load customer & funnel report:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};
  const funnel = data?.funnel || [];
  const retention = data?.retentionDistribution || [];

  const funnelBarOpts: ApexOptions = {
    chart: { type: "bar", background: "transparent", toolbar: { show: false } },
    theme: { mode: isDark ? "dark" : "light" },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "50%", distributed: true } },
    colors: ["#3b82f6", "#10b981", "#6366f1"],
    xaxis: { categories: funnel.map((f: any) => f.stage) },
    legend: { show: false },
    dataLabels: {
      enabled: true,
      formatter: (val: number, opts: any) => {
        const item = funnel[opts.dataPointIndex];
        return `${val} (${item?.conversionRate || 0}%)`;
      },
    },
  };

  const funnelSeries = [{ name: "Count", data: funnel.map((f: any) => f.count) }];

  const retentionDonutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#94a3b8", "#3b82f6", "#10b981"],
    labels: retention.map((r: any) => r._id),
    legend: { position: "bottom", labels: { colors: isDark ? "#cbd5e1" : "#334155" } },
  };

  const retentionSeries = retention.map((r: any) => r.customersCount || 0);

  return (
    <>
      <PageMeta title="Customer Retention & Booking Funnel Report | ArenaHub" description="Conversion funnel tracking, player retention cohorts, and top spender leaderboards" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="👥" label="Active Player Base" value={`${(summary.totalCustomersAudited || 0).toLocaleString()} Players`} sub="Customers with match history" color="indigo" />
          <KpiCard icon="🔄" label="Repeat Customer Rate" value={pct(summary.repeatRatePct)} sub={`${summary.repeatCustomersCount + summary.loyalCustomersCount || 0} repeat players`} color="emerald" />
          <KpiCard icon="⭐" label="Loyal Core (5+ Bookings)" value={`${summary.loyalCustomersCount || 0} VIPs`} sub="High lifetime value players" color="amber" />
          <KpiCard icon="🚪" label="Cancelled / Expired Holds" value={`${summary.cancelledOrExpiredHolds || 0} Slots`} sub="Funnel drop-off before match" color="rose" />
        </div>

        {/* Funnel & Retention Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Booking Conversion Funnel */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Booking Funnel Conversion Stages
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Hold created → Payment settled → Match completed & attended</p>
            <Chart options={funnelBarOpts} series={funnelSeries} type="bar" height={260} />
          </div>

          {/* Retention Cohorts Donut */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                Player Retention Distribution
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">One-time vs Repeat (2–4) vs Loyal (5+) booking frequency</p>
            </div>
            <div className="py-2">
              <Chart options={retentionDonutOpts} series={retentionSeries} type="donut" height={220} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-3 border-t border-gray-100 dark:border-gray-700/80">
              {summary.oneTimeCustomersCount || 0} single match vs {summary.repeatCustomersCount + summary.loyalCustomersCount || 0} multi-match players
            </div>
          </div>
        </div>

        {/* Top Customers Leaderboard */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Top Players & Spender Leaderboard
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Highest revenue-generating and most active arena players</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Player Name</th>
                  <th className="pb-2.5">Phone</th>
                  <th className="pb-2.5">Email</th>
                  <th className="pb-2.5">Matches Booked</th>
                  <th className="pb-2.5">Last Match</th>
                  <th className="pb-2.5 text-right font-black text-emerald-600">Total Lifetime Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.topCustomersTable?.docs || []).map((c: any) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">{c.userName || "Player"}</td>
                    <td className="py-2.5">{c.phone || "N/A"}</td>
                    <td className="py-2.5 text-gray-400">{c.email || "N/A"}</td>
                    <td className="py-2.5 font-semibold text-gray-800 dark:text-gray-200">{c.bookingsCount} slots</td>
                    <td className="py-2.5 text-gray-400">{c.lastBookingDate ? new Date(c.lastBookingDate).toLocaleDateString() : "N/A"}</td>
                    <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{fmt(c.totalSpent)}</td>
                  </tr>
                ))}
                {(!data?.topCustomersTable?.docs || data.topCustomersTable.docs.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">No customer booking records found.</td>
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
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
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

export default CustomersFunnelReportsPage;
