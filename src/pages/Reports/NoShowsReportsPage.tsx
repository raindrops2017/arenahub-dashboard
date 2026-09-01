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

export const NoShowsReportsPage: React.FC = () => {
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
      const res = await reportsApi.getNoShowsReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load no-shows report:", err);
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

  const venueNoShowBarOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 280 },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "50%" } },
    colors: ["#ef4444"],
    xaxis: { ...baseChartOpts.xaxis, categories: (data?.venueBreakdown || []).map((v: any) => v.venueName || "Venue") },
  };

  const venueNoShowBarSeries = [
    { name: "No-Show Matches", data: (data?.venueBreakdown || []).map((v: any) => v.noShowCount || 0) },
  ];

  const summary = data?.summary || {};

  return (
    <>
      <PageMeta title="No-Shows & Lost Revenue Report | ArenaHub" description="Track player attendance defaults, revenue losses, and customer default frequencies" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="⚠️" label="No-Show Matches" value={`${summary.totalNoShows || 0}`} sub={`Out of ${summary.totalBookings || 0} total bookings`} color="rose" />
          <KpiCard icon="📉" label="No-Show Rate (%)" value={pct(summary.noShowRatePct)} sub="Default attendance percentage" color="amber" />
          <KpiCard icon="💸" label="Lost Slot Value" value={fmt(summary.revenueImpactLost)} sub="Financial value of unplayed time slots" color="rose" />
          <KpiCard icon="🛡️" label="Retained Deposits" value={fmt(summary.retainedDepositValue)} sub="Deposit revenue kept on default" color="emerald" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* No-Shows by Venue */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              No-Show Frequency by Venue
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Venues with highest unattended match defaults</p>
            <Chart options={venueNoShowBarOpts} series={venueNoShowBarSeries} type="bar" height={260} />
          </div>

          {/* Timeline of No-Shows */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              No-Shows Over Time
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Volume and financial loss trend over selected date range</p>
            {data?.series && <Chart options={{ ...baseChartOpts, chart: { type: "line" }, colors: ["#ef4444", "#f59e0b"] }} series={data.series} type="line" height={260} />}
          </div>
        </div>

        {/* Top No-Show Customers Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Top Habitual No-Show Customers
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customers flagged for missing reservations without cancelling</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Customer Name</th>
                  <th className="pb-2.5">Phone Number</th>
                  <th className="pb-2.5">Email</th>
                  <th className="pb-2.5">Account Status</th>
                  <th className="pb-2.5 text-right font-black text-rose-600">Total No-Shows</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.topNoShowCustomersTable?.docs || []).map((c: any) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">{c.userName}</td>
                    <td className="py-2.5">{c.phone || "N/A"}</td>
                    <td className="py-2.5 text-gray-400">{c.email || "N/A"}</td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                        c.status === "suspended" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" :
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                      }`}>
                        {c.status || "active"}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-rose-600 dark:text-rose-400">{c.noShowCount} matches</td>
                  </tr>
                ))}
                {(!data?.topNoShowCustomersTable?.docs || data.topNoShowCustomersTable.docs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">No customers with active no-show strikes recorded.</td>
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

export default NoShowsReportsPage;
