import { useState } from "react";
import { Modal } from "../../ui/modal";
import { Booking } from "../../../types";
import { bookingApi } from "../../../services/api/bookingApi";
import { getId } from "../../../utils/booking";

export function CancelBookingModal({
  booking,
  onClose,
  onCancelled,
}: {
  booking: Booking | null;
  onClose: () => void;
  onCancelled: () => void | Promise<void>;
}) {
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);

  if (!booking) return null;

  const handleConfirm = async () => {
    setError("");
    setCancelling(true);
    try {
      await bookingApi.cancelBooking(getId(booking));
      await onCancelled();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to cancel booking.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Modal isOpen={!!booking} onClose={onClose} className="max-w-sm p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white text-center">
      <span className="text-3xl mb-2 inline-block" aria-hidden>⚠️</span>
      <h3 className="text-base font-bold mb-2">Cancel Reservation?</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        This will release the slot for #{booking.bookingCode} across mobile devices and process a wallet refund if applicable.
      </p>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium text-left">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onClose} className="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700">
          No, Keep
        </button>
        <button onClick={handleConfirm} disabled={cancelling} className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold disabled:opacity-50">
          {cancelling ? "Cancelling..." : "Confirm Cancel"}
        </button>
      </div>
    </Modal>
  );
}
