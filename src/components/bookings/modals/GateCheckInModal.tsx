import { useState } from "react";
import { Modal } from "../../ui/modal";
import { Booking } from "../../../types";
import { bookingApi } from "../../../services/api/bookingApi";
import { fmt, getId } from "../../../utils/booking";

export function GateCheckInModal({
  isOpen,
  onClose,
  onCompleted,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: () => void | Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ valid: boolean; booking: Booking } | null>(null);

  const handleClose = () => {
    setCode("");
    setError("");
    setResult(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await bookingApi.verifyBookingCode(code.trim());
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid booking code or reservation not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCheckIn = async () => {
    if (!result) return;
    await bookingApi.updateStatus(getId(result.booking), { status: "completed", paymentStatus: "paid" });
    await onCompleted();
    handleClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white">
      <h3 className="text-lg font-bold">Gate Ticket Verification</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Scan QR or enter 6-character booking code</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="e.g. AB12CD"
          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600 text-sm font-mono uppercase text-center tracking-widest text-gray-900 dark:text-white"
        />
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition disabled:opacity-50">
          {loading ? "Verifying Ticket..." : "Verify Ticket Code"}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
          {error}
        </div>
      )}

      {result && (() => {
        const userObj: any = result.booking.userId;
        const userStatus = typeof userObj === "object" ? userObj?.status : undefined;
        const userStatusReason = typeof userObj === "object" ? userObj?.statusReason : undefined;
        const isOnHold = userStatus === "hold" || userStatus === "On Hold";
        const isSuspended = userStatus === "suspended" || userStatus === "Suspended";

        return (
          <div className="mt-5 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">STATUS:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.valid ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-500/20 text-red-700 dark:text-red-400"}`}>
                {result.valid ? "VALID TICKET" : "INVALID / CANCELLED"}
              </span>
            </div>

            {/* High-Visibility Amber Banner for On Hold Player */}
            {isOnHold && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  <span>⚠️</span>
                  <span>PLAYER STATUS: ON HOLD</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                  Reason: {userStatusReason || "Account flagged by administration. Verify player identity & settlement at gate."}
                </p>
              </div>
            )}

            {/* High-Visibility Red Banner for Suspended Player */}
            {isSuspended && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 text-xs">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                  <span>⛔</span>
                  <span>PLAYER STATUS: SUSPENDED</span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-red-800 dark:text-red-300">
                  Reason: {userStatusReason || "Account suspended by administration."}
                </p>
              </div>
            )}

            <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
              <div>
                <strong className="text-gray-500 dark:text-gray-400">Customer:</strong> {result.booking.customerName} ({result.booking.customerPhone})
              </div>
              <div>
                <strong className="text-gray-500 dark:text-gray-400">Venue:</strong> {result.booking.venueName}
              </div>
              <div>
                <strong className="text-gray-500 dark:text-gray-400">Slot Time:</strong> {result.booking.startTime} - {result.booking.endTime} ({result.booking.date})
              </div>
              <div>
                <strong className="text-gray-500 dark:text-gray-400">Total Price:</strong> {fmt(result.booking.price || result.booking.totalPrice || 0)}
              </div>
              <div className="flex items-center gap-2">
                <span>
                  <strong className="text-emerald-600 dark:text-emerald-400">Paid:</strong> {fmt(result.booking.paidAmount ?? 0)}
                </span>
                <span>•</span>
                <span>
                  <strong className="text-amber-600 dark:text-amber-400">Due at Venue:</strong> {fmt(result.booking.remainingAmount || 0)}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">({result.booking.paymentStatus})</span>
              </div>
            </div>
            {result.valid && (
              <button type="button" onClick={handleCompleteCheckIn} className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition">
                ✓ Confirm Gate Check-In & Complete
              </button>
            )}
          </div>
        );
      })()}
    </Modal>
  );
}
