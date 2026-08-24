import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { Venue, CustomerUser, Booking, ReportsSummaryData } from "../../types";
import { venueApi } from "../../services/api/venueApi";
import { customerApi } from "../../services/api/customerApi";
import { bookingApi } from "../../services/api/bookingApi";
import { socketService } from "../../services/api/socketService";
import { computeReportsSummary } from "../ReportsPage";

const fmt = (n: number) => `${n.toLocaleString()} EGP`;

const statusBadge: Record<string, string> = {
  confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  Confirmed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  Completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  Cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
};

export default function Home() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reports, setReports] = useState<ReportsSummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedVenues, fetchedCustomers] = await Promise.all([
        venueApi.getAllVenues(),
        customerApi.getAllCustomers(),
      ]);
      setVenues(fetchedVenues);
      setCustomers(fetchedCustomers);

      const activeVList = fetchedVenues.filter((v) => v.isActive !== false);
      const bookingPromises = activeVList.map((v) =>
        bookingApi.getVenueBookings(v._id || v.id || "")
      );
      const bookingResults = await Promise.all(bookingPromises);
      const allBookings = bookingResults.flat();
      setBookings(allBookings);

      const summary = computeReportsSummary(fetchedVenues, allBookings);
      setReports(summary);
    } catch (err) {
      console.error("Error loading home dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Real-time WebSocket Sync: Auto-update overview metrics when payments/bookings occur
  useEffect(() => {
    const activeVList = venues.filter((v) => v.isActive !== false);
    activeVList.forEach((v) => {
      socketService.joinVenue(v._id || v.id || "");
    });

    const unsubConfirmed = socketService.onBookingConfirmed((data) => {
      console.log("[Dashboard Home] Live Booking Confirmed:", data);
      reload();
    });

    const unsubLocked = socketService.onSlotLocked(() => {
      reload();
    });

    const unsubReleased = socketService.onSlotReleased(() => {
      reload();
    });

    return () => {
      unsubConfirmed();
      unsubLocked();
      unsubReleased();
      activeVList.forEach((v) => {
        socketService.leaveVenue(v._id || v.id || "");
      });
    };
  }, [venues, reload]);

  const today = new Date().toISOString().split("T")[0];
  const bookingsToday = bookings.filter((b) => b.date === today);
  const activeVenues = venues.filter((v) => v.isActive !== false);
  const recentBookings = bookings.slice(0, 5);

  const venueBookingCount = (venueId: string) =>
    bookings.filter((b) => {
      const bVenueId = typeof b.venueId === "object" && b.venueId ? (b.venueId._id || b.venueId.id) : b.venueId;
      return bVenueId === venueId && b.status !== "cancelled" && b.status !== "Cancelled";
    }).length;

  return (
    <>
      <PageMeta title="VenueOps Live Dashboard | Pitch Booking Manager" description="Live admin overview for venue booking management" />

      {/* ─── Hero Welcome Banner ─── */}
      <div className="relative overflow-hidden mb-6 p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 opacity-15 pointer-events-none flex items-center">
          <svg className="w-96 h-96 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" /></svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">
            <span>⚽</span> Live NestJS Connected
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Welcome to VenueOps Dashboard
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Monitor real-time pitch bookings, venue occupancy rates, customer wallets, and revenue analytics connected to the live backend.
          </p>

          <div className="flex items-center gap-3 mt-5 flex-wrap">
            <Link
              to="/bookings/fullscreen"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-500/25 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <span>📋</span> Launch Slot Booking Grid
            </Link>

            <Link
              to="/reports"
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition"
            >
              View Analytics →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* ─── Metric Cards Row ─── */}
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon="💰" label="Gross Revenue" value={reports ? fmt(reports.grossRevenue) : "—"} color="emerald" sub="All bookings" />
          <StatCard icon="🏟️" label="Active Pitches" value={String(activeVenues.length)} color="blue" sub="Ready for matches" />
          <StatCard icon="👥" label="Total Customers" value={String(customers.length)} color="purple" sub="Registered players" />
          <StatCard icon="📅" label="Matches Today" value={String(bookingsToday.length)} color="amber" sub="Scheduled slots" />
          <StatCard icon="📊" label="Slot Occupancy" value={reports ? `${(reports.occupancyRate * 100).toFixed(0)}%` : "—"} color="indigo" sub="Average demand" />
        </div>

        {/* ─── Quick Shortcuts Row ─── */}
        <div className="col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard to="/bookings/fullscreen" icon="⚡" title="Booking Manager" desc="Open standalone slot grid manager" primary />
          <ActionCard to="/reports" icon="📈" title="Reports & Analytics" desc="Revenue & slot occupancy insights" />
          <ActionCard to="/venues" icon="🏟️" title="Venue Management" desc="Manage pitches, amenities & pricing" />
          <ActionCard to="/customers" icon="💳" title="Customer & Wallets" desc="Customer status & wallet payouts" />
        </div>

        {/* ─── Recent Bookings Table ─── */}
        <div className="col-span-12 lg:col-span-7 bg-white dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 overflow-hidden">
          <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Recent Match Bookings</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Live booking activity log</p>
            </div>
            <Link to="/bookings/fullscreen" className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 transition">
              Open Grid View →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-750 text-xs font-bold uppercase tracking-wider text-gray-400">
                  {["Code", "Customer", "Venue", "Date", "Status", "Price"].map((h) => (
                    <th key={h} className="px-4 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs">
                {recentBookings.map((b) => (
                  <tr key={b._id || b.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-750/50 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-600 dark:text-blue-400">{b.bookingCode || (b._id || b.id).slice(0, 8)}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-gray-900 dark:text-slate-100">{b.customerName}</div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 font-medium">{b.venueName}</td>
                    <td className="px-4 py-3.5 text-gray-500">{b.date}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge[b.status] || ""}`}>{b.status}</span>
                    </td>
                    <td className="px-4 py-3.5 font-black text-gray-900 dark:text-white">{fmt(b.price || b.totalPrice || 0)}</td>
                  </tr>
                ))}
                {recentBookings.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">{loading ? "Loading live bookings..." : "No bookings yet"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Active Pitches Utilization ─── */}
        <div className="col-span-12 lg:col-span-5 bg-white dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Active Pitches</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total match bookings per venue</p>
              </div>
              <Link to="/venues" className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 transition">
                Manage →
              </Link>
            </div>
            <div className="space-y-3">
              {venues.slice(0, 4).map((v) => {
                const count = venueBookingCount(v._id || v.id || "");
                const pctVal = Math.min((count / 15) * 100, 100).toFixed(0);
                return (
                  <div key={v._id || v.id} className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1">{v.venueName || v.name}</span>
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{count} bookings</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pctVal}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>{v.defaultHourPrice} EGP/hr</span>
                      <span>{pctVal}% demand</span>
                    </div>
                  </div>
                );
              })}
              {venues.length === 0 && (
                <div className="text-center py-8 text-gray-400">{loading ? "Loading venues..." : "No venues configured"}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
    indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
  };

  return (
    <div className="p-4 rounded-3xl bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base p-1.5 rounded-xl border ${colorMap[color] || ""}`}>{icon}</span>
      </div>
      <div className="text-xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ActionCard({ to, icon, title, desc, primary }: { to: string; icon: string; title: string; desc: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={`p-4 rounded-3xl border transition-all duration-200 group flex flex-col justify-between ${
        primary
          ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-transparent shadow-lg shadow-blue-500/20 hover:scale-[1.02]"
          : "bg-white dark:bg-gray-800/90 text-gray-900 dark:text-white border-gray-200/80 dark:border-gray-700/80 hover:border-blue-500/40 hover:shadow-md"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className={`text-xs font-bold transition-transform group-hover:translate-x-1 ${primary ? "text-blue-200" : "text-gray-400"}`}>
          →
        </span>
      </div>
      <div>
        <h4 className="font-bold text-sm leading-tight">{title}</h4>
        <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-1 ${primary ? "text-blue-100" : "text-gray-400"}`}>
          {desc}
        </p>
      </div>
    </Link>
  );
}
