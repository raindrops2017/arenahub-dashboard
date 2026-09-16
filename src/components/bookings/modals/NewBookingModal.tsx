import { useEffect, useState, useMemo, useRef } from "react";
import { Modal } from "../../ui/modal";
import { CustomerUser, PaymentMethod, Venue } from "../../../types";
import { bookingApi } from "../../../services/api/bookingApi";
import { customerApi } from "../../../services/api/customerApi";
import { getId, formatHour } from "../../../utils/booking";
import { ModernDatePicker } from "../../ui/ModernDatePicker";
import { ModernTimePicker } from "../../ui/ModernTimePicker";
import { Search, UserPlus, Users, X, Check, Phone, User, Calendar, Clock } from "lucide-react";

export interface NewBookingDefaults {
  venueId: string;
  date: string;
  startHour: number;
  endHour?: number;
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
  const [endHour, setEndHour] = useState(defaults.endHour ?? defaults.startHour + 1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash" as PaymentMethod);
  const [coupon, setCoupon] = useState("");

  // Customer state: 'existing' with searchable dropdown OR 'new' with inline creation
  const [customerType, setCustomerType] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // New customer inputs
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setVenueId(defaults.venueId || (venues.length > 0 ? getId(venues[0]) : ""));
      setDate(defaults.date);
      setStartHour(defaults.startHour);
      setEndHour(defaults.endHour ?? defaults.startHour + 1);
      setFormError("");
      setCustomerType("existing");
      setCustomerId("");
      setCustomerSearch("");
      setCustomerName("");
      setCustomerPhone("");
      setIsDropdownOpen(false);
    }
  }, [isOpen, defaults.venueId, defaults.date, defaults.startHour, defaults.endHour, venues]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter existing customers by name or phone
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return customers.slice(0, 30);
    return customers
      .filter((c) => {
        const name = (c.userName || c.name || "").toLowerCase();
        const phone = (c.phone || "").toLowerCase();
        return name.includes(q) || phone.includes(q);
      })
      .slice(0, 30);
  }, [customers, customerSearch]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => getId(c) === customerId),
    [customers, customerId]
  );

  const selectedVenue = useMemo(
    () => venues.find((v) => getId(v) === venueId),
    [venues, venueId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!venueId) {
      setFormError("Please select a sports venue / pitch.");
      return;
    }
    if (customerType === "new" && (!customerName.trim() || !customerPhone.trim())) {
      setFormError("Please provide both name and phone number for the new customer.");
      return;
    }

    setSubmitting(true);
    try {
      let finalCustomerId = customerType === "existing" ? (customerId || undefined) : undefined;

      if (customerType === "new") {
        const newCustomer = await customerApi.createCustomer({
          userName: customerName.trim(),
          phone: customerPhone.trim(),
        });
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
    "w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition";
  const labelClass = "block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-xl p-6 bg-white dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white shadow-2xl rounded-2xl"
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100 dark:border-gray-700/70">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span>🏟️</span> New Pitch Slot Reservation
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Book match slot directly with customer details and instant confirmation
          </p>
        </div>
      </div>

      {/* Selected Slot Information Pill */}
      <div className="mb-4 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-100 font-medium">
          <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>{date || "Today"}</span>
          <span className="text-blue-300 dark:text-blue-700">•</span>
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-mono font-bold">
            {formatHour(startHour)} – {formatHour(endHour)}
          </span>
        </div>
        {selectedVenue && (
          <span className="font-bold text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-[11px]">
            {selectedVenue.venueName || selectedVenue.name}
          </span>
        )}
      </div>

      {formError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
          ⚠️ {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sports Venue Dropdown */}
        <div>
          <label className={labelClass}>Sports Pitch / Venue</label>
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className={inputClass}
          >
            {venues.map((v) => (
              <option key={getId(v)} value={getId(v)}>
                {v.venueName || v.name} {v.defaultHourPrice ? `— ${v.defaultHourPrice} EGP/hr` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Selection Section */}
        <div className="p-3.5 rounded-xl bg-gray-50/90 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-brand-500" />
              Customer Information
            </label>

            {customerType === "existing" ? (
              <button
                type="button"
                onClick={() => {
                  setCustomerType("new");
                  setCustomerId("");
                  setCustomerSearch("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 text-brand-600 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 transition cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                + Add New Customer
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomerType("existing");
                  setCustomerName("");
                  setCustomerPhone("");
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition cursor-pointer"
              >
                ← Select Existing Customer
              </button>
            )}
          </div>

          {customerType === "existing" ? (
            <div ref={dropdownRef} className="relative">
              {selectedCustomer ? (
                // Selected Customer Card
                <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700/80 flex items-center justify-between gap-2 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                        {selectedCustomer.userName || selectedCustomer.name}
                        {selectedCustomer.status && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {selectedCustomer.status}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {selectedCustomer.phone || "No phone recorded"}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerId("");
                      setCustomerSearch("");
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Change customer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                // Searchable Input & Floating Dropdown
                <div className="relative">
                  <div className="relative">
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder="Search existing customer by name or phone..."
                      className={`${inputClass} pl-9`}
                    />
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch("")}
                        className="absolute right-3 top-3 text-xs text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden max-h-56 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/60">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-4 text-center text-xs text-gray-500 dark:text-gray-400">
                          <p>No customers match "{customerSearch}"</p>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomerType("new");
                              setCustomerName(customerSearch);
                              setIsDropdownOpen(false);
                            }}
                            className="mt-2 text-xs font-bold text-brand-600 hover:underline"
                          >
                            + Create customer "{customerSearch}"
                          </button>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={getId(c)}
                            onClick={() => {
                              setCustomerId(getId(c));
                              setIsDropdownOpen(false);
                              setCustomerSearch("");
                            }}
                            className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer transition flex items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {c.userName || c.name}
                              </div>
                              <div className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                                {c.phone || "No phone"}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {c.status && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                  {c.status}
                                </span>
                              )}
                              {getId(c) === customerId && (
                                <Check className="w-4 h-4 text-brand-500" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    Optional: leave unselected to record as venue admin walk-in
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Inline Add New Customer Form
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  placeholder="e.g. Omar Khaled"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  required
                  placeholder="e.g. 01012345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}
        </div>

        {/* Date & Time Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Reservation Date</label>
            <ModernDatePicker
              value={date}
              onChange={setDate}
              placeholder="Pick Match Date"
              variant="compact"
            />
          </div>

          <div>
            <label className={labelClass}>Start Hour (Slot)</label>
            <ModernTimePicker
              value={startHour}
              onChange={(st) => {
                const hourNum = Number(st);
                setStartHour(hourNum);
                if (endHour <= hourNum) {
                  setEndHour(hourNum + 1);
                }
              }}
              minHour={0}
              maxHour={23}
              variant="compact"
            />
          </div>
        </div>

        {/* Duration / End Time Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>End Hour (Duration)</label>
            <select
              value={endHour}
              onChange={(e) => setEndHour(Number(e.target.value))}
              className={inputClass}
            >
              {[1, 2, 3, 4].map((dur) => {
                const targetH = Math.min(24, startHour + dur);
                return (
                  <option key={dur} value={targetH}>
                    {formatHour(targetH)} ({dur} {dur === 1 ? "hour" : "hours"})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelClass}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className={inputClass}
            >
              <option value="cash">Cash at Venue</option>
              <option value="wallet">Digital Wallet</option>
              <option value="Credit Card">Credit Card</option>
            </select>
          </div>
        </div>

        {/* Promo Coupon */}
        <div>
          <label className={labelClass}>Promo Coupon (Optional)</label>
          <input
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="e.g. PROMO20"
            className={`${inputClass} uppercase font-mono`}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold cursor-pointer transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 cursor-pointer shadow-md transition"
          >
            {submitting ? "Reserving Slot..." : "Confirm Reservation"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NewBookingModal;
