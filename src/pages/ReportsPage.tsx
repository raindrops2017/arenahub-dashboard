import { useState, useEffect, useCallback, useMemo } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import PageMeta from "../components/common/PageMeta";
import { venueApi } from "../services/api/venueApi";
import { bookingApi } from "../services/api/bookingApi";
import { ReportsSummaryData, Venue, Booking } from "../types";

const fmt = (n: number) => `${n.toLocaleString()} EGP`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

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

export function computeReportsSummary(venues: Venue[], bookings: Booking[]): ReportsSummaryData {
  let gross = 0;
  let refunds = 0;
  let cancelled = 0;

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
    const p = Number(b.price ?? b.totalPrice ?? 0);
    const dateStr = b.date ? String(b.date).split("T")[0] : new Date().toISOString().split("T")[0];
    const isCancelled = b.status === "cancelled" || b.status === "Cancelled";

    if (!dateMap[dateStr]) {
      dateMap[dateStr] = { gross: 0, refunds: 0 };
    }

    if (isCancelled) {
      cancelled++;
      const ref = Number(b.refundAmount ?? p);
      refunds += ref;
      dateMap[dateStr].refunds += ref;
    } else {
      gross += p;
      dateMap[dateStr].gross += p;
    }

    const bVenueId = typeof b.venueId === "object" && b.venueId ? (b.venueId._id || b.venueId.id) : b.venueId;
    if (bVenueId && venueMap[bVenueId]) {
      if (!isCancelled) {
        venueMap[bVenueId].revenue += p;
      }
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

  if (dailyRevenue.length === 0) {
    const today = new Date().toISOString().split("T")[0];
    dailyRevenue.push({ date: today, gross: 0, net: 0, refunds: 0 });
  }

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
    cancellationRate,
    dailyRevenue,
    venuePerformance,
    peakHours,
  };
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsSummaryData | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venueFilter, setVenueFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const isDark = useDarkMode();

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedVenues = await venueApi.getAllVenues();
      setVenues(fetchedVenues);

      const activeVList = fetchedVenues.filter((v) => v.isActive !== false);
      const bookingPromises = activeVList.map((v) =>
        bookingApi.getVenueBookings(v._id || v.id || "")
      );
      const bookingResults = await Promise.all(bookingPromises);
      const allBookings: Booking[] = bookingResults.flat();
      setBookings(allBookings);

      const summary = computeReportsSummary(fetchedVenues, allBookings);
      setData(summary);
    } catch (err) {
      console.error("Error generating live reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(() => {
    if (!data) return data;
    if (venueFilter === "all") return data;
    const vBookings = bookings.filter((b) => {
      const bVenueId = typeof b.venueId === "object" && b.venueId ? (b.venueId._id || b.venueId.id) : b.venueId;
      return bVenueId === venueFilter;
    });
    let gross = 0, refunds = 0, cancelled = 0;
    vBookings.forEach((b) => {
      const p = b.price || b.totalPrice || 0;
      if (b.status === "cancelled" || b.status === "Cancelled") {
        gross += p;
        cancelled++;
        refunds += (b.refundAmount || 0);
      } else {
        gross += p;
      }
    });
    const net = gross - refunds;
    return {
      ...data,
      grossRevenue: gross,
      netRevenue: net,
      totalRefunds: refunds,
      cancelledBookings: cancelled,
      totalBookings: vBookings.length,
      cancellationRate: vBookings.length > 0 ? cancelled / vBookings.length : 0,
      venuePerformance: data.venuePerformance.filter((v) => v.venueId === venueFilter),
    } as ReportsSummaryData;
  }, [data, venueFilter, bookings]);

  if (loading && !data) {
    return <div className="flex items-center justify-center h-64 text-slate-400">Loading Live Report Analytics...</div>;
  }

  if (!filtered) return null;

  // Base ApexCharts Styling
  const baseChartOpts: ApexOptions = {
    chart: { background: "transparent", toolbar: { show: false }, fontFamily: "Inter, system-ui, sans-serif" },
    theme: { mode: isDark ? "dark" : "light" },
    grid: { borderColor: isDark ? "#1e293b" : "#e2e8f0", strokeDashArray: 4 },
    xaxis: { labels: { style: { colors: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", fontWeight: "600" } } },
    yaxis: { labels: { style: { colors: isDark ? "#94a3b8" : "#64748b", fontSize: "11px", fontWeight: "600" } } },
    tooltip: { theme: isDark ? "dark" : "light", style: { fontSize: "12px" } },
    legend: { labels: { colors: isDark ? "#cbd5e1" : "#334155" }, fontSize: "12px", fontWeight: 600 },
  };

  // Revenue Breakdown Chart (Gross vs Net vs Refunds)
  const revenueOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "area", height: 320 },
    stroke: { curve: "smooth", width: 2.5 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05 } },
    colors: ["#10b981", "#3b82f6", "#f43f5e"],
    xaxis: { ...baseChartOpts.xaxis, categories: filtered.dailyRevenue.map((d) => d.date) },
    yaxis: {
      ...baseChartOpts.yaxis,
      labels: {
        formatter: (v: number) => `${(v / 1000).toFixed(1)}k`,
      },
    },
  };
  const revenueSeries = [
    { name: "Gross Revenue", data: filtered.dailyRevenue.map((d) => d.gross) },
    { name: "Net Revenue", data: filtered.dailyRevenue.map((d) => d.net) },
    { name: "Wallet Refunds", data: filtered.dailyRevenue.map((d) => d.refunds) },
  ];

  // Venue Comparison Chart
  const venuePerfOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 280 },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: "55%" } },
    colors: ["#6366f1", "#06b6d4"],
    xaxis: { ...baseChartOpts.xaxis, categories: filtered.venuePerformance.map((v) => v.venueName) },
  };
  const venuePerfSeries = [
    { name: "Revenue (EGP)", data: filtered.venuePerformance.map((v) => v.totalRevenue) },
    { name: "Bookings", data: filtered.venuePerformance.map((v) => v.bookingsCount * 100) },
  ];

  // Peak Hours Chart
  const peakOpts: ApexOptions = {
    ...baseChartOpts,
    chart: { ...baseChartOpts.chart, type: "bar", height: 280 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "50%" } },
    colors: ["#f59e0b"],
    xaxis: { ...baseChartOpts.xaxis, categories: filtered.peakHours.map((p) => p.hour) },
  };
  const peakSeries = [{ name: "Bookings Count", data: filtered.peakHours.map((p) => p.bookingCount) }];

  // Cancellation Donut Chart
  const cancelOpts: ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    theme: { mode: isDark ? "dark" : "light" },
    colors: ["#10b981", "#f43f5e"],
    labels: ["Completed/Confirmed", "Cancelled & Refunded"],
    legend: { position: "bottom", labels: { colors: isDark ? "#cbd5e1" : "#334155" } },
    dataLabels: { enabled: false },
  };
  const cancelSeries = [
    Math.max(filtered.totalBookings - filtered.cancelledBookings, 0),
    filtered.cancelledBookings,
  ];

  return (
    <>
      <PageMeta title="Live Reports & Financial Analytics | VenueOps" description="Live financial reports, occupancy analysis, and peak hour demand curves" />

      <div className="space-y-6">
        {/* Top Header & Filter Bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Revenue & Financial Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Live backend calculations: slot reservations, customer wallet refunds, and capacity utilization.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={venueFilter}
              onChange={(e) => setVenueFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              <option value="all">All Sports Venues</option>
              {venues.map((v) => (
                <option key={v._id || v.id} value={v._id || v.id}>
                  {v.venueName || v.name}
                </option>
              ))}
            </select>

            <button
              onClick={reload}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1"
            >
              🔄 Refresh Live Data
            </button>
          </div>
        </div>

        {/* ─── Metric KPI Cards ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="💰" label="Gross Revenue" value={fmt(filtered.grossRevenue)} sub="All booked slots" color="emerald" />
          <KpiCard icon="💳" label="Net Revenue" value={fmt(filtered.netRevenue)} sub="After wallet refunds" color="blue" />
          <KpiCard icon="💸" label="Wallet Refunds" value={fmt(filtered.totalRefunds)} sub={`${filtered.cancelledBookings} cancelled`} color="rose" />
          <KpiCard icon="📊" label="Slot Occupancy Rate" value={pct(filtered.occupancyRate)} sub={`${filtered.totalBookings} total matches`} color="amber" />
        </div>

        {/* ─── Revenue Area Chart ─── */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Revenue Trajectory (Gross vs Net vs Refunds)
              </h2>
              <p className="text-xs text-slate-400">Daily financial breakdown in EGP</p>
            </div>
          </div>
          <Chart options={revenueOpts} series={revenueSeries} type="area" height={300} />
        </div>

        {/* ─── Grid 2 Columns: Venue Performance & Peak Demand ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Venue Performance Bar */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Venue Performance Ranking
            </h2>
            <p className="text-xs text-slate-400 mb-4">Revenue and booking volume per court</p>
            <Chart options={venuePerfOpts} series={venuePerfSeries} type="bar" height={260} />
          </div>

          {/* Peak Hourly Demand */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Peak Slot Demand Distribution
            </h2>
            <p className="text-xs text-slate-400 mb-4">Booking frequency across operating hours</p>
            <Chart options={peakOpts} series={peakSeries} type="bar" height={260} />
          </div>
        </div>

        {/* ─── Grid 2 Columns: Cancellation Breakdown & Summary Table ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cancellation Donut */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
                Cancellation & Refund Ratio
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Rate: <strong className="text-rose-500">{pct(filtered.cancellationRate)}</strong>
              </p>
            </div>
            <div className="py-4">
              <Chart options={cancelOpts} series={cancelSeries} type="donut" height={220} />
            </div>
            <div className="text-xs text-slate-400 text-center pt-3 border-t border-slate-100 dark:border-slate-800">
              {filtered.cancelledBookings} of {filtered.totalBookings} match reservations refunded
            </div>
          </div>

          {/* Detailed Venue Summary Table */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">
              Court Financial Ledger Breakdown
            </h2>
            <p className="text-xs text-slate-400 mb-4">Granular performance metrics by pitch</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase">
                    <th className="pb-3">Venue Name</th>
                    <th className="pb-3">Bookings</th>
                    <th className="pb-3">Total Revenue</th>
                    <th className="pb-3 text-right">Occupancy Est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {filtered.venuePerformance.map((vp) => (
                    <tr key={vp.venueId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">{vp.venueName}</td>
                      <td className="py-3">{vp.bookingsCount} slots</td>
                      <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">{fmt(vp.totalRevenue)}</td>
                      <td className="py-3 text-right text-indigo-600 dark:text-indigo-400 font-bold">{pct(vp.occupancyRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base p-1.5 rounded-xl border ${colorMap[color] || ""}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-[11px] text-slate-400 mt-1">{sub}</div>
    </div>
  );
}
