import React, { useState, useEffect, useCallback } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../../components/common/PageMeta";
import { reportsApi } from "../../services/api/reportsApi";
import ReportsFilterHeader, { FilterState } from "./ReportsFilterHeader";

const fmt = (n: number) => `${(n || 0).toLocaleString()} EGP`;

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

export const CouponsReportsPage: React.FC = () => {
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
      const res = await reportsApi.getCouponsReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load coupons report:", err);
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

  const couponBarOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 280 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    colors: ["#10b981", "#f43f5e"],
  };

  const summary = data?.summary || {};

  const customerSplitDonutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#3b82f6", "#8b5cf6"],
    labels: ["New Customers", "Returning Customers"],
    legend: { position: "bottom", labels: { colors: isDark ? "#cbd5e1" : "#334155" } },
  };
  const customerSplitSeries = [summary.newCustomerCouponUses || 0, summary.returningCustomerCouponUses || 0];

  return (
    <>
      <PageMeta title="Coupons & Promos Report | ArenaHub" description="Campaign redemption performance, revenue driven, and discount ROI metrics" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="🎟️" label="Bookings Driven" value={`${summary.totalBookingsDriven || 0} Slots`} sub={`Active Campaigns: ${summary.activeCouponsCount || 0}`} color="indigo" />
          <KpiCard icon="💰" label="Revenue Generated" value={fmt(summary.totalRevenueGenerated)} sub="Post-discount booking revenue" color="emerald" />
          <KpiCard icon="🏷️" label="Discounts Granted" value={fmt(summary.totalDiscountsGiven)} sub="Total customer savings" color="rose" />
          <KpiCard icon="🚀" label="Promo ROI Ratio" value={`${summary.roiRatio || 0}x`} sub="EGP revenue per 1 EGP discount" color="blue" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue vs Discount Bar */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Top Coupon Performance (Revenue vs Discount)
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Financial volume driven per promo code</p>
            {data?.series && <Chart options={couponBarOpts} series={data.series} type="bar" height={260} />}
          </div>

          {/* New vs Returning Split Donut */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                Customer Acquisition Split
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">New player signups vs repeat player promo usage</p>
            </div>
            <div className="py-2">
              <Chart options={customerSplitDonutOpts} series={customerSplitSeries} type="donut" height={220} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-3 border-t border-gray-100 dark:border-gray-700/80">
              {summary.newCustomerCouponUses || 0} new vs {summary.returningCustomerCouponUses || 0} returning users
            </div>
          </div>
        </div>

        {/* Coupon Campaigns Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Coupon Campaign Breakdown & ROI
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Detailed metrics on discount volume, redemptions, and unique customer reach</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Code</th>
                  <th className="pb-2.5">Discount</th>
                  <th className="pb-2.5">Bookings Driven</th>
                  <th className="pb-2.5">Unique Players</th>
                  <th className="pb-2.5">Revenue Generated</th>
                  <th className="pb-2.5">Discounts Given</th>
                  <th className="pb-2.5 text-right">Usage / Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.table?.docs || []).map((c: any) => (
                  <tr key={c._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 font-black text-indigo-600 dark:text-indigo-400">{c.couponCode}</td>
                    <td className="py-2.5">
                      {c.discountValue}{c.discountType === "percentage" ? "%" : " EGP"}
                    </td>
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">{c.bookingsDriven} slots</td>
                    <td className="py-2.5">{c.uniqueCustomersCount || 0} players</td>
                    <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-bold">{fmt(c.totalRevenueGenerated)}</td>
                    <td className="py-2.5 text-rose-600 dark:text-rose-400">{fmt(c.totalDiscountsGiven)}</td>
                    <td className="py-2.5 text-right font-bold text-gray-500 dark:text-gray-400">{c.totalUsesCount || 0} / {c.maxUses}</td>
                  </tr>
                ))}
                {(!data?.table?.docs || data.table.docs.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">No coupon usage recorded in this time period.</td>
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
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
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

export default CouponsReportsPage;
