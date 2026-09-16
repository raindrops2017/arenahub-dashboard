import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import {
  DoorOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  RefreshCw,
  Bell,
  ShieldAlert,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  LayoutGrid,
  Phone,
  Settings,
  Copy,
  Check,
} from "lucide-react";
import { Booking, Venue, CustomerUser, CustomerStatus } from "../types";
import { bookingApi } from "../services/api/bookingApi";
import { venueApi } from "../services/api/venueApi";
import { customerApi } from "../services/api/customerApi";
import { socketService } from "../services/api/socketService";
import { activeOnly, getId, toDateStr } from "../utils/booking";
import { ModernDatePicker } from "../components/ui/ModernDatePicker";
import { CustomerStatusModal } from "../components/customers/CustomerStatusModal";
import { CustomerNotificationModal } from "../components/customers/CustomerNotificationModal";
import { GateCheckInModal } from "../components/bookings/modals/GateCheckInModal";
import { ManageBookingModal } from "../components/bookings/modals/ManageBookingModal";
import { CancelBookingModal } from "../components/bookings/modals/CancelBookingModal";

export default function BookedSlotsPage() {
  // ─── Filter & Date State ───
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(new Date()));
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toDateStr(d);
  });
  const [endDate, setEndDate] = useState<string>(toDateStr(new Date()));

  const [selectedVenueId, setSelectedVenueId] = useState<string>("ALL");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");
  const [showStatusFilter, setShowStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ─── Data State ───
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // ─── Action Modals State ───
  const [showGateCheckIn, setShowGateCheckIn] = useState(false);
  const [manageBooking, setManageBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  // Reusable Customer Modals State
  const [selectedCustomerForStatus, setSelectedCustomerForStatus] = useState<CustomerUser | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [selectedCustomerForNotify, setSelectedCustomerForNotify] = useState<CustomerUser | null>(null);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);

  // Quick Action In-Progress indicator
  const [quickActionLoadingId, setQuickActionLoadingId] = useState<string | null>(null);

  // ─── Data Fetching ───
  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [fetchedVenues, fetchedCustomers] = await Promise.all([
        venueApi.getAllVenues(),
        customerApi.getAllCustomers(),
      ]);
      setVenues(fetchedVenues);
      setCustomers(fetchedCustomers);

      const active = activeOnly(fetchedVenues);
      const targetVenues =
        selectedVenueId !== "ALL"
          ? active.filter((v) => getId(v) === selectedVenueId)
          : active;

      if (dateMode === "single") {
        const bookingsPerVenue = await Promise.all(
          targetVenues.map((v) =>
            bookingApi.getVenueBookings(getId(v), { date: selectedDate })
          )
        );
        setBookings(bookingsPerVenue.flat());
      } else {
        const bookingsPerVenue = await Promise.all(
          targetVenues.map((v) =>
            bookingApi.getVenueBookings(getId(v), {
              startDate,
              endDate,
              limit: 500,
            })
          )
        );
        setBookings(bookingsPerVenue.flat());
      }
    } catch (err: unknown) {
      console.error("Error loading booked slots:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to load booked slots records.");
    } finally {
      setLoading(false);
    }
  }, [dateMode, selectedDate, startDate, endDate, selectedVenueId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Socket.IO sync
  useEffect(() => {
    const active = activeOnly(venues);
    active.forEach((v) => socketService.joinVenue(getId(v)));

    const unsubLocked = socketService.onSlotLocked(() => fetchData());
    const unsubReleased = socketService.onSlotReleased(() => fetchData());
    const unsubConfirmed = socketService.onBookingConfirmed(() => fetchData());

    return () => {
      unsubLocked();
      unsubReleased();
      unsubConfirmed();
      active.forEach((v) => socketService.leaveVenue(getId(v)));
    };
  }, [venues, fetchData]);

  // Shift single day
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  };

  // Helper to map booking to full CustomerUser
  const getCustomerForBooking = useCallback(
    (b: Booking): CustomerUser => {
      const cId =
        typeof b.userId === "object" && b.userId
          ? (b.userId as any)._id
          : b.userId || b.customerId;
      const found = customers.find((c) => (c._id || c.id) === cId);
      if (found) return found;

      if (b.customerPhone) {
        const byPhone = customers.find((c) => c.phone === b.customerPhone);
        if (byPhone) return byPhone;
      }

      return {
        _id: cId || "",
        id: cId || "",
        userName: b.customerName || "Customer",
        name: b.customerName || "Customer",
        phone: b.customerPhone || "",
        status: "Active" as CustomerStatus,
        walletBalance: 0,
        noShowCount: 0,
      };
    },
    [customers]
  );

  // Quick Action: Mark Check-In (Show)
  const handleQuickCheckIn = async (b: Booking) => {
    const bId = getId(b);
    setQuickActionLoadingId(bId);
    try {
      const price = Number(b.finalPrice ?? b.totalPrice ?? b.price ?? 0);
      const paid = Number(b.paidAmount ?? 0);
      const rem =
        b.remainingAmount !== undefined && b.remainingAmount !== null && b.remainingAmount > 0
          ? b.remainingAmount
          : Math.max(0, price - paid);
      const hasDue = rem > 0 && b.paymentStatus !== "paid";

      await bookingApi.updateStatus(bId, {
        status: "completed",
        paymentStatus: "paid",
        collectCash: hasDue,
        cashAmount: hasDue ? rem : 0,
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to mark booking as Show / Checked-in.");
    } finally {
      setQuickActionLoadingId(null);
    }
  };

  // Quick Action: Mark No-Show
  const handleQuickMarkNoShow = async (b: Booking) => {
    const bId = getId(b);
    if (!window.confirm(`Are you sure you want to mark booking #${b.bookingCode || bId} as NO SHOW?`)) {
      return;
    }
    setQuickActionLoadingId(bId);
    try {
      await bookingApi.updateStatus(bId, {
        status: "no_show",
      });
      await fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to mark booking as No Show.");
    } finally {
      setQuickActionLoadingId(null);
    }
  };

  // Open Reusable Customer Status Modal (Hold / Suspend)
  const handleOpenCustomerStatusModal = (b: Booking) => {
    const c = getCustomerForBooking(b);
    setSelectedCustomerForStatus(c);
    setIsStatusModalOpen(true);
  };

  // Open Reusable Notification Modal
  const handleOpenCustomerNotifyModal = (b: Booking) => {
    const c = getCustomerForBooking(b);
    setSelectedCustomerForNotify(c);
    setIsNotifyModalOpen(true);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // ─── Filtered Bookings & KPI Calculations ───
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Payment filter
      if (paymentStatusFilter !== "ALL") {
        if (paymentStatusFilter === "paid" && b.paymentStatus !== "paid") return false;
        if (paymentStatusFilter === "partially_paid" && b.paymentStatus !== "partially_paid") return false;
        if (paymentStatusFilter === "unpaid" && b.paymentStatus !== "unpaid") return false;
      }

      // Show / Attendance status filter
      if (showStatusFilter !== "ALL") {
        if (showStatusFilter === "show" && b.status !== "completed") return false;
        if (showStatusFilter === "no_show" && b.status !== "no_show") return false;
        if (
          showStatusFilter === "upcoming" &&
          b.status !== "confirmed" &&
          b.status !== "pending"
        )
          return false;
        if (showStatusFilter === "cancelled" && b.status !== "cancelled") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (b.bookingCode || "").toLowerCase();
        const cName = (b.customerName || "").toLowerCase();
        const cPhone = (b.customerPhone || "").toLowerCase();
        const vName = (b.venueName || "").toLowerCase();
        if (
          !code.includes(q) &&
          !cName.includes(q) &&
          !cPhone.includes(q) &&
          !vName.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, paymentStatusFilter, showStatusFilter, searchQuery]);

  // KPIs based on filtered records
  const kpis = useMemo(() => {
    let totalPaid = 0;
    let totalRemaining = 0;
    let noShows = 0;
    let shows = 0;
    let upcoming = 0;

    filteredBookings.forEach((b) => {
      const price = Number(b.finalPrice ?? b.totalPrice ?? b.price ?? 0);
      const paid = Number(b.paidAmount ?? 0);
      const rem =
        b.remainingAmount !== undefined && b.remainingAmount !== null
          ? Number(b.remainingAmount)
          : Math.max(0, price - paid);

      totalPaid += paid;
      totalRemaining += rem;

      if (b.status === "completed") shows++;
      else if (b.status === "no_show") noShows++;
      else if (b.status === "confirmed" || b.status === "pending") upcoming++;
    });

    const totalCount = filteredBookings.length;
    const noShowRate = totalCount > 0 ? (noShows / totalCount) * 100 : 0;

    return {
      totalCount,
      totalPaid,
      totalRemaining,
      noShows,
      shows,
      upcoming,
      noShowRate,
    };
  }, [filteredBookings]);

  // ─── CSV Export ───
  const handleExportCSV = () => {
    if (filteredBookings.length === 0) {
      alert("No booked slots available to export.");
      return;
    }

    const headers = [
      "Booking Code",
      "Date",
      "Time Slot",
      "Venue",
      "Customer Name",
      "Customer Phone",
      "Customer Status",
      "Total Price (EGP)",
      "Paid Amount (EGP)",
      "Remaining Due (EGP)",
      "Payment Status",
      "Attendance Status",
    ];

    const rows = filteredBookings.map((b) => {
      const c = getCustomerForBooking(b);
      const price = Number(b.finalPrice ?? b.totalPrice ?? b.price ?? 0);
      const paid = Number(b.paidAmount ?? 0);
      const rem =
        b.remainingAmount !== undefined && b.remainingAmount !== null
          ? Number(b.remainingAmount)
          : Math.max(0, price - paid);

      let attendance = "Upcoming";
      if (b.status === "completed") attendance = "Show / Attended";
      else if (b.status === "no_show") attendance = "No Show";
      else if (b.status === "cancelled") attendance = "Cancelled";

      return [
        `"${b.bookingCode || b._id}"`,
        `"${b.date}"`,
        `"${b.startTime} - ${b.endTime}"`,
        `"${(b.venueName || "Sports Venue").replace(/"/g, '""')}"`,
        `"${(b.customerName || "Customer").replace(/"/g, '""')}"`,
        `"${b.customerPhone || ""}"`,
        `"${c.status || "Active"}"`,
        price.toFixed(2),
        paid.toFixed(2),
        rem.toFixed(2),
        `"${b.paymentStatus}"`,
        `"${attendance}"`,
      ];
    });

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `Booked_Slots_${dateMode === "single" ? selectedDate : `${startDate}_to_${endDate}`}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <PageMeta
        title="Booked Match Slots & Attendance | San Siro"
        description="Monitor booked slots, payment collections, attendance status (Show / No Show), and customer account actions."
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <PageBreadcrumb pageTitle="Booked Match Slots" />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time table of all reserved slots, attendance status (Show / No Show), and immediate customer actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            to="/bookings/fullscreen"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 transition"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-brand-500" />
            Grid Calendar View
          </Link>

          <button
            onClick={() => setShowGateCheckIn(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition cursor-pointer"
          >
            <DoorOpen className="w-3.5 h-3.5" />
            Gate Ticket Scanner
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-brand-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Bookings */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Total Booked Slots
            </div>
            <div className="text-xl font-black text-gray-900 dark:text-white font-mono mt-0.5">
              {kpis.totalCount}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {kpis.shows} Shows • {kpis.upcoming} Upcoming
            </div>
          </div>
        </div>

        {/* Total Collected */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Collected Revenue
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
              {kpis.totalPaid.toLocaleString()} EGP
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Settled in Cash, Card & Wallet
            </div>
          </div>
        </div>

        {/* Outstanding Due */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${
            kpis.totalRemaining > 0
              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
              : "bg-gray-50 dark:bg-gray-800 text-gray-400"
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Remaining Balance Due
            </div>
            <div className={`text-xl font-black font-mono mt-0.5 ${
              kpis.totalRemaining > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-gray-900 dark:text-white"
            }`}>
              {kpis.totalRemaining.toLocaleString()} EGP
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              {kpis.totalRemaining > 0 ? "To collect at venue gate" : "All balances settled"}
            </div>
          </div>
        </div>

        {/* Total No Shows */}
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
          <div className={`p-3 rounded-xl ${
            kpis.noShows > 0
              ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Total No-Shows
            </div>
            <div className="text-xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5 flex items-center gap-2">
              <span>{kpis.noShows}</span>
              {kpis.totalCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                  {kpis.noShowRate.toFixed(1)}%
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Automated system & gate records
            </div>
          </div>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-xs mb-6 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Date Mode Toggle & Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex rounded-xl p-1 bg-gray-100 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs font-bold">
              <button
                onClick={() => setDateMode("single")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  dateMode === "single"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Single Date
              </button>
              <button
                onClick={() => setDateMode("range")}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  dateMode === "range"
                    ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs"
                    : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                Date Range
              </button>
            </div>

            {dateMode === "single" ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => shiftDate(-1)}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <div className="w-40">
                  <ModernDatePicker
                    value={selectedDate}
                    onChange={setSelectedDate}
                    placeholder="Select Date"
                    variant="compact"
                  />
                </div>
                <button
                  onClick={() => shiftDate(1)}
                  className="p-2 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                  title="Next Day"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setSelectedDate(toDateStr(new Date()))}
                  className="px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/40 dark:hover:bg-brand-900/40 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 text-xs font-bold transition cursor-pointer"
                >
                  Today
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-36">
                  <ModernDatePicker
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="From Date"
                    variant="compact"
                  />
                </div>
                <span className="text-xs text-gray-400 font-bold">to</span>
                <div className="w-36">
                  <ModernDatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="To Date"
                    variant="compact"
                  />
                </div>
                <button
                  onClick={() => {
                    const today = toDateStr(new Date());
                    setStartDate(today);
                    setEndDate(today);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 7);
                    setStartDate(toDateStr(start));
                    setEndDate(toDateStr(end));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(end.getFullYear(), end.getMonth(), 1);
                    setStartDate(toDateStr(start));
                    setEndDate(toDateStr(end));
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-750 text-gray-600 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  This Month
                </button>
              </div>
            )}
          </div>

          {/* Venue Dropdown */}
          <div className="w-56">
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500 font-medium"
            >
              <option value="ALL">🏟️ All Venues ({activeOnly(venues).length})</option>
              {activeOnly(venues).map((v) => (
                <option key={getId(v)} value={getId(v)}>
                  {v.venueName || v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Filter Row: Payment, Attendance & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-700/80">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Payment Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-bold">Payment:</span>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium"
              >
                <option value="ALL">All Payments</option>
                <option value="paid">✅ Paid Only</option>
                <option value="partially_paid">⚠️ Partially Paid</option>
                <option value="unpaid">❌ Unpaid Only</option>
              </select>
            </div>

            {/* Attendance Status Dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-bold">Attendance:</span>
              <select
                value={showStatusFilter}
                onChange={(e) => setShowStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-medium"
              >
                <option value="ALL">All Show Statuses</option>
                <option value="show">✅ Show / Attended</option>
                <option value="no_show">❌ No Show</option>
                <option value="upcoming">⏳ Upcoming / Awaiting</option>
                <option value="cancelled">🚫 Cancelled</option>
              </select>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, phone, code..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={fetchData} className="underline font-bold text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Data Table Card */}
      <div className="rounded-2xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700/80 bg-gray-50/75 dark:bg-gray-750/50 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <th className="py-3 px-4">Slot Time & Date</th>
                <th className="py-3 px-4">Venue</th>
                <th className="py-3 px-4">Booking Code</th>
                <th className="py-3 px-4">Customer Details</th>
                <th className="py-3 px-4">Payment Breakdown</th>
                <th className="py-3 px-4">Attendance Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading && bookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
                      <span>Loading booked slots...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <span className="font-semibold text-gray-600 dark:text-gray-300">
                        No booked match slots found
                      </span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your date range, venue, or status filters.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => {
                  const c = getCustomerForBooking(b);
                  const price = Number(b.finalPrice ?? b.totalPrice ?? b.price ?? 0);
                  const paid = Number(b.paidAmount ?? 0);
                  const rem =
                    b.remainingAmount !== undefined && b.remainingAmount !== null
                      ? Number(b.remainingAmount)
                      : Math.max(0, price - paid);

                  const isShow = b.status === "completed";
                  const isNoShow = b.status === "no_show";
                  const isCancelled = b.status === "cancelled";
                  const isUpcoming = b.status === "confirmed" || b.status === "pending";

                  const customerStatus = c.status || "Active";
                  const isOnHold = customerStatus === "On Hold";
                  const isSuspended = customerStatus === "Suspended";

                  const isActionLoading = quickActionLoadingId === getId(b);

                  return (
                    <tr
                      key={getId(b)}
                      className="hover:bg-gray-50/60 dark:hover:bg-gray-750/40 transition"
                    >
                      {/* Slot Time & Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900 dark:text-white">
                          {b.date}
                        </div>
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-mono font-bold text-[11px]">
                          <Clock className="w-3 h-3 text-blue-500" />
                          {b.startTime} - {b.endTime}
                        </div>
                      </td>

                      {/* Venue */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-800 dark:text-gray-200">
                          {b.venueName || "Sports Venue"}
                        </div>
                        {(b as any).pitchNumber && (
                          <div className="text-[11px] text-gray-400">
                            Pitch #{(b as any).pitchNumber}
                          </div>
                        )}
                      </td>

                      {/* Booking Code */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-750 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                            #{b.bookingCode || getId(b).slice(-6).toUpperCase()}
                          </span>
                          <button
                            onClick={() => handleCopyCode(b.bookingCode || getId(b))}
                            title="Copy Booking Code"
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                          >
                            {copiedCode === (b.bookingCode || getId(b)) ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                          via {b.paymentMethod || "wallet"}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {c.userName || c.name || b.customerName || "Customer"}
                          </span>
                          {/* Account status badge */}
                          {isSuspended ? (
                            <span
                              title={c.statusReason || "Suspended Account"}
                              className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800"
                            >
                              Suspended
                            </span>
                          ) : isOnHold ? (
                            <span
                              title={c.statusReason || "Account on Hold"}
                              className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            >
                              On Hold
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                              Active
                            </span>
                          )}
                        </div>

                        {/* Customer Phone */}
                        {b.customerPhone && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <a
                              href={`tel:${b.customerPhone}`}
                              className="hover:underline hover:text-brand-500"
                            >
                              {b.customerPhone}
                            </a>
                          </div>
                        )}

                        {/* Past No-Shows count indicator */}
                        {c.noShowCount && c.noShowCount > 0 ? (
                          <div className="text-[10px] font-semibold text-red-600 dark:text-red-400 mt-0.5">
                            ⚠️ {c.noShowCount} previous no-shows
                          </div>
                        ) : null}
                      </td>

                      {/* Payment Breakdown */}
                      <td className="py-3 px-4 whitespace-nowrap font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-400">Total:</span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {price} EGP
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] mt-0.5">
                          <span className="text-gray-400">Paid:</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            {paid} EGP
                          </span>
                        </div>
                        {rem > 0 ? (
                          <div className="flex items-center gap-2 text-[11px] mt-0.5">
                            <span className="text-gray-400">Due:</span>
                            <span className="text-amber-600 dark:text-amber-400 font-bold">
                              {rem} EGP
                            </span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-sans font-semibold mt-0.5">
                            ✓ Fully Settled
                          </div>
                        )}
                      </td>

                      {/* Attendance Status (Show / No Show / Upcoming / Cancelled) */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isShow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Show / Attended
                          </span>
                        ) : isNoShow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                            <XCircle className="w-3.5 h-3.5" />
                            No Show
                          </span>
                        ) : isCancelled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-700">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Clock className="w-3.5 h-3.5" />
                            Upcoming / Awaiting
                          </span>
                        )}
                      </td>

                      {/* Direct Action Buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Send Notification Button */}
                          <button
                            onClick={() => handleOpenCustomerNotifyModal(b)}
                            title="Send Push & In-App Notification"
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition cursor-pointer"
                          >
                            <Bell className="w-3.5 h-3.5" />
                          </button>

                          {/* Hold / Suspend Customer Button */}
                          <button
                            onClick={() => handleOpenCustomerStatusModal(b)}
                            title="Put Customer on Hold or Suspend Account"
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                              isSuspended
                                ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                                : isOnHold
                                ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                                : "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                            }`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Show / Check-in (if upcoming or no-show) */}
                          {!isShow && !isCancelled && (
                            <button
                              onClick={() => handleQuickCheckIn(b)}
                              disabled={isActionLoading}
                              title="Mark as Attended (Show) & Collect Balance"
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition cursor-pointer"
                            >
                              {isActionLoading ? "..." : "✓ Show"}
                            </button>
                          )}

                          {/* Quick No-Show (if upcoming) */}
                          {isUpcoming && (
                            <button
                              onClick={() => handleQuickMarkNoShow(b)}
                              disabled={isActionLoading}
                              title="Mark as No Show"
                              className="px-2 py-1 text-[11px] font-bold rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 transition cursor-pointer"
                            >
                              {isActionLoading ? "..." : "✗ No Show"}
                            </button>
                          )}

                          {/* Manage Booking Details Modal */}
                          <button
                            onClick={() => setManageBooking(b)}
                            title="Manage Booking Details"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
                          >
                            <Settings className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-3.5 bg-gray-50/75 dark:bg-gray-750/50 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            Showing <strong className="text-gray-800 dark:text-gray-200">{filteredBookings.length}</strong> of{" "}
            <strong>{bookings.length}</strong> booked slots
          </div>
          <div className="text-[11px]">
            {dateMode === "single" ? `Date: ${selectedDate}` : `Range: ${startDate} to ${endDate}`}
          </div>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Reusable Customer Status Modal (Hold / Suspend / Active / Archived) */}
      <CustomerStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        customer={selectedCustomerForStatus}
        onStatusUpdated={(_updated) => {
          fetchData();
        }}
      />

      {/* Reusable Customer Direct Notification Modal */}
      <CustomerNotificationModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        customer={selectedCustomerForNotify}
      />

      {/* Gate Ticket Scanner Modal */}
      <GateCheckInModal
        isOpen={showGateCheckIn}
        onClose={() => setShowGateCheckIn(false)}
        onCompleted={fetchData}
      />

      {/* Manage Booking Modal */}
      <ManageBookingModal
        booking={manageBooking}
        onClose={() => setManageBooking(null)}
        onUpdated={fetchData}
        onRequestCancel={(b) => {
          setManageBooking(null);
          setCancelTarget(b);
        }}
      />

      {/* Cancel Booking Modal */}
      <CancelBookingModal
        booking={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelled={fetchData}
      />
    </div>
  );
}
