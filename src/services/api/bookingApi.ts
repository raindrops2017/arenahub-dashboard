import api from "./apiClient";
import { Booking, BookingStatus, PaymentMethod, PaymentStatus } from "../../types";

export interface QueryBookingParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  date?: string;
}

export function formatTimeSlot(start: number, end: number): { startStr: string; endStr: string } {
  const pad = (h: number) => {
    const norm = h % 24;
    const ampm = norm >= 12 && norm < 24 ? "PM" : "AM";
    const displayHour = norm % 12 === 0 ? 12 : norm % 12;
    return `${displayHour}:00 ${ampm}`;
  };
  return { startStr: pad(start), endStr: pad(end) };
}

export function normalizeBooking(raw: any): Booking {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  const user = typeof raw.userId === "object" && raw.userId ? raw.userId : {};
  const venue = typeof raw.venueId === "object" && raw.venueId ? raw.venueId : {};

  const customerId = user._id || (typeof raw.userId === "string" ? raw.userId : raw.customerId || "");
  const customerName = user.userName || user.name || raw.customerName || "Customer";
  const customerPhone = user.phone || raw.customerPhone || "";
  const venueId = venue._id || (typeof raw.venueId === "string" ? raw.venueId : "");
  const venueName = venue.venueName || venue.name || raw.venueName || "Sports Venue";

  let dateStr = "";
  if (raw.date) {
    try {
      dateStr = new Date(raw.date).toISOString().split("T")[0];
    } catch {
      dateStr = String(raw.date);
    }
  }

  const startHour = typeof raw.startTime === "number" ? raw.startTime : parseInt(raw.startTime, 10) || 18;
  const endHour = typeof raw.endTime === "number" ? raw.endTime : parseInt(raw.endTime, 10) || startHour + 1;
  const { startStr, endStr } = formatTimeSlot(startHour, endHour);

  const price = Number(raw.finalPrice ?? raw.totalPrice ?? raw.price ?? 0);
  let paidAmount = 0;
  if (raw.paidAmount !== undefined && raw.paidAmount !== null) {
    paidAmount = Number(raw.paidAmount);
  } else if (raw.paymentStatus === 'paid' || raw.paymentStatus === 'Paid') {
    paidAmount = price;
  } else if (raw.paymentStatus === 'partially_paid' || raw.paymentStatus === 'Partially Paid') {
    paidAmount = Number(raw.paidAmount || (raw.discountAmount ? Math.max(0, price - raw.discountAmount) : Math.min(100, price)));
  } else {
    paidAmount = 0;
  }
  const remainingAmount = Math.max(0, Number((price - paidAmount).toFixed(2)));

  return {
    ...raw,
    _id: id,
    id: id,
    bookingCode: raw.bookingCode || "",
    venueId: venueId,
    venueName: venueName,
    userId: customerId,
    customerId: customerId,
    customerName: customerName,
    customerPhone: customerPhone,
    date: dateStr,
    startTime: startStr,
    endTime: endStr,
    slotId: `${venueId}-${dateStr}-${startHour}`,
    slots: [`${startHour}:00 - ${endHour}:00`],
    price: price,
    totalPrice: price,
    finalPrice: price,
    paidAmount: paidAmount,
    remainingAmount: remainingAmount,
    status: raw.status as BookingStatus,
    paymentStatus: raw.paymentStatus as PaymentStatus,
    paymentMethod: raw.paymentMethod as PaymentMethod,
    qrCode: raw.qrCode || "",
    expiresAt: raw.expiresAt || null,
    idempotencyKey: raw.idempotencyKey || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export interface VerifyBookingResponse {
  valid: boolean;
  booking: Booking;
}

export const bookingApi = {
  getVenueBookings: async (venueId: string, query?: QueryBookingParams): Promise<Booking[]> => {
    const res = await api.get<any>(`/booking/venue/${venueId}`, query);
    const docs = res && Array.isArray(res.data) ? res.data : res && Array.isArray(res.docs) ? res.docs : Array.isArray(res) ? res : [];
    return docs.map(normalizeBooking);
  },

  getBookingById: async (id: string): Promise<Booking> => {
    const res = await api.get<any>(`/booking/${id}`);
    const item = res?.data || res;
    return normalizeBooking(item);
  },

  verifyBookingCode: async (code: string): Promise<VerifyBookingResponse> => {
    const res = await api.get<any>(`/booking/verify/${encodeURIComponent(code.trim())}`);
    const payload = res?.data || res;
    return {
      valid: !!payload?.valid,
      booking: normalizeBooking(payload?.booking),
    };
  },

  cancelBooking: async (id: string): Promise<Booking> => {
    const res = await api.patch<any>(`/booking/${id}/cancel`);
    const item = res?.data || res;
    return normalizeBooking(item);
  },

  updateStatus: async (
    id: string,
    data: { status?: string; paymentStatus?: string }
  ): Promise<Booking> => {
    const res = await api.patch<any>(`/booking/${id}/status`, data);
    const item = res?.data || res;
    return normalizeBooking(item);
  },

  createBooking: async (data: {
    venueId: string;
    date: string;
    startTime: number;
    endTime: number;
    couponCode?: string;
    paymentMethod?: string;
    customerId?: string;
  }): Promise<{ booking: Booking; payment?: any }> => {
    const res = await api.post<any>("/booking", data);
    if (res && res.booking) {
      return {
        booking: normalizeBooking(res.booking),
        payment: res.payment,
      };
    }
    return {
      booking: normalizeBooking(res),
    };
  },
};

export default bookingApi;
