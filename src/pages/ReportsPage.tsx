import React, { useState, useEffect, useCallback } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../components/common/PageMeta";
import { reportsApi } from "../services/api/reportsApi";
import ReportsFilterHeader, { FilterState } from "./Reports/ReportsFilterHeader";
import { Link } from "react-router";

const fmt = (n: number) => `${(n || 0).toLocaleString()} EGP`;
import { Venue, Booking, ReportsSummaryData } from "../types";

export function computeReportsSummary(venues: Venue[], bookings: Booking[]): ReportsSummaryData {
  let gross = 0;
  let refunds = 0;
  let cancelled = 0;
  let noShows = 0;
  let cashRevenue = 0;
  let gatewayRevenue = 0;

  const dateMap: Record<string, { gross: number; refunds: number }> = {};
  const hourMap: Record<number, number> = {};
  const venueMap: Record<string, { name: string; revenue: number; count: number }> = {};

  venues.forEach((v) => {
    const vId = v._id || v.id || "";
    venueMap[vId] = {
      name: v.venueName || v.name || "Venue",
      revenue: 0,
      count: 0,
    };
  });

  bookings.forEach((b) => {
    const p = Number(b.finalPrice ?? b.price ?? b.totalPrice ?? 0);
    const paidAmt = Number(b.paidAmount ?? (b.paymentStatus === "paid" ? p : 0));
    const dateStr = b.date ? String(b.date).split("T")[0] : new Date().toISOString().split("T")[0];
    const isCancelled = b.status === "cancelled" || b.status === "Cancelled";
    const isNoShow = b.status === "no_show" || b.status === "No Show";

    if (isNoShow) noShows++;
    if (!dateMap[dateStr]) dateMap[dateStr] = { gross: 0, refunds: 0 };

    if (isCancelled) {
      cancelled++;
      const ref = Number(b.refundAmount ?? p);
      refunds += ref;
      dateMap[dateStr].refunds += ref;
    } else {
      gross += p;
      dateMap[dateStr].gross += p;
      const pMethod = (b.paymentMethod || "").toLowerCase();
      if (pMethod === "cash") cashRevenue += paidAmt || p;
      else gatewayRevenue += paidAmt || p;
    }

    const bVenueId = typeof b.venueId === "object" && b.venueId ? (b.venueId._id || b.venueId.id) : b.venueId;
    if (bVenueId && venueMap[bVenueId]) {
      if (!isCancelled) venueMap[bVenueId].revenue += p;
      venueMap[bVenueId].count += 1;
    }

    let startH = typeof b.startTime === "number" ? b.startTime : 18;
    if (typeof b.startTime === "string") {
      const match = b.startTime.match(/(\d+):00/);
      if (match) startH = parseInt(match[1], 10);
    }
    hourMap[startH] = (hourMap[startH] || 0) + 1;
  });

  const dailyRevenue = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, val]) => ({
      date,
      gross: val.gross,
      net: val.gross - val.refunds,
      refunds: val.refunds,
    }));

  const venuePerformance = Object.entries(venueMap).map(([venueId, val]) => ({
    venueId,
    venueName: val.name,
    totalRevenue: val.revenue,
    bookingsCount: val.count,
    occupancyRate: val.count > 0 ? Math.min(val.count / 15, 1) : 0,
  }));

  const peakHours = Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => {
    const norm = hour % 24;
    const ampm = norm >= 12 ? "PM" : "AM";
    const h = norm % 12 === 0 ? 12 : norm % 12;
    return {
      hour: `${h}:00 ${ampm}`,
      bookingCount: hourMap[hour] || 0,
    };
  });

  const total = bookings.length;
  const net = gross - refunds;
  const cancellationRate = total > 0 ? cancelled / total : 0;
  const occupancyRate = venues.length > 0 ? Math.min(total / (venues.length * 15), 1) : 0;

  return {
    grossRevenue: gross,
    netRevenue: net,
    totalRefunds: refunds,
    occupancyRate,
    totalBookings: total,
    cancelledBookings: cancelled,
    noShowBookings: noShows,
    cashRevenue,
    gatewayRevenue,
    cancellationRate,
    dailyRevenue,
    venuePerformance,
    peakHours,
  };
}

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

export const ReportsPage: React.FC = () => {
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
      const res = await reportsApi.getReportsOverview(filters);
      setData(res);
    } catch (err) {
      console.error("Failed to load reports overview:", err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const kpis = data?.kpis || {};

  const baseChartOpts: ApexOptions = {
    chart: { background: "transparent", toolbar: { show: false }, fontFamily: "Inter, system-ui, sans-serif" },
    theme: { mode: isDark ? "dark" : "light" },
    grid: { borderColor: isDark ? "#1e293b" : "#e2e8f0", strokeDashArray: 4 },
    xaxis: { labels: { style: { colors: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", fontWeight: "600" } } },
    yaxis: { labels: { style: { colors: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", fontWeight: "600" } } },
    tooltip: { theme: isDark ? "dark" : "light", style: { fontSize: "12px" } },
    legend: { labels: { colors: isDark ? "#cbd5e1" : "#334155" }, fontSize: "12px", fontWeight: 600 },
  };

  const revenueOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 300 },
    stroke: { curve: "smooth", width: 2.5 },
    colors: ["#10b981", "#3b82f6", "#f59e0b"],
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
  };

  const peakHoursOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 260 },
    plotOptions: { bar: { borderRadius: 5, columnWidth: "50%" } },
    colors: ["#f59e0b", "#6366f1"],
  };

  const paymentDonutOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#6366f1", "#10b981", "#3b82f6"],
    labels: (data?.paymentMethods || []).map((p: any) => p.label),
    legend: { position: "bottom", labels: { colors: isDark ? "#cbd5e1" : "#334155" } },
  };
  const paymentDonutSeries = (data?.paymentMethods || []).map((p: any) => p.value || 0);

  return (
    <>
      <PageMeta title="Reports & Analytics Overview | ArenaHub" description="Executive summary of financial volume, court occupancy, player retention, and promo ROI" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* Executive KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="💰" label="Gross Revenue" value={fmt(kpis.grossRevenue)} sub={`Total Bookings: ${kpis.totalBookings || 0}`} color="emerald" link="/reports/revenue" />
          <KpiCard icon="💵" label="Net Revenue" value={fmt(kpis.netRevenue)} sub={`Refunds: ${fmt(kpis.totalRefunds)}`} color="blue" link="/reports/revenue" />
          <KpiCard icon="🏟️" label="Overall Occupancy" value={pct(kpis.occupancyRate)} sub="Capacity utilization rate" color="indigo" link="/reports/venue-utilization" />
          <KpiCard icon="🏦" label="Wallet Liability" value={fmt(kpis.walletLiability)} sub="Customer balance reserves" color="amber" link="/reports/refunds-wallet" />
        </div>

        {/* Quick Hub Navigation Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ReportNavCard title="Revenue & Payments" desc="Payment method %, deposits, gateway reconciliation" link="/reports/revenue" icon="💳" />
          <ReportNavCard title="Refunds & Wallet" desc="Refund velocity, reason breakdown & audit log" link="/reports/refunds-wallet" icon="💸" />
          <ReportNavCard title="No-Shows & Losses" desc="Default attendance rate & lost slot revenue" link="/reports/no-shows" icon="⚠️" />
          <ReportNavCard title="Coupons & Promos" desc="Campaign redemption rate & promo ROI" link="/reports/coupons" icon="🎟️" />
          <ReportNavCard title="Ad System Reach" desc="Impressions, clicks, CTR, and advertiser spend" link="/reports/ads" icon="📢" />
          <ReportNavCard title="Venue Utilization" desc="Peak demand curve & court RevPASH yield" link="/reports/venue-utilization" icon="🏟️" />
          <ReportNavCard title="Customers & Funnel" desc="Booking conversion funnel & repeat cohorts" link="/reports/customers-funnel" icon="👥" />
          <ReportNavCard title="Payouts & Disputes" desc="Owner commission settlement & support log" link="/reports/payouts-disputes" icon="🤝" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Area */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Revenue Trajectory
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Daily gross bookings vs paid collections</p>
              </div>
              <Link to="/reports/revenue" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Full Details →
              </Link>
            </div>
            {data?.revenueSeries && <Chart options={revenueOpts} series={data.revenueSeries} type="area" height={280} />}
          </div>

          {/* Payment Methods */}
          <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Payment Split
              </h2>
              <Link to="/reports/revenue" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                View →
              </Link>
            </div>
            <div className="py-2">
              <Chart options={paymentDonutOpts} series={paymentDonutSeries} type="donut" height={220} />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2 border-t border-gray-100 dark:border-gray-700/80">
              Card online vs Cash reception vs Digital Wallet
            </div>
          </div>
        </div>

        {/* Peak Demand Hours Bar */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                24-Hour Peak Demand Curve
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Hourly booking frequency across all operating venues</p>
            </div>
            <Link to="/reports/venue-utilization" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
              Venue Breakdown →
            </Link>
          </div>
          {data?.peakHoursSeries && <Chart options={peakHoursOpts} series={data.peakHoursSeries} type="bar" height={260} />}
        </div>
      </div>
    </>
  );
};

function KpiCard({ icon, label, value, sub, color, link }: { icon: string; label: string; value: string; sub: string; color: string; link?: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  const Content = (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm hover:border-indigo-400 transition cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base p-1.5 rounded-xl border ${colorMap[color] || ""}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>
    </div>
  );

  return link ? <Link to={link}>{Content}</Link> : Content;
}

function ReportNavCard({ title, desc, link, icon }: { title: string; desc: string; link: string; icon: string }) {
  return (
    <Link
      to={link}
      className="p-4 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 hover:border-indigo-500 hover:shadow-md transition flex flex-col justify-between group"
    >
      <div>
        <div className="text-xl mb-2">{icon}</div>
        <h3 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
          {title}
        </h3>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{desc}</p>
      </div>
      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-3 flex items-center gap-1">
        Open Report →
      </div>
    </Link>
  );
}

export default ReportsPage;
