import api from "./apiClient";
import { CustomerUser, CustomerStatus } from "../../types";

export function mapBackendStatusToCustomerStatus(status?: string): CustomerStatus {
  if (!status) return "Active";
  const s = status.toLowerCase();
  if (s === "active") return "Active";
  if (s === "hold" || s === "on hold") return "On Hold";
  if (s === "suspended" || s === "suspend") return "Suspended";
  if (s === "archived" || s === "archive" || s === "inactive") return "Archived";
  return "Active";
}

export function mapCustomerStatusToBackend(status?: CustomerStatus | string): string {
  if (!status) return "active";
  const s = String(status);
  if (s === "Active" || s === "active") return "active";
  if (s === "On Hold" || s === "hold") return "hold";
  if (s === "Suspended" || s === "suspended") return "suspended";
  if (s === "Archived" || s === "archived") return "archived";
  if (s === "Inactive" || s === "inactive") return "inactive";
  return "active";
}

export function normalizeCustomer(raw: any): CustomerUser {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  const userName = raw.userName || raw.name || "Customer";
  const status: CustomerStatus = mapBackendStatusToCustomerStatus(raw.status);

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
    statusReason: raw.statusReason || "",
    statusUpdatedAt: raw.statusUpdatedAt || raw.updatedAt || "",
    walletId: raw.walletId || `wallet-${id}`,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const customerApi = {
  getAllCustomers: async (): Promise<CustomerUser[]> => {
    const res = await api.get<any>("/users/customers");
    const rawList = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    return rawList.map(normalizeCustomer);
  },

  createCustomer: async (data: { userName: string; phone: string }): Promise<CustomerUser> => {
    const res = await api.post<any>("/users/customers", data);
    const item = res?.data || res;
    return normalizeCustomer(item);
  },

  updateCustomerUser: async (
    id: string,
    data:
      | FormData
      | {
          userName?: string;
          phone?: string;
          position?: string;
          walletBalance?: number;
          status?: CustomerStatus | string;
          statusReason?: string;
          avatar?: any;
        }
  ): Promise<CustomerUser> => {
    let payload = data;
    if (!(data instanceof FormData)) {
      payload = {
        ...data,
        status: data.status ? (mapCustomerStatusToBackend(data.status) as any) : undefined,
      };
    }
    const res = await api.patch<any>(`/users/customers/${id}`, payload);
    const item = res?.data || res;
    return normalizeCustomer(item);
  },
};

export default customerApi;
