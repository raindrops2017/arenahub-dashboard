import api, { setStoredTokens, setStoredUser, removeStoredToken } from "./apiClient";
import { AdminUser } from "../../types";

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface AuthResponseData {
  accessToken: string;
  refreshToken?: string;
  user?: AdminUser;
  admin?: AdminUser;
}

export interface CreateAdminPayload {
  userName: string;
  email: string;
  password?: string;
  role: string;
}

export const authApi = {
  loginDashboard: async (payload: LoginPayload): Promise<AuthResponseData> => {
    const data = await api.post<any>("/auth/dashboard/login", payload);
    const accessToken = data?.accessToken || data?.data?.accessToken;
    const refreshToken = data?.refreshToken || data?.data?.refreshToken;
    if (accessToken) {
      setStoredTokens(accessToken, refreshToken);
    }
    const rawUser = data?.admin || data?.user || data?.data?.admin || data?.data?.user;
    if (rawUser) {
      const normalizedUser: AdminUser = {
        _id: rawUser._id || rawUser.id || "",
        id: rawUser.id || rawUser._id || "",
        userName: rawUser.userName || rawUser.name || rawUser.email || "Admin User",
        name: rawUser.name || rawUser.userName || rawUser.email || "Admin User",
        email: rawUser.email || "",
        role: rawUser.role || "superAdmin",
        status: rawUser.status || "Active",
        phone: rawUser.phone || "",
        avatarUrl: rawUser.avatarUrl || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        createdAt: rawUser.createdAt || new Date().toISOString(),
        updatedAt: rawUser.updatedAt || new Date().toISOString(),
      };
      setStoredUser(normalizedUser);
      return {
        accessToken: accessToken || "",
        refreshToken: refreshToken,
        user: normalizedUser,
        admin: normalizedUser,
      };
    }
    return data;
  },

  refreshToken: async (refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> => {
    const data = await api.post<{ accessToken: string; refreshToken?: string }>("/auth/refresh-token", { refreshToken });
    if (data.accessToken) {
      setStoredTokens(data.accessToken, data.refreshToken);
    }
    return data;
  },

  createAdminUser: async (payload: CreateAdminPayload): Promise<AdminUser> => {
    return api.post<AdminUser>("/auth/dashboard/users", payload);
  },

  logout: () => {
    removeStoredToken();
  },
};

export default authApi;
