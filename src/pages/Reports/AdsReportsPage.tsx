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

export const AdsReportsPage: React.FC = () => {
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
      const res = await reportsApi.getAdsReport(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load ads report:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};

  const positionBarOpts: ApexOptions = {
    chart: { type: "bar", background: "transparent", toolbar: { show: false } },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#3b82f6", "#10b981"],
    xaxis: { categories: (data?.positionUtilization || []).map((p: any) => p._id || "Position") },
  };

  const positionBarSeries = [
    { name: "Total Ads", data: (data?.positionUtilization || []).map((p: any) => p.totalAds || 0) },
    { name: "Active Ads", data: (data?.positionUtilization || []).map((p: any) => p.activeAds || 0) },
  ];

  return (
    <>
      <PageMeta title="Ad System & Advertiser Report | ArenaHub" description="Ad revenue, banner impression reach, click-through rates, and advertiser performance" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="📢" label="Total Ad Revenue" value={fmt(summary.totalAdRevenue)} sub={`Active Banners: ${summary.activeAds || 0}`} color="emerald" />
          <KpiCard icon="👁️" label="Total Impressions" value={(summary.totalImpressions || 0).toLocaleString()} sub="Banner views across app" color="indigo" />
          <KpiCard icon="🖱️" label="Total Clicks" value={(summary.totalClicks || 0).toLocaleString()} sub="Direct player interactions" color="blue" />
          <KpiCard icon="🎯" label="Average CTR (%)" value={pct(summary.averageCtr)} sub="Click-through rate efficiency" color="amber" />
        </div>

        {/* Inventory & Advertiser Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position Slot Inventory */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Banner Slot Utilization by Position
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Total vs Active inventory on Top, Middle, and Sidebar placements</p>
            <Chart options={positionBarOpts} series={positionBarSeries} type="bar" height={240} />
          </div>

          {/* Advertiser Breakdown Table */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
              Top Advertisers Ranking
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Revenue spend, reach, and CTR per sponsor/advertiser</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                    <th className="pb-2">Advertiser</th>
                    <th className="pb-2">Ads</th>
                    <th className="pb-2">Impressions</th>
                    <th className="pb-2">CTR</th>
                    <th className="pb-2 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {(data?.advertiserPerformance || []).map((a: any) => (
                    <tr key={a._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 font-bold text-gray-900 dark:text-white">{a.advertiserName}</td>
                      <td className="py-2.5">{a.campaignsCount}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">{a.totalImpressions?.toLocaleString()}</td>
                      <td className="py-2.5 text-blue-600 dark:text-blue-400 font-bold">{pct(a.ctr)}</td>
                      <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{fmt(a.totalCost)}</td>
                    </tr>
                  ))}
                  {(!data?.advertiserPerformance || data.advertiserPerformance.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">No advertiser records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* All Ads Inventory Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Active & Historical Banner Inventory
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Ad status, impressions, clicks, CTR, and revenue fee</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Banner Title</th>
                  <th className="pb-2.5">Position</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Impressions</th>
                  <th className="pb-2.5">Clicks</th>
                  <th className="pb-2.5">CTR</th>
                  <th className="pb-2.5 text-right">Fee / Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.table?.docs || []).map((ad: any) => {
                  const ctr = (ad.impressions || 0) > 0 ? ((ad.clicks || 0) / ad.impressions) * 100 : 0;
                  return (
                    <tr key={ad._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="py-2.5 font-bold text-gray-900 dark:text-white">{ad.title}</td>
                      <td className="py-2.5 text-gray-500 dark:text-gray-400">{ad.position}</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          ad.status === "active" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                          ad.status === "scheduled" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                          "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}>
                          {ad.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-300">{ad.impressions?.toLocaleString() || 0}</td>
                      <td className="py-2.5 text-gray-600 dark:text-gray-300">{ad.clicks?.toLocaleString() || 0}</td>
                      <td className="py-2.5 font-bold text-indigo-600 dark:text-indigo-400">{pct(ctr)}</td>
                      <td className="py-2.5 text-right font-black text-emerald-600 dark:text-emerald-400">{fmt(ad.cost || 0)}</td>
                    </tr>
                  );
                })}
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
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
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

export default AdsReportsPage;
