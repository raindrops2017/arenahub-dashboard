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

      <div className="space-y-2">
        <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Update Lifecycle Status</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={updating}
            onClick={() => updateStatus("confirmed", "paid")}
            className="p-2 rounded-lg bg-blue-100 dark:bg-blue-600/30 hover:bg-blue-200 dark:hover:bg-blue-600/50 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs font-bold disabled:opacity-50"
          >
            ✓ Confirm & Paid
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => updateStatus("completed", "paid")}
            className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-600/30 hover:bg-emerald-200 dark:hover:bg-emerald-600/50 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold disabled:opacity-50"
          >
            ★ Mark Completed
          </button>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
          <button type="button" onClick={() => onRequestCancel(booking)} className="text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-500 py-1">
            Cancel Booking & Refund
          </button>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
