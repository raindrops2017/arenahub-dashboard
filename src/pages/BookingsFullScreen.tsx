import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router";
import {
  Booking,
  Venue,
  PaymentMethod,
} from "../types";
import { bookingApi } from "../services/api/bookingApi";
import { venueApi } from "../services/api/venueApi";
import { socketService } from "../services/api/socketService";
import { Modal } from "../components/ui/modal";

import { customerApi } from "../services/api/customerApi";
import { CustomerUser } from "../types";

// ─── Curated Color & Style Tokens ─────────────────────────
const fmt = (n: number) => `${n.toLocaleString()} EGP`;
const pad = (h: number) => {
  const norm = h % 24;
  const ampm = norm >= 12 && norm < 24 ? "PM" : "AM";
  const displayHour = norm % 12 === 0 ? 12 : norm % 12;
  return `${displayHour}:00 ${ampm}`;
};

const statusBadgeStyle: Record<string, string> = {
  confirmed: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  Confirmed: "bg-blue-500/10 text-blue-400 border border-blue-500/30",
  completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  Completed: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
  cancelled: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
  Cancelled: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
  pending: "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse",
  expired: "bg-gray-500/10 text-gray-400 border border-gray-500/30",
};

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── Main FullScreen Component ─────────────────────────────
export default function BookingsFullScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Modals
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  // Gate Check-In Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; booking: Booking } | null>(null);
  const [verifyError, setVerifyError] = useState("");

  // New Booking Form State
  const [newBookingVenueId, setNewBookingVenueId] = useState("");
  const [newBookingDate, setNewBookingDate] = useState(selectedDate);
  const [newBookingStartHour, setNewBookingStartHour] = useState(18);
  const [newBookingEndHour, setNewBookingEndHour] = useState(19);
  const [newBookingPaymentMethod, setNewBookingPaymentMethod] = useState<PaymentMethod>("cash");
  const [newBookingCoupon, setNewBookingCoupon] = useState("");
  const [isSubmittingNew, setIsSubmittingNew] = useState(false);
  const [customerSelectionType, setCustomerSelectionType] = useState<"existing" | "new">("existing");
  const [newBookingCustomerId, setNewBookingCustomerId] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const reloadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [fetchedVenues, fetchedCustomers] = await Promise.all([
        venueApi.getAllVenues(),
        customerApi.getAllCustomers(),
      ]);
      setVenues(fetchedVenues);
      setCustomers(fetchedCustomers);

      const activeVList = fetchedVenues.filter((v) => v.isActive !== false);
      const allBookingPromises = activeVList.map((v) =>
        bookingApi.getVenueBookings(v._id || v.id || "", { date: selectedDate })
      );
      const bookingsPerVenue = await Promise.all(allBookingPromises);
      const flattened = bookingsPerVenue.flat();
      setBookings(flattened);
    } catch (err: any) {
      console.error("Error loading live bookings:", err);
      setErrorMsg(err.message || "Failed to load live booking records.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Real-time Socket.IO Sync
  useEffect(() => {
    const activeVList = venues.filter((v) => v.isActive !== false);
    activeVList.forEach((v) => {
      socketService.joinVenue(v._id || v.id || "");
    });

    const unsubLocked = socketService.onSlotLocked((data) => {
      console.log("Socket: slot_locked", data);
      reloadData();
    });

    const unsubReleased = socketService.onSlotReleased((data) => {
      console.log("Socket: slot_released", data);
      reloadData();
    });

    const unsubConfirmed = socketService.onBookingConfirmed((data) => {
      console.log("Socket: booking_confirmed", data);
      reloadData();
    });

    return () => {
      unsubLocked();
      unsubReleased();
      unsubConfirmed();
      activeVList.forEach((v) => {
        socketService.leaveVenue(v._id || v.id || "");
      });
    };
  }, [venues, reloadData]);

  const filteredBookings = useMemo(() => {
    let list = bookings;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => {
        const cName = (b.customerName || "").toLowerCase();
        const cPhone = (b.customerPhone || "").toLowerCase();
        const bCode = (b.bookingCode || "").toLowerCase();
        const vName = (b.venueName || "").toLowerCase();
        return (
          cName.includes(q) ||
          cPhone.includes(q) ||
          bCode.includes(q) ||
          vName.includes(q)
        );
      });
    }
    return list;
  }, [bookings, search]);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  };

  const activeVenues = useMemo(() => venues.filter((v) => v.isActive !== false), [venues]);
  const hours = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 6), []); // 6 AM to 11 PM

  function getSlotBooking(venueId: string, hour: number) {
    return filteredBookings.find((b) => {
      const bVenueId = typeof b.venueId === "object" && b.venueId ? b.venueId._id : b.venueId;
      if (bVenueId !== venueId) return false;

      let startH = typeof b.startTime === "number" ? b.startTime : 0;
      let endH = typeof b.endTime === "number" ? b.endTime : startH + 1;

      if (typeof b.startTime === "string") {
        const match = b.startTime.match(/(\d+):00\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const ampm = match[2].toUpperCase();
          if (ampm === "PM" && h !== 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          startH = h;
        }
      }

      if (typeof b.endTime === "string") {
        const match = b.endTime.match(/(\d+):00\s*(AM|PM)/i);
        if (match) {
          let h = parseInt(match[1], 10);
          const ampm = match[2].toUpperCase();
          if (ampm === "PM" && h !== 12) h += 12;
          if (ampm === "AM" && h === 12) h = 0;
          endH = h;
        }
      }

      return hour >= startH && hour < endH;
    });
  }

  // Handle Verify Gate Code
  const handleVerifyCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;
    setVerifyLoading(true);
    setVerifyError("");
    setVerifyResult(null);
    try {
      const res = await bookingApi.verifyBookingCode(verifyCode.trim());
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err.message || "Invalid booking code or reservation not found.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handle Create Booking
  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookingVenueId) {
      alert("Please select a sports venue.");
      return;
    }
    setIsSubmittingNew(true);
    try {
      let finalCustomerId = customerSelectionType === "existing" ? newBookingCustomerId : undefined;
      
      if (customerSelectionType === "new") {
        if (!newCustomerName || !newCustomerPhone) {
          throw new Error("Please provide customer name and phone.");
        }
        const newCustomer = await customerApi.createCustomer({ userName: newCustomerName, phone: newCustomerPhone });
        finalCustomerId = newCustomer._id || newCustomer.id;
      }

      await bookingApi.createBooking({
        venueId: newBookingVenueId,
        date: newBookingDate,
        startTime: newBookingStartHour,
        endTime: newBookingEndHour,
        couponCode: newBookingCoupon.trim() || undefined,
        paymentMethod: (newBookingPaymentMethod as string).toLowerCase(),
        customerId: finalCustomerId,
      });
      setShowNewBooking(false);
      setNewCustomerName("");
      setNewCustomerPhone("");
      await reloadData();
    } catch (err: any) {
      alert(err.message || "Failed to create booking.");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  // Handle Cancel Booking
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await bookingApi.cancelBooking(cancelTarget._id || cancelTarget.id);
      setCancelTarget(null);
      await reloadData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking.");
    }
  };

  // Handle Mark Status
  const handleUpdateStatus = async (
    bookingId: string,
    status: string,
    paymentStatus?: string
  ) => {
    try {
      await bookingApi.updateStatus(bookingId, { status, paymentStatus });
      setEditBooking(null);
      await reloadData();
    } catch (err: any) {
      alert(err.message || "Failed to update booking status.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* ─── Top Glassmorphism Navigation Bar ─── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700/80 shadow-sm dark:shadow-xl">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-[1920px] mx-auto">
          {/* Left Brand & Back */}
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800/80 hover:bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-white border border-gray-300 dark:border-gray-600/60 transition-all text-xs font-semibold group"
            >
              <svg className="w-4 h-4 transform group-hover:-trangray-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Return to Dashboard
            </Link>
            <div className="h-5 w-px bg-gray-100 dark:bg-gray-800" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <span className="text-sm font-black">⚽</span>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white flex items-center gap-2">
                  Live Slot Booking Grid
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 animate-pulse">
                    ● Live Synced
                  </span>
                  {loading && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
                      Syncing slots...
                    </span>
                  )}
                </h1>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Real-time mobile locks & gate QR verification
                </p>
              </div>
            </div>
          </div>

          {/* Center – Interactive Date Picker & Controller */}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md/80 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-inner">
            <button
              onClick={() => shiftDate(-1)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-white transition"
              title="Previous Day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent px-3 py-1 text-sm font-bold text-white focus:outline-none cursor-pointer"
            />

            <button
              onClick={() => shiftDate(1)}
              className="p-2 rounded-xl hover:bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-white transition"
              title="Next Day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </button>

            <button
              onClick={() => setSelectedDate(toDateStr(new Date()))}
              className="ml-1 px-3 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold transition"
            >
              Today
            </button>
          </div>

          {/* Right – Gate Check-in & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking/customer..."
                className="w-52 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <svg className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Gate QR Verification Button */}
            <button
              onClick={() => {
                setVerifyCode("");
                setVerifyResult(null);
                setVerifyError("");
                setShowVerifyModal(true);
              }}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>🎟️</span> Gate Check-In
            </button>

            <div className="flex bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md p-1 rounded-xl border border-gray-200 dark:border-gray-700/80">
              {(["grid", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                    view === v
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-500 dark:text-gray-400 hover:text-white"
                  }`}
                >
                  {v === "grid" ? "Grid" : "List"}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setNewBookingVenueId(activeVenues[0]?._id || activeVenues[0]?.id || "");
                setNewBookingDate(selectedDate);
                setShowNewBooking(true);
              }}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/25"
            >
              + New Booking
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 p-6 max-w-[1920px] w-full mx-auto space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-medium flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={reloadData} className="font-bold underline ml-4 hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        {view === "grid" ? (
          /* ─── TIME SLOT GRID VIEW ─── */
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md/60 backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-white/90 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700/80">
                    <th className="sticky left-0 z-20 bg-white dark:bg-gray-800/90 px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700/80 w-28">
                      Slot Hour
                    </th>
                    {activeVenues.map((v) => {
                      const vId = v._id || v.id || "";
                      const sTypes = v.sportsType || v.sportsTypes || [];
                      return (
                        <th key={vId} className="px-4 py-4 text-center border-r border-gray-200 dark:border-gray-700/80/60 min-w-[180px] last:border-r-0">
                          <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{v.venueName || v.name}</div>
                          <div className="flex gap-1 justify-center mt-1.5 flex-wrap">
                            {sTypes.map((s) => (
                              <span key={s} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {s}
                              </span>
                            ))}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {hours.map((h) => (
                    <tr key={h} className="group hover:bg-white dark:bg-gray-800/90/30 transition-colors">
                      <td className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md px-4 py-3 text-xs font-bold text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700/80 whitespace-nowrap">
                        {pad(h)}
                      </td>
                      {activeVenues.map((v) => {
                        const vId = v._id || v.id || "";
                        const b = getSlotBooking(vId, h);
                        if (b) {
                          const isCancelled = b.status === "cancelled" || b.status === "Cancelled";
                          const isPending = b.status === "pending";
                          return (
                            <td
                              key={vId}
                              onClick={() => isCancelled ? undefined : setEditBooking(b)}
                              className={`p-2.5 border-r border-gray-200 dark:border-gray-700/80/60 last:border-r-0 cursor-pointer transition-all ${
                                isCancelled
                                  ? "bg-white dark:bg-gray-800/90/20 opacity-50"
                                  : isPending
                                  ? "bg-amber-950/30 hover:bg-amber-950/50"
                                  : "bg-blue-950/40 hover:bg-blue-900/50"
                              }`}
                            >
                              <div className="p-3 rounded-xl border border-gray-300 dark:border-gray-600/60 bg-white/90 dark:bg-gray-800/90 shadow-md flex flex-col justify-between h-full">
                                <div>
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-xs text-white line-clamp-1">
                                      {b.customerName || "Customer"}
                                    </span>
                                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${statusBadgeStyle[b.status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
                                      {b.status}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                    {b.bookingCode ? `#${b.bookingCode}` : ""}
                                  </div>
                                </div>
                                <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-200 dark:border-gray-700/80">
                                  <span className="font-bold text-emerald-400">
                                    {fmt(b.price || b.totalPrice || 0)}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400 font-mono">
                                    {b.paymentStatus}
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={vId}
                            onClick={() => {
                              setNewBookingVenueId(vId);
                              setNewBookingDate(selectedDate);
                              setNewBookingStartHour(h);
                              setNewBookingEndHour(h + 1);
                              setShowNewBooking(true);
                            }}
                            className="p-2 border-r border-gray-200 dark:border-gray-700/80/40 last:border-r-0 hover:bg-emerald-950/10 cursor-pointer transition-colors group/slot text-center"
                          >
                            <span className="inline-block opacity-0 group-hover/slot:opacity-100 text-xs font-bold text-emerald-400 transition-opacity">
                              + Book Slot
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ─── LIST VIEW ─── */
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md/60 overflow-hidden shadow-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-white dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Booking Code</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Venue</th>
                  <th className="px-6 py-4">Time Slot</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filteredBookings.map((b) => (
                  <tr key={b._id || b.id} className="hover:bg-white dark:bg-gray-800/90/40 transition">
                    <td className="px-6 py-4 font-mono font-bold text-blue-400">
                      {b.bookingCode || b._id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-white">{b.customerName || "Customer"}</div>
                      <div className="text-gray-500 dark:text-gray-400 font-mono text-[11px]">{b.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-800 dark:text-gray-200">
                      {b.venueName || "Venue"}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300 font-mono">
                      {b.startTime} - {b.endTime}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">
                      {fmt(b.price || b.totalPrice || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${statusBadgeStyle[b.status] || "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditBooking(b)}
                        className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* ─── GATE CHECK-IN / CODE VERIFICATION MODAL ─── */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        className="max-w-md p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-white"
      >
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎟️</span>
            <div>
              <h3 className="text-lg font-bold text-white">Gate Ticket Verification</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Scan QR or enter 6-character booking code</p>
            </div>
          </div>

          <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase">
                Booking / QR Code
              </label>
              <input
                type="text"
                required
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.toUpperCase())}
                placeholder="e.g. BK7890 or BK-..."
                className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 font-mono font-bold text-sm text-white uppercase placeholder:text-gray-500 dark:text-gray-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={verifyLoading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50"
            >
              {verifyLoading ? "Verifying Ticket..." : "Verify Ticket Code"}
            </button>
          </form>

          {verifyError && (
            <div className="mt-4 p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs font-medium">
              ❌ {verifyError}
            </div>
          )}

          {verifyResult && (
            <div className="mt-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">STATUS:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${verifyResult.valid ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {verifyResult.valid ? "✅ VALID TICKET" : "❌ INVALID / CANCELLED"}
                </span>
              </div>
              <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                <div><strong className="text-gray-500 dark:text-gray-400">Customer:</strong> {verifyResult.booking.customerName} ({verifyResult.booking.customerPhone})</div>
                <div><strong className="text-gray-500 dark:text-gray-400">Venue:</strong> {verifyResult.booking.venueName}</div>
                <div><strong className="text-gray-500 dark:text-gray-400">Slot Time:</strong> {verifyResult.booking.startTime} - {verifyResult.booking.endTime} ({verifyResult.booking.date})</div>
                <div><strong className="text-gray-500 dark:text-gray-400">Payment:</strong> {verifyResult.booking.paymentStatus} ({fmt(verifyResult.booking.price || 0)})</div>
              </div>
              {verifyResult.valid && (
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateStatus(verifyResult.booking._id || verifyResult.booking.id, "completed", "paid");
                    setShowVerifyModal(false);
                  }}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  ✓ Confirm Gate Check-In & Complete
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ─── CREATE NEW BOOKING MODAL ─── */}
      <Modal
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        className="max-w-lg p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-white"
      >
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Create Venue Slot Reservation</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Reserve slot directly on live system</p>

          <form onSubmit={handleCreateBookingSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Sports Venue</label>
              <select
                value={newBookingVenueId}
                onChange={(e) => setNewBookingVenueId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-white"
              >
                {activeVenues.map((v) => (
                  <option key={v._id || v.id} value={v._id || v.id}>
                    {v.venueName || v.name} - {v.defaultHourPrice} EGP/hr
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-gray-100 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600/50">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer Selection</label>
              <div className="flex items-center gap-4 mb-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="customerSelectionType"
                    checked={customerSelectionType === "existing"}
                    onChange={() => setCustomerSelectionType("existing")}
                    className="accent-blue-600"
                  />
                  Select Existing
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="customerSelectionType"
                    checked={customerSelectionType === "new"}
                    onChange={() => setCustomerSelectionType("new")}
                    className="accent-blue-600"
                  />
                  New Customer
                </label>
              </div>

              {customerSelectionType === "existing" ? (
                <select
                  value={newBookingCustomerId}
                  onChange={(e) => setNewBookingCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-white"
                >
                  <option value="">-- Optional (Admin self) --</option>
                  {customers.map((c) => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.userName} ({c.phone})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Phone Number"
                    value={newCustomerPhone}
                    onChange={(e) => setNewCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={newBookingDate}
                  onChange={(e) => setNewBookingDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Hour (24h)</label>
                <input
                  type="number"
                  min="6"
                  max="23"
                  value={newBookingStartHour}
                  onChange={(e) => {
                    const st = Number(e.target.value);
                    setNewBookingStartHour(st);
                    setNewBookingEndHour(st + 1);
                  }}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Method</label>
                <select
                  value={newBookingPaymentMethod}
                  onChange={(e) => setNewBookingPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-white"
                >
                  <option value="cash">Cash at Venue</option>
                  <option value="wallet">Digital Wallet</option>
                  <option value="Credit Card">Credit Card</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Promo Coupon (Optional)</label>
                <input
                  type="text"
                  value={newBookingCoupon}
                  onChange={(e) => setNewBookingCoupon(e.target.value.toUpperCase())}
                  placeholder="e.g. PROMO20"
                  className="w-full px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md border border-gray-300 dark:border-gray-600 text-xs text-white uppercase font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setShowNewBooking(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingNew}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {isSubmittingNew ? "Reserving..." : "Create Reservation"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── MANAGE BOOKING MODAL ─── */}
      {editBooking && (
        <Modal
          isOpen={!!editBooking}
          onClose={() => setEditBooking(null)}
          className="max-w-md p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-white"
        >
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700/80">
              <div>
                <h3 className="text-base font-bold text-white">Booking #{editBooking.bookingCode}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{editBooking.venueName}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${statusBadgeStyle[editBooking.status] || ""}`}>
                {editBooking.status}
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 mb-6 bg-gray-50 dark:bg-gray-800/90 backdrop-blur-md p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80">
              <div><strong className="text-gray-500 dark:text-gray-400">Customer:</strong> {editBooking.customerName} ({editBooking.customerPhone})</div>
              <div><strong className="text-gray-500 dark:text-gray-400">Slot:</strong> {editBooking.startTime} - {editBooking.endTime} on {editBooking.date}</div>
              <div><strong className="text-gray-500 dark:text-gray-400">Price:</strong> {fmt(editBooking.price || editBooking.totalPrice || 0)}</div>
              <div><strong className="text-gray-500 dark:text-gray-400">Payment Status:</strong> {editBooking.paymentStatus} ({editBooking.paymentMethod})</div>
            </div>

            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Update Lifecycle Status</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(editBooking._id || editBooking.id, "confirmed", "paid")}
                  className="p-2 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 text-xs font-bold"
                >
                  ✓ Confirm & Paid
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(editBooking._id || editBooking.id, "completed", "paid")}
                  className="p-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold"
                >
                  ★ Mark Completed
                </button>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    const target = editBooking;
                    setEditBooking(null);
                    setCancelTarget(target);
                  }}
                  className="text-xs font-bold text-red-400 hover:text-red-300 py-1"
                >
                  Cancel Booking & Refund
                </button>

                <button
                  type="button"
                  onClick={() => setEditBooking(null)}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── CANCEL CONFIRMATION MODAL ─── */}
      {cancelTarget && (
        <Modal
          isOpen={!!cancelTarget}
          onClose={() => setCancelTarget(null)}
          className="max-w-sm p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-white text-center"
        >
          <div>
            <span className="text-3xl mb-2 inline-block">⚠️</span>
            <h3 className="text-base font-bold text-white mb-2">Cancel Reservation?</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
              This will release the slot for #{cancelTarget.bookingCode} across mobile devices and process a wallet refund if applicable.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-700"
              >
                No, Keep
              </button>
              <button
                onClick={handleConfirmCancel}
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}



