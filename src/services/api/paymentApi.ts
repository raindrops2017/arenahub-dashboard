import api from "./apiClient";
import { Payment } from "../../types";

export interface QueryPaymentParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  date?: string;
}

export function normalizePayment(raw: any): Payment {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  return {
    ...raw,
    _id: id,
    id: id,
    bookingId: raw.bookingId,
    userId: raw.userId,
    venueId: raw.venueId,
    amount: Number(raw.amount ?? 0),
    paymentMethod: raw.paymentMethod || "wallet",
    status: raw.status || "pending",
    referenceId: raw.referenceId || raw.transactionId || "",
    transactionId: raw.transactionId || raw.referenceId || "",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const paymentApi = {
  getVenuePayments: async (
    venueId: string,
    query?: QueryPaymentParams
  ): Promise<Payment[]> => {
    const res = await api.get<any>(`/payment/venue/${venueId}`, query);
    const docs = res && Array.isArray(res.docs) ? res.docs : Array.isArray(res) ? res : [];
    return docs.map(normalizePayment);
  },

  getPaymentById: async (id: string): Promise<Payment> => {
    const res = await api.get<any>(`/payment/${id}`);
    const item = res?.data || res;
    return normalizePayment(item);
  },

  markCashPaid: async (
    id: string,
    data?: { note?: string }
  ): Promise<Payment> => {
    const res = await api.patch<any>(`/payment/${id}/mark-cash-paid`, data || {});
    const item = res?.data || res;
    return normalizePayment(item);
  },

  refundPayment: async (
    id: string,
    data: { amount?: number; reason?: string }
  ): Promise<Payment> => {
    const res = await api.post<any>(`/payment/${id}/refund`, data);
    const item = res?.data || res;
    return normalizePayment(item);
  },
};

export default paymentApi;
