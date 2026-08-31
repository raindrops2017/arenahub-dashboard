import api from "./apiClient";
import { Wallet, WalletTransaction, TransactionType } from "../../types";

export interface DepositPayload {
  userId: string;
  amount: number;
}

export interface AdminDeductPayload {
  userId: string;
  amount: number;
  reason?: string;
  description?: string;
}

export interface QueryTransactionsParams {
  userId?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export function normalizeWallet(raw: any): Wallet {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  return {
    ...raw,
    _id: id,
    id: id,
    userId: raw.userId || "",
    balance: Number(raw.balance ?? 0),
    currency: "EGP",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export function normalizeTransaction(raw: any): WalletTransaction {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  const typeMap: Record<string, TransactionType> = {
    deposit: "TOP_UP",
    booking_payment: "BOOKING_DEBIT",
    booking_refund: "REFUND_CREDIT",
    admin_deduction: "ADMIN_PAYOUT",
    user_deduction: "BOOKING_DEBIT",
  };
  const normType: TransactionType = typeMap[raw.type] || raw.type || "TOP_UP";

  return {
    ...raw,
    _id: id,
    id: id,
    walletId: raw.walletId || "",
    userId: raw.userId || "",
    customerId: raw.userId || raw.customerId || "",
    customerName: raw.customerName || "Customer",
    type: normType,
    amount: Number(raw.amount ?? 0),
    balanceBefore: raw.balanceBefore,
    balanceAfter: Number(raw.balanceAfter ?? 0),
    bookingId: raw.bookingId,
    receiptNumber: raw.receiptNumber,
    description: raw.description || raw.reason || "Wallet transaction",
    reason: raw.reason || raw.description || "",
    auditNotes: raw.reason || raw.description || "",
    createdBy: raw.createdBy,
    createdAt: raw.createdAt || new Date().toISOString(),
    timestamp: raw.createdAt || new Date().toISOString(),
  };
}

export const walletApi = {
  getMyWallet: async (userId: string): Promise<Wallet> => {
    const res = await api.get<any>(`/wallet/${userId}`);
    const item = res?.data || res;
    return normalizeWallet(item);
  },

  depositWallet: async (data: DepositPayload): Promise<Wallet> => {
    const res = await api.post<any>("/wallet/deposit", data);
    const item = res?.data || res;
    return normalizeWallet(item);
  },

  deductAdmin: async (data: AdminDeductPayload): Promise<Wallet> => {
    const desc = data.description || data.reason || "Administrative deduction";
    const payload = {
      userId: data.userId,
      amount: Number(data.amount),
      description: desc,
      reason: desc,
    };
    const res = await api.post<any>("/wallet/admin/deduct", payload);
    const item = res?.data || res;
    return normalizeWallet(item);
  },

  getTransactions: async (query?: QueryTransactionsParams): Promise<WalletTransaction[]> => {
    try {
      const res = await api.get<any>("/wallet/transactions", query);
      const docs =
        res && Array.isArray(res.docs)
          ? res.docs
          : res?.data && Array.isArray(res.data.docs)
          ? res.data.docs
          : Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
          ? res.data
          : [];
      return docs.map(normalizeTransaction);
    } catch {
      return [];
    }
  },
};

export default walletApi;
