import api from "./apiClient";
import { Payment } from "../../types";

export interface QueryPaymentParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  date?: string;
  search?: string;
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
    groupId: raw.groupId,
    amount: Number(raw.amount ?? 0),
    refundedAmount: Number(raw.refundedAmount ?? 0),
    currency: raw.currency || "EGP",
    paymentMethod: raw.paymentMethod || "wallet",
    status: raw.status || "pending",
    referenceId: raw.referenceId || raw.transactionId || "",
    transactionId: raw.transactionId || raw.referenceId || "",
    paymobOrderId: raw.paymobOrderId || raw.paymobOrder?.id || raw.paymobData?.order_id,
    paymobTransactionId: raw.paymobTransactionId || raw.paymobData?.id || raw.paymobResponse?.id,
    paymobAuthCode: raw.paymobAuthCode || raw.paymobData?.data?.txn_response_code,
    paymobData: raw.paymobData || raw.paymobResponse || raw.paymobOrder,
    notes: raw.notes || raw.auditReason,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const paymentApi = {
  getAllPayments: async (
    query?: QueryPaymentParams
  ): Promise<{ docs: Payment[]; total: number; page: number; limit: number }> => {
    const res = await api.get<any>("/payment", query);
    const docs = res && Array.isArray(res.docs)
      ? res.docs
      : res && Array.isArray(res.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];
    return {
      docs: docs.map(normalizePayment),
      total: res?.total || docs.length,
      page: res?.page || 1,
      limit: res?.limit || docs.length,
    };
  },

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
