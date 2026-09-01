import { useState } from "react";
import { Modal } from "../../ui/modal";
import { Booking } from "../../../types";
import { bookingApi } from "../../../services/api/bookingApi";
import { fmt, getId } from "../../../utils/booking";
import { StatusBadge } from "../StatusBadge";

export function ManageBookingModal({
  booking,
  onClose,    
  onUpdated,
  onRequestCancel,
}: {
  booking: Booking | null;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
  onRequestCancel: (booking: Booking) => void;
}) {
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  if (!booking) return null;

  const updateStatus = async (status: string, paymentStatus?: string) => {
    setError("");
    setUpdating(true);
    try {
      await bookingApi.updateStatus(getId(booking), { status, paymentStatus });
      await onUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update booking status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal isOpen={!!booking} onClose={onClose} className="max-w-md p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700/80">
        <div>
          <h3 className="text-base font-bold">Booking #{booking.bookingCode}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">{booking.venueName}</p>
        </div>
        <StatusBadge status={booking.status} className="text-xs px-2 py-0.5" />
      </div>

      <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 mb-6 bg-gray-50 dark:bg-gray-800/90 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80">
        <div>
          <strong className="text-gray-500 dark:text-gray-400">Customer:</strong> {booking.customerName} ({booking.customerPhone})
        </div>
        <div>
          <strong className="text-gray-500 dark:text-gray-400">Slot:</strong> {booking.startTime} - {booking.endTime} on {booking.date}
        </div>
        <div>
          <strong className="text-gray-500 dark:text-gray-400">Total Price:</strong> {fmt(booking.price || booking.totalPrice || 0)}
        </div>
        <div className="flex items-center gap-2">
          <span>
            <strong className="text-emerald-600 dark:text-emerald-400">Paid Amount:</strong> {fmt(booking.paidAmount ?? 0)}
          </span>
          <span>•</span>
          <span>
            <strong className="text-amber-600 dark:text-amber-400">Remaining Due:</strong> {fmt(booking.remainingAmount || 0)}
          </span>
        </div>
        <div>
          <strong className="text-gray-500 dark:text-gray-400">Payment Status:</strong> {booking.paymentStatus} ({booking.paymentMethod})
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
          {error}
        </div>
      )}

      {(() => {
        const normStatus = (booking.status || "").toLowerCase();
        const isCompleted = normStatus === "completed";
        const isCancelled = normStatus === "cancelled";
        const isNoShow = normStatus === "no_show" || normStatus === "no show";

        if (isCompleted) {
          return (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5">
                <span className="text-base">✓</span>
                <div>
                  <p className="font-bold">Reservation Completed</p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-normal mt-0.5">
                    This match has been checked in and completed. No further lifecycle or cancellation actions can be taken.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          );
        }

        if (isCancelled) {
          return (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5">
                <span className="text-base">⛔</span>
                <div>
                  <p className="font-bold">Reservation Cancelled</p>
                  <p className="text-[11px] text-rose-700 dark:text-rose-400 font-normal mt-0.5">
                    This booking has been cancelled and slot released. No further actions permitted.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          );
        }

        if (isNoShow) {
          return (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300 text-xs font-semibold flex items-center gap-2.5">
                <span className="text-base">⚠️</span>
                <div>
                  <p className="font-bold">Customer No-Show</p>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400 font-normal mt-0.5">
                    This booking was flagged as No-Show. The match slot has ended and deposits retained.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          );
        }

        const bPrice = Number(booking.finalPrice ?? booking.price ?? booking.totalPrice ?? 0);
        const bPaid = Number(booking.paidAmount ?? 0);
        const remainingDue =
          booking.remainingAmount !== undefined && booking.remainingAmount !== null && booking.remainingAmount > 0
            ? booking.remainingAmount
            : Math.max(0, bPrice - bPaid);
        const hasOutstanding = remainingDue > 0 && booking.paymentStatus !== "paid";

        const isSlotUpcoming = (() => {
          if (!booking.date) return false;
          const today = new Date();
          const bDate = new Date(booking.date);
          const startH = typeof booking.startTime === "number" ? booking.startTime : parseInt(String(booking.startTime), 10) || 0;
          const slotStart = new Date(bDate.getFullYear(), bDate.getMonth(), bDate.getDate(), startH, 0, 0);
          return slotStart > today;
        })();

        return (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Booking Actions & Lifecycle
            </div>

            <div className="space-y-2">
              {hasOutstanding ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => updateStatus("confirmed", "paid")}
                    className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition disabled:opacity-50 flex flex-col items-center justify-center text-center gap-0.5"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">
                      {isSlotUpcoming ? "Advance Settlement" : "Pay & Confirm"}
                    </span>
                    <span>💵 Collect {fmt(remainingDue)} & Confirm</span>
                  </button>

                  <button
                    type="button"
                    disabled={updating}
                    onClick={() => updateStatus("completed", "paid")}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 flex flex-col items-center justify-center text-center gap-0.5"
                  >
                    <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-semibold">
                      {isSlotUpcoming ? "Check-In Early" : "Settle & Complete"}
                    </span>
                    <span>★ Collect {fmt(remainingDue)} & Complete</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={updating || booking.status === "confirmed"}
                    onClick={() => updateStatus("confirmed", "paid")}
                    className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-600/30 hover:bg-blue-200 dark:hover:bg-blue-600/50 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs font-bold transition disabled:opacity-50"
                  >
                    ✓ {booking.status === "confirmed" ? "Confirmed" : "Confirm Booking"}
                  </button>
                  <button
                    type="button"
                    disabled={updating || booking.status === "completed"}
                    onClick={() => updateStatus("completed", "paid")}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                  >
                    ★ Mark Completed
                  </button>
                </div>
              )}

              {/* No-Show Quick Action if slot is confirmed or pending */}
              <button
                type="button"
                disabled={updating}
                onClick={() => updateStatus("no_show")}
                className="w-full py-1.5 px-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium transition text-center"
              >
                ⚠️ Mark as Customer No-Show
              </button>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onRequestCancel(booking)}
                className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-500 py-1"
              >
                Cancel Booking & Refund
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
    </Modal>
  );
}
