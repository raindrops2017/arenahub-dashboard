import { useEffect, useState } from "react";
import { Modal } from "../../ui/modal";
import { CustomerUser, PaymentMethod, Venue } from "../../../types";
import { bookingApi } from "../../../services/api/bookingApi";
import { customerApi } from "../../../services/api/customerApi";
import { getId } from "../../../utils/booking";

export interface NewBookingDefaults {
  venueId: string;
  date: string;
  startHour: number;
}

export function NewBookingModal({
  isOpen,
  onClose,
  onCreated,
  venues,
  customers,
  defaults,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void | Promise<void>;
  venues: Venue[];
  customers: CustomerUser[];
  defaults: NewBookingDefaults;
}) {
  const [venueId, setVenueId] = useState(defaults.venueId);
  const [date, setDate] = useState(defaults.date);
  const [startHour, setStartHour] = useState(defaults.startHour);
  const [endHour, setEndHour] = useState(defaults.startHour + 1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash" as PaymentMethod);
  const [coupon, setCoupon] = useState("");
  const [customerType, setCustomerType] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setVenueId(defaults.venueId || (venues.length > 0 ? getId(venues[0]) : ""));
      setDate(defaults.date);
      setStartHour(defaults.startHour);
      setEndHour(defaults.startHour + 1);
      setFormError("");
    }
  }, [isOpen, defaults.venueId, defaults.date, defaults.startHour, venues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!venueId) {
      setFormError("Please select a sports venue.");
      return;
    }
    if (customerType === "new" && (!customerName || !customerPhone)) {
      setFormError("Please provide customer name and phone.");
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = customerType === "existing" ? customerId : undefined;
      if (customerType === "new") {
        const newCustomer = await customerApi.createCustomer({ userName: customerName, phone: customerPhone });
        finalCustomerId = getId(newCustomer);
      }

      await bookingApi.createBooking({
        venueId,
        date,
        startTime: startHour,
        endTime: endHour,
        couponCode: coupon.trim() || undefined,
        paymentMethod: (paymentMethod as string).toLowerCase(),
        customerId: finalCustomerId,
      });
      await onCreated();
      onClose();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800/90 border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-white";
  const labelClass = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white">
      <h3 className="text-lg font-bold mb-1">Create Venue Slot Reservation</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">Reserve slot directly on live system</p>

      {formError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Sports Venue</label>
          <select value={venueId} onChange={(e) => setVenueId(e.target.value)} className={inputClass}>
            {venues.map((v) => (
              <option key={getId(v)} value={getId(v)}>
                {v.venueName || v.name} - {v.defaultHourPrice} EGP/hr
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600/50">
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Customer Selection</label>
          <div className="flex items-center gap-4 mb-3">
            {(["existing", "new"] as const).map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="customerSelectionType"
                  checked={customerType === t}
                  onChange={() => setCustomerType(t)}
                  className="accent-blue-600"
                />
                {t === "existing" ? "Select Existing" : "New Customer"}
              </label>
            ))}
          </div>

          {customerType === "existing" ? (
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}>
              <option value="">-- Optional (Admin self) --</option>
              {customers.map((c) => (
                <option key={getId(c)} value={getId(c)}>
                  {c.userName} ({c.phone})
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <input required placeholder="Full Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={inputClass} />
              <input required placeholder="Phone Number" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className={inputClass} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Start Hour (24h)</label>
            <input
              type="number"
              min={6}
              max={23}
              value={startHour}
              onChange={(e) => {
                const st = Number(e.target.value);
                setStartHour(st);
                setEndHour(st + 1);
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className={inputClass}>
              <option value="cash">Cash at Venue</option>
              <option value="wallet">Digital Wallet</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Promo Coupon (Optional)</label>
            <input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value.toUpperCase())}
              placeholder="e.g. PROMO20"
              className={`${inputClass} uppercase font-mono`}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/80">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-50">
            {submitting ? "Reserving..." : "Create Reservation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
