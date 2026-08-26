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
  CalenderIcon,
  CopyIcon,
} from "../icons";
import { Payment } from "../types";
import { paymentApi } from "../services/api/paymentApi";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";

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

  // Initialize Flatpickr Date-Range Picker
  useEffect(() => {
    const picker = flatpickr("#paymob-date-range", {
      mode: "range",
      dateFormat: "Y-m-d",
      defaultDate: undefined,
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          const start = selectedDates[0].toISOString().split("T")[0];
          const end = selectedDates[1].toISOString().split("T")[0];
          setDateRange({ start, end });
        } else if (selectedDates.length === 0) {
          setDateRange({ start: "", end: "" });
        }
      },
    });

    return () => {
      if (!Array.isArray(picker)) {
        picker.destroy();
      }
    };
  }, []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getAllPayments({
        startDate: dateRange.start || undefined,
        endDate: dateRange.end || undefined,
        status: statusFilter !== "ALL" ? statusFilter.toLowerCase() : undefined,
        search: searchQuery.trim() || undefined,
      });

      // Filter primarily for gateway payments (Paymob, card, or all online settlements)
      const allDocs = res.docs || [];
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

  // Filtered payments calculation
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Payment method check (highlight paymob/card)
      const matchesSearch =
        searchQuery === "" ||
        (p.transactionId && p.transactionId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.referenceId && p.referenceId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.paymobOrderId && String(p.paymobOrderId).includes(searchQuery)) ||
        (typeof p.userId === "object" && p.userId?.userName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (typeof p.bookingId === "object" && p.bookingId?.bookingCode?.toLowerCase().includes(searchQuery.toLowerCase()));

      const statusNorm = (p.status || "").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "PAID") {
        matchesStatus = statusNorm === "paid";
      } else if (statusFilter === "PARTIALLY_PAID") {
        matchesStatus = statusNorm === "partially_paid";
      } else if (statusFilter === "PENDING") {
        matchesStatus = statusNorm === "pending";
      } else if (statusFilter === "REFUNDED") {
        matchesStatus = statusNorm === "refunded" || (p.refundedAmount ?? 0) > 0;
      }

      return matchesSearch && matchesStatus;
    });
  }, [payments, searchQuery, statusFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = payments.length;
    const paidList = payments.filter((p) => (p.status || "").toLowerCase() === "paid");
    const partiallyPaidList = payments.filter((p) => (p.status || "").toLowerCase() === "partially_paid");
    const totalVolume = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const settledVolume = payments
      .filter((p) => ["paid", "partially_paid"].includes((p.status || "").toLowerCase()))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalRefunded = payments.reduce((sum, p) => sum + (p.refundedAmount || 0), 0);

    return {
      totalCount,
      paidCount: paidList.length,
      partiallyPaidCount: partiallyPaidList.length,
      totalVolume,
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
      "Transaction ID",
      "Reference ID",
      "Paymob Order ID",
      "Customer Name",
      "Customer Phone",
      "Booking Code",
      "Venue",
      "Amount (EGP)",
      "Refunded (EGP)",
      "Status",
      "Payment Method",
      "Created At",
    ];

    const rows = filteredPayments.map((p) => {
      const user = typeof p.userId === "object" ? p.userId : {};
      const booking = typeof p.bookingId === "object" ? p.bookingId : {};
      const venue = typeof booking.venueId === "object" ? booking.venueId : {};

      return [
        `"${p.transactionId || p._id}"`,
        `"${p.referenceId || "—"}"`,
        `"${p.paymobOrderId || "—"}"`,
        `"${user.userName || user.name || "Customer"}"`,
        `"${user.phone || "—"}"`,
        `"${booking.bookingCode || "—"}"`,
        `"${venue.venueName || venue.name || "Sports Venue"}"`,
        p.amount || 0,
        p.refundedAmount || 0,
        `"${p.status}"`,
        `"${p.paymentMethod}"`,
        `"${new Date(p.createdAt || "").toLocaleString()}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `paymob-transactions-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Table View
  const handlePrintTable = () => {
    window.print();
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
        title="Paymob Transactions & Online Settlements | VenueOps Dashboard"
        description="Read-only Paymob gateway transactions ledger with date range picker, printable receipts, and CSV export."
      />
      <PageBreadcrumb pageTitle="Paymob Transactions" />

      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Paymob Transactions Ledger
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Paymob Gateway (Read-Only)
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Audit digital gateway transactions, inspect Paymob order references, export financial data, or print customer receipts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={fetchPayments} size="sm" variant="outline" disabled={loading}>
              🔄 {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button onClick={handleExportCSV} size="sm" variant="outline">
              <DownloadIcon className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button onClick={handlePrintTable} size="sm">
              🖨️ Print Sheet
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Total Gateway Volume
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <DollarLineIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-800 dark:text-white font-mono">
              {metrics.settledVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Across {metrics.paidCount + metrics.partiallyPaidCount} successful settlements
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Full Settlements (100%)
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/15 dark:text-success-400">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-success-600 dark:text-success-400 font-mono">
              {metrics.paidCount} Transactions
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Paid in full via Paymob / Card
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Deposits / Partial Paid
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {metrics.partiallyPaidCount} Deposits
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Remainder due at venue reception
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Total Refunded
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400">
                <DollarLineIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-red-600 dark:text-red-400 font-mono">
              {metrics.totalRefunded.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Reversed transactions
            </p>
          </div>
        </div>

        {/* Filter and Date-Range Picker Bar */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Search by Transaction ID, Reference, Booking Code, or Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Flatpickr Date-Range Picker */}
            <div className="relative min-w-[240px]">
              <input
                id="paymob-date-range"
                type="text"
                placeholder="Select Date Range..."
                className="w-full rounded-xl border border-gray-300 bg-transparent pl-4 pr-10 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
              <CalenderIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Status Tabs Selector */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {["ALL", "PAID", "PARTIALLY_PAID", "PENDING", "REFUNDED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === tab
                      ? "bg-white text-brand-600 shadow-xs dark:bg-gray-700 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {tab.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/80 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Transaction / Reference</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Booking / Venue</th>
                  <th className="px-6 py-4">Amount Paid</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      {loading ? "Fetching Paymob transactions..." : "No payment records found matching your filters."}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const user = typeof p.userId === "object" ? p.userId : {};
                    const booking = typeof p.bookingId === "object" ? p.bookingId : {};
                    const venue = typeof booking.venueId === "object" ? booking.venueId : {};
                    const dateFormatted = p.createdAt ? new Date(p.createdAt).toLocaleString() : "—";
                    const txDisplay = p.transactionId || p.referenceId || p._id;

                    return (
                      <tr key={p._id || p.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-gray-900 dark:text-white">
                            <span>{txDisplay}</span>
                            <button
                              onClick={() => handleCopy(txDisplay, p._id)}
                              className="text-gray-400 hover:text-brand-500 p-0.5"
                              title="Copy ID"
                            >
                              <CopyIcon className="w-3.5 h-3.5" />
                            </button>
                            {copiedId === p._id && (
                              <span className="text-[10px] text-emerald-500 font-sans">Copied!</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-400 uppercase">
                              Method: {p.paymentMethod}
                            </span>
                            {p.paymobOrderId && (
                              <span className="text-[11px] font-mono text-blue-500">
                                Order #{p.paymobOrderId}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-900 dark:text-white text-xs">
                            {user.userName || user.name || "Customer"}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono">{user.phone || user.email || "—"}</p>
                        </td>

                        <td className="px-6 py-4">
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                            {venue.venueName || venue.name || "Sports Venue"}
                          </p>
                          {booking.bookingCode && (
                            <span className="inline-block px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px] font-mono text-brand-600 font-bold mt-0.5">
                              {booking.bookingCode}
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-black text-sm font-mono text-emerald-600 dark:text-emerald-400">
                            {Number(p.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                          </span>
                          {p.refundedAmount && p.refundedAmount > 0 ? (
                            <p className="text-[10px] text-red-500 font-mono">
                              Refunded: -{p.refundedAmount} EGP
                            </p>
                          ) : null}
                        </td>

                        <td className="px-6 py-4">
                          {getStatusBadge(p.status)}
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {dateFormatted}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedTx(p);
                                setIsDetailsModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTx(p);
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-50 text-brand-600 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-400 transition"
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
                  Transaction Audit Details
                </h3>
                <p className="text-xs text-gray-400 font-mono">
                  ID: {selectedTx.transactionId || selectedTx._id}
                </p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
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
                  <p className="text-[11px] text-gray-500 mt-1 uppercase font-bold">
                    Method: {selectedTx.paymentMethod}
                  </p>
                </div>
              </div>

              {/* Grid Properties */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Customer</span>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {typeof selectedTx.userId === "object"
                      ? selectedTx.userId?.userName || selectedTx.userId?.name
                      : "Customer"}
                  </p>
                  <p className="text-gray-500 font-mono text-[11px]">
                    {typeof selectedTx.userId === "object" ? selectedTx.userId?.phone || selectedTx.userId?.email : "—"}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                  <span className="text-gray-400 font-medium">Booking / Venue</span>
                  <p className="font-bold text-gray-900 dark:text-white mt-0.5">
                    {typeof selectedTx.bookingId === "object" && typeof selectedTx.bookingId?.venueId === "object"
                      ? selectedTx.bookingId.venueId.venueName
                      : "Venue"}
                  </p>
                  <p className="text-brand-600 font-mono font-bold text-[11px]">
                    Code: {typeof selectedTx.bookingId === "object" ? selectedTx.bookingId?.bookingCode : "—"}
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
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
            {/* Receipt Header */}
            <div className="text-center pb-4 border-b border-dashed border-gray-300 dark:border-gray-700">
              <h2 className="text-xl font-black tracking-wider uppercase">ARENAHUB</h2>
              <p className="text-xs text-gray-500">Official Payment Receipt & Voucher</p>
              <p className="text-[10px] text-gray-400 font-mono mt-1">
                Receipt #{selectedTx.transactionId || selectedTx._id}
              </p>
            </div>

            {/* Receipt Body */}
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
                  {typeof selectedTx.userId === "object"
                    ? selectedTx.userId?.userName || selectedTx.userId?.name
                    : "Customer"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Venue:</span>
                <span className="font-bold">
                  {typeof selectedTx.bookingId === "object" && typeof selectedTx.bookingId?.venueId === "object"
                    ? selectedTx.bookingId.venueId.venueName
                    : "Venue"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Booking Code:</span>
                <span className="font-mono font-black text-brand-600">
                  {typeof selectedTx.bookingId === "object" ? selectedTx.bookingId?.bookingCode : "—"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-500">Payment Gateway:</span>
                <span className="font-bold uppercase">Paymob / Card</span>
              </div>

              <div className="pt-3 border-t border-dashed border-gray-300 dark:border-gray-700 flex justify-between items-center text-sm font-black">
                <span>TOTAL PAID:</span>
                <span className="text-emerald-600 font-mono text-base">
                  {Number(selectedTx.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                </span>
              </div>
            </div>

            {/* Receipt Footer */}
            <div className="text-center pt-4 border-t border-dashed border-gray-300 dark:border-gray-700 text-[11px] text-gray-400">
              <p className="font-bold text-gray-600 dark:text-gray-300">Thank you for booking with ArenaHub!</p>
              <p className="mt-0.5">Please show this receipt or booking code at reception.</p>
            </div>

            {/* Print Trigger Button */}
            <div className="mt-6 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setIsReceiptModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
