import api from "./apiClient";
import { AdminUser, SystemUserRole, SystemUserStatus } from "../../types";

export function normalizeAdminUser(raw: any): AdminUser {
  if (!raw) return raw;
  const id = raw._id || raw.id || "";
  const userName = raw.userName || raw.name || "Staff Member";
  const role: SystemUserRole = raw.role || "Employee";
  const status: SystemUserStatus = raw.status || (raw.isActive === false ? "Inactive" : "Active");

  return {
    ...raw,
    _id: id,
    id: id,
    userName: userName,
    name: userName,
    email: raw.email || "",
    role: role,
    status: status,
    phone: raw.phone || "+201000000000",
    avatarUrl: raw.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export const usersApi = {
  getAllAdmins: async (): Promise<AdminUser[]> => {
    const res = await api.get<any[]>("/users/admins");
    if (!Array.isArray(res)) return [];
    return res.map(normalizeAdminUser);
  },

  getProfile: async (): Promise<any> => {
    return api.get<any>("/users/profile");
  },

  createAdminUser: async (data: {
    userName: string;
    email: string;
    password?: string;
    role: string;
  }): Promise<AdminUser> => {
    const res = await api.post<any>("/auth/dashboard/users", data);
    return normalizeAdminUser(res);
  },

  updateAdminUser: async (
    id: string,
    data: {
      userName?: string;
      email?: string;
      password?: string;
      role?: string;
    }
  ): Promise<AdminUser> => {
    const res = await api.patch<any>(`/users/admins/${id}`, data);
    const item = res?.data || res;
    return normalizeAdminUser(item);
  },
};

export default usersApi;
