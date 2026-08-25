import api from "./apiClient";
import { CustomerUser, CustomerStatus } from "../../types";

export function normalizeCustomer(raw: any): CustomerUser {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  const userName = raw.userName || raw.name || "Customer";
  const status: CustomerStatus = raw.status || (raw.isActive === false ? "Inactive" : "Active");

  return {
    ...raw,
    _id: id,
    id: id,
    userName: userName,
    name: userName,
    email: raw.email || "",
    phone: raw.phone || "",
    avatar: raw.avatar || "",
    avatarUrl: raw.avatar || raw.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    position: raw.position || "Midfielder",
    favoritePosition: raw.position || "Midfielder",
    walletBalance: Number(raw.walletBalance ?? 0),
    status: status,
    walletId: raw.walletId || `wallet-${id}`,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const customerApi = {
  getAllCustomers: async (): Promise<CustomerUser[]> => {
    const res = await api.get<any[]>("/users/customers");
    if (!Array.isArray(res)) return [];
    return res.map(normalizeCustomer);
  },

  createCustomer: async (data: { userName: string; phone: string }): Promise<CustomerUser> => {
    const res = await api.post<any>("/users/customers", data);
    const item = res?.data || res;
    return normalizeCustomer(item);
  },

  updateCustomerUser: async (
    id: string,
    data: FormData | {
      userName?: string;
      phone?: string;
      position?: string;
      walletBalance?: number;
      avatar?: any;
    }
  ): Promise<CustomerUser> => {
    const res = await api.patch<any>(`/users/customers/${id}`, data);
    const item = res?.data || res;
    return normalizeCustomer(item);
  },
};

export default customerApi;
