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

export const VenueUtilizationReportsPage: React.FC = () => {
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
      const res = await reportsApi.getVenueUtilizationReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load venue utilization report:", err);
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

  const hourlyBarOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 280 },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "55%" } },
    colors: ["#f59e0b", "#10b981"],
  };

  const summary = data?.summary || {};

  return (
    <>
      <PageMeta title="Venue & Pitch Utilization Report | ArenaHub" description="Court occupancy rates, 24-hour demand curves, and capacity efficiency metrics" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="🏟️" label="Overall Occupancy Rate" value={pct(summary.overallOccupancyRatePct)} sub="Booked / Available Capacity" color="emerald" />
          <KpiCard icon="⏱️" label="Total Booked Hours" value={`${(summary.totalBookedHours || 0).toLocaleString()} hrs`} sub={`Capacity: ${(summary.totalTheoreticalCapacityHours || 0).toLocaleString()} hrs`} color="blue" />
          <KpiCard icon="💰" label="Utilization Revenue" value={fmt(summary.totalRevenue)} sub={`Across ${summary.totalVenues || 0} active sports venues`} color="indigo" />
          <KpiCard icon="📊" label="RevPASH Efficiency" value={`${(summary.totalBookedHours > 0 ? summary.totalRevenue / summary.totalBookedHours : 0).toFixed(0)} EGP/hr`} sub="Revenue per available slot-hour" color="amber" />
        </div>

        {/* 24-Hour Demand Curve */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            24-Hour Time-Slot Demand Distribution (Peak Hours Curve)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Hourly match bookings frequency and revenue generation across the day</p>
          {data?.series && <Chart options={hourlyBarOpts} series={data.series} type="bar" height={280} />}
        </div>

        {/* Venue Utilization Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Venue Capacity & Occupancy Performance
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Detailed utilization, total court hours booked, and revenue yields per pitch</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Venue Name</th>
                  <th className="pb-2.5">Operating Hours</th>
                  <th className="pb-2.5">Booked Slots</th>
                  <th className="pb-2.5">Booked Hours</th>
                  <th className="pb-2.5">Total Revenue</th>
                  <th className="pb-2.5">RevPASH (EGP/hr)</th>
                  <th className="pb-2.5 text-right font-black text-indigo-600">Occupancy Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.venueBreakdownTable || []).map((v: any) => (
                  <tr key={v._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">{v.venueName}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{v.startWorkingHours || 8}:00 - {v.endWorkingHours || 24}:00</td>
                    <td className="py-2.5">{v.bookedSlotsCount} slots</td>
                    <td className="py-2.5 font-semibold text-gray-800 dark:text-gray-200">{v.totalBookedHours} hrs</td>
                    <td className="py-2.5 font-bold text-emerald-600 dark:text-emerald-400">{fmt(v.totalRevenue)}</td>
                    <td className="py-2.5 text-blue-600 dark:text-blue-400 font-semibold">{fmt(v.revenuePerHour)}</td>
                    <td className="py-2.5 text-right font-black text-indigo-600 dark:text-indigo-400">{pct(v.occupancyRate)}</td>
                  </tr>
                ))}
                {(!data?.venueBreakdownTable || data.venueBreakdownTable.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">No venue utilization data found.</td>
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

export default VenueUtilizationReportsPage;
