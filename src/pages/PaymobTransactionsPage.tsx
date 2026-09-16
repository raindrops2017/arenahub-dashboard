import { useState, useEffect, useCallback, useMemo } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import {
  DollarLineIcon,
  EyeIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertIcon,
  CloseIcon,
  CopyIcon,
} from "../icons";
import { Payment } from "../types";
import { paymentApi } from "../services/api/paymentApi";
import { ModernDatePicker } from "../components/ui/ModernDatePicker";

export default function PaymobTransactionsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: "",
    end: "",
  });

  // Selected Transaction for Details Modal / Printable Receipt
  const [selectedTx, setSelectedTx] = useState<Payment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getAllPayments({
        paymentMethod: "paymob",
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        status: statusFilter !== "ALL" ? statusFilter.toLowerCase() : undefined,
        search: searchQuery.trim() || undefined,
      });

      // Filter strictly for Paymob gateway payments only (exclude cash/wallet)
      const allDocs = (res.docs || []).filter(
        (p) => (p.paymentMethod || "").toLowerCase() === "paymob"
      );
      setPayments(allDocs);
    } catch (err) {
      console.error("Failed to load Paymob transactions:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter, searchQuery]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Copy to clipboard helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Reset Date Filters
  const handleResetDates = () => {
    setDateRange({ start: "", end: "" });
  };

  // Filtered payments calculation
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q)) ||
        (p.referenceId && p.referenceId.toLowerCase().includes(q)) ||
        (p.paymobOrderId && String(p.paymobOrderId).includes(q)) ||
        (p.paymobTransactionId && String(p.paymobTransactionId).includes(q)) ||
        (typeof p.userId === "object" && p.userId?.userName?.toLowerCase().includes(q)) ||
        (typeof p.userId === "object" && p.userId?.phone && String(p.userId.phone).includes(q)) ||
        (typeof p.bookingId === "object" && p.bookingId?.bookingCode?.toLowerCase().includes(q));

      const statusNorm = (p.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "PAID") {
        matchesStatus = statusNorm === "paid";
      } else if (statusFilter === "PARTIALLY_PAID") {
        matchesStatus = statusNorm === "partially_paid";
      } else if (statusFilter === "PENDING") {
        matchesStatus = statusNorm === "pending" || statusNorm === "unpaid";
      } else if (statusFilter === "REFUNDED") {
        matchesStatus = statusNorm === "refunded" || (p.refundedAmount ?? 0) > 0;
      } else if (statusFilter === "FAILED") {
        matchesStatus = statusNorm === "failed";
      }

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  // Metrics (Paymob Only)
  const metrics = useMemo(() => {
    const totalCount = payments.length;
    const paidList = payments.filter((p) => (p.status || "").toLowerCase() === "paid");
    const partiallyPaidList = payments.filter((p) => (p.status || "").toLowerCase() === "partially_paid");
    const settledVolume = payments
      .filter((p) => ["paid", "partially_paid"].includes((p.status || "").toLowerCase()))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRefunded = payments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0);

    return {
      totalCount,
      paidCount: paidList.length,
      partiallyPaidCount: partiallyPaidList.length,
      settledVolume,
      totalRefunded,
    };
  }, [payments]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert("No transaction records to export.");
      return;
    }

    const headers = [
      "Paymob Txn ID",
      "Paymob Order ID",
      "Customer Name",
      "Customer Phone",
      "Booking Code",
      "Pitch / Venue",
      "Amount (EGP)",
      "Refunded (EGP)",
      "Status",
      "Date & Time",
    ];

    const rows = filteredPayments.map((p) => {
      const user = typeof p.userId === "object" && p.userId ? p.userId : {};
      const booking = typeof p.bookingId === "object" && p.bookingId ? p.bookingId : {};
      const venue =
        typeof booking.venueId === "object" && booking.venueId
          ? booking.venueId
          : typeof p.venueId === "object" && p.venueId
          ? p.venueId
          : {};

      return [
        `"${p.transactionId || p.paymobTransactionId || p._id}"`,
        `"${p.paymobOrderId || "—"}"`,
        `"${user.userName || user.name || "Customer"}"`,
        `"${user.phone || "—"}"`,
        `"${booking.bookingCode || "—"}"`,
        `"${venue.venueName || venue.name || "Pitch"}"`,
        p.amount || 0,
        p.refundedAmount || 0,
        `"${p.status}"`,
        `"${new Date(p.createdAt || "").toLocaleString()}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paymob-online-transactions-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "paid":
        return <Badge color="success" size="sm">Paid / Settled</Badge>;
      case "partially_paid":
        return <Badge color="warning" size="sm">Deposit Paid</Badge>;
      case "pending":
      case "unpaid":
        return <Badge color="warning" size="sm">Pending Gateway</Badge>;
      case "refunded":
        return <Badge color="error" size="sm">Refunded</Badge>;
      case "failed":
        return <Badge color="error" size="sm">Failed</Badge>;
      default:
        return <Badge color="light" size="sm">{status}</Badge>;
    }
  };

  return (
    <>
      <PageMeta
        title="Paymob Online Transactions | San Siro"
        description="Dedicated ledger for Paymob online credit/debit card payments and gateway settlements."
      />
      <PageBreadcrumb pageTitle="Paymob Transactions" />

      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Paymob Online Transactions
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Paymob Gateway
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Dedicated ledger strictly for online card payments processed via Paymob.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={fetchPayments} size="sm" variant="outline" disabled={loading}>
              🔄 {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button onClick={handleExportCSV} size="sm" variant="outline">
              <DownloadIcon className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button onClick={() => window.print()} size="sm">
              🖨️ Print Sheet
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Gateway Volume
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <DollarLineIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-gray-900 dark:text-white font-mono">
              {metrics.settledVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Across {metrics.paidCount + metrics.partiallyPaidCount} successful settlements
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Full Settlements
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/15 dark:text-success-400">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-success-600 dark:text-success-400 font-mono">
              {metrics.paidCount}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Paid in full via Paymob Card
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Deposits Paid
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {metrics.partiallyPaidCount}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Partial deposit paid online
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Total Refunded
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400">
                <DollarLineIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-black text-red-600 dark:text-red-400 font-mono">
              {metrics.totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Reversed online transactions
            </p>
          </div>
        </div>

        {/* Filters and Date Pickers Bar */}
        <div className="relative z-40 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search Txn ID, Order ID, Booking Code, Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-3.5 py-2 text-xs text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Date Pickers (From / To) */}
            <div className="flex items-center gap-2">
              <div className="w-36">
                <ModernDatePicker
                  value={dateRange.start}
                  onChange={(val) => setDateRange((prev) => ({ ...prev, start: val }))}
                  placeholder="From Date"
                  variant="compact"
                />
              </div>
              <span className="text-xs text-gray-400">to</span>
              <div className="w-36">
                <ModernDatePicker
                  value={dateRange.end}
                  onChange={(val) => setDateRange((prev) => ({ ...prev, end: val }))}
                  placeholder="To Date"
                  variant="compact"
                  align="right"
                />
              </div>
              {(dateRange.start || dateRange.end) && (
                <button
                  onClick={handleResetDates}
                  className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition cursor-pointer"
                  title="Clear Date Filters"
                >
                  ✕ Clear
                </button>
              )}
            </div>

            {/* Status Tabs Selector */}
            <div className="flex flex-wrap items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {["ALL", "PAID", "PARTIALLY_PAID", "PENDING", "REFUNDED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === tab
                      ? "bg-white text-brand-600 shadow-xs dark:bg-gray-700 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab === "PARTIALLY_PAID" ? "Deposits" : tab.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/80 font-bold uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-5 py-3.5">Paymob Txn ID / Order</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Pitch / Booking</th>
                  <th className="px-5 py-3.5">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Date & Time</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400">
                      {loading
                        ? "Loading Paymob gateway transactions..."
                        : "No Paymob online records found matching your filters."}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const user = typeof p.userId === "object" && p.userId ? p.userId : {};
                    const booking = typeof p.bookingId === "object" && p.bookingId ? p.bookingId : {};
                    const venue =
                      typeof booking.venueId === "object" && booking.venueId
                        ? booking.venueId
                        : typeof p.venueId === "object" && p.venueId
                        ? p.venueId
                        : {};
                    const dateFormatted = p.createdAt ? new Date(p.createdAt).toLocaleString() : "—";
                    const txDisplay = String(p.transactionId || p.paymobTransactionId || p._id || "");
                    const safeId = String(p._id || p.id || txDisplay);

                    return (
                      <tr key={safeId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        {/* Txn ID / Order ID */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-900 dark:text-white">
                            <span>{txDisplay}</span>
                            <button
                              onClick={() => handleCopy(txDisplay, safeId)}
                              className="text-gray-400 hover:text-brand-500 p-0.5 cursor-pointer"
                              title="Copy ID"
                            >
                              <CopyIcon className="w-3.5 h-3.5" />
                            </button>
                            {copiedId === safeId && (
                              <span className="text-[10px] text-emerald-500 font-sans">Copied!</span>
                            )}
                          </div>
                          {p.paymobOrderId && (
                            <div className="text-[11px] font-mono text-blue-500 mt-0.5">
                              Order #{p.paymobOrderId}
                            </div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-gray-900 dark:text-white text-xs">
                            {user.userName || user.name || "Customer"}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">{user.phone || user.email || "—"}</p>
                        </td>

                        {/* Pitch / Booking Code */}
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                            {venue.venueName || venue.name || "Sports Pitch"}
                          </p>
                          {booking.bookingCode && (
                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono text-brand-600 font-bold mt-0.5">
                              {booking.bookingCode}
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-3.5">
                          <span className="font-black text-sm font-mono text-emerald-600 dark:text-emerald-400">
                            {Number(p.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                          </span>
                          {p.refundedAmount && p.refundedAmount > 0 ? (
                            <p className="text-[10px] text-red-500 font-mono mt-0.5">
                              Refunded: -{p.refundedAmount} EGP
                            </p>
                          ) : null}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {getStatusBadge(p.status)}
                        </td>

                        {/* Date & Time */}
                        <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {dateFormatted}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTx(p);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTx(p);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400 transition cursor-pointer"
                              title="Print Receipt"
                            >
                              Receipt
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
        </div>
      </div>

      {/* ─── TRANSACTION DETAILS MODAL ─── */}
      {selectedTx && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          className="max-w-xl p-6 bg-white dark:bg-gray-800/95 backdrop-blur-md"
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700/80">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Paymob Transaction Details
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  Txn ID: {selectedTx.transactionId || selectedTx.paymobTransactionId || selectedTx._id}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 space-y-3">
              {/* Financial Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                    Amount Settled
                  </span>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {Number(selectedTx.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                  </div>
                </div>
                <div className="text-right">
                  {getStatusBadge(selectedTx.status)}
                </div>
              </div>

              {/* Grid Properties */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Customer</span>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {typeof selectedTx.userId === "object" && selectedTx.userId
                      ? selectedTx.userId?.userName || selectedTx.userId?.name
                      : "Customer"}
                  </p>
                  <p className="text-gray-500 font-mono text-[11px]">
                    {typeof selectedTx.userId === "object" && selectedTx.userId ? selectedTx.userId?.phone || selectedTx.userId?.email : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Pitch / Booking</span>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {typeof selectedTx.bookingId === "object" &&
                    selectedTx.bookingId &&
                    typeof selectedTx.bookingId?.venueId === "object" &&
                    selectedTx.bookingId?.venueId
                      ? selectedTx.bookingId.venueId.venueName || selectedTx.bookingId.venueId.name
                      : typeof selectedTx.venueId === "object" && selectedTx.venueId
                      ? selectedTx.venueId.venueName || selectedTx.venueId.name
                      : "Pitch"}
                  </p>
                  <p className="text-brand-600 font-mono font-bold text-[11px]">
                    Code: {typeof selectedTx.bookingId === "object" && selectedTx.bookingId ? selectedTx.bookingId?.bookingCode : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Paymob Order ID</span>
                  <p className="font-bold font-mono text-gray-900 dark:text-white mt-0.5">
                    {selectedTx.paymobOrderId || "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Paymob Transaction ID</span>
                  <p className="font-bold font-mono text-gray-900 dark:text-white mt-0.5">
                    {selectedTx.paymobTransactionId || "—"}
                  </p>
                </div>
              </div>

              {/* Timestamp Details */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs flex justify-between">
                <span className="text-gray-400">Created Timestamp:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : "—"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
              >
                Close
              </button>
              <Button
                size="sm"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setIsReceiptModalOpen(true);
                }}
              >
                🖨️ Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── PRINTABLE RECEIPT MODAL ─── */}
      {selectedTx && (
        <Modal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          className="max-w-md p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl"
        >
          <div id="printable-receipt" className="text-gray-900 dark:text-white">
            <div className="text-center pb-4 border-b border-dashed border-gray-300 dark:border-gray-700">
              <h2 className="text-xl font-black tracking-wider uppercase">SAN SIRO</h2>
              <p className="text-xs text-gray-500">Official Paymob Online Payment Voucher</p>
              <p className="text-[10px] text-gray-400 font-mono mt-1">
                Receipt #{selectedTx.transactionId || selectedTx._id}
              </p>
            </div>

            <div className="py-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-mono font-bold">
                  {selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleDateString() : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Customer:</span>
                <span className="font-bold">
                  {typeof selectedTx.userId === "object" && selectedTx.userId
                    ? selectedTx.userId?.userName || selectedTx.userId?.name
                    : "Customer"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Pitch / Venue:</span>
                <span className="font-bold">
                  {typeof selectedTx.bookingId === "object" &&
                  selectedTx.bookingId &&
                  typeof selectedTx.bookingId?.venueId === "object" &&
                  selectedTx.bookingId?.venueId
                    ? selectedTx.bookingId.venueId.venueName || selectedTx.bookingId.venueId.name
                    : typeof selectedTx.venueId === "object" && selectedTx.venueId
                    ? selectedTx.venueId.venueName || selectedTx.venueId.name
                    : "Pitch"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Booking Code:</span>
                <span className="font-mono font-black text-brand-600">
                  {typeof selectedTx.bookingId === "object" && selectedTx.bookingId ? selectedTx.bookingId?.bookingCode : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Payment Gateway:</span>
                <span className="font-bold uppercase text-blue-600">Paymob Online Card</span>
              </div>

              <div className="pt-3 border-t border-dashed border-gray-300 dark:border-gray-700 flex justify-between items-center text-sm font-black">
                <span>TOTAL PAID:</span>
                <span className="text-emerald-600 font-mono text-base">
                  {Number(selectedTx.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                </span>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-dashed border-gray-300 dark:border-gray-700 text-[11px] text-gray-400">
              <p className="font-bold text-gray-600 dark:text-gray-300">Thank you for booking with San Siro!</p>
              <p className="mt-0.5">Paymob electronic receipt for pitch reservation.</p>
            </div>

            <div className="mt-6 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
              >
                Close
              </button>
              <Button
                size="sm"
                onClick={() => {
                  window.print();
                }}
              >
                🖨️ Print Now
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
