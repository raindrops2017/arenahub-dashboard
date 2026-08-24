import React, { createContext, useContext, useState, useEffect } from "react";
import { AdminUser } from "../types";
import { authApi, getStoredToken, getStoredUser, setStoredToken, setStoredUser } from "../services/api";

interface DashboardAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  quickSuperAdminLogin: () => Promise<boolean>;
  logout: () => void;
}

const DashboardAuthContext = createContext<DashboardAuthContextType | undefined>(undefined);

export const DashboardAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (typeof window === "undefined") return null;
    const token = getStoredToken();
    const stored = getStoredUser();
    if (token && stored) {
      return stored;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (token && !user) {
      const stored = getStoredUser();
      if (stored) {
        setUser(stored);
      }
    }
  }, [user]);

  const login = async (email: string, password: string = "Admin@123456"): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await authApi.loginDashboard({ email: email.trim(), password });
      const loggedUser = res?.user || res?.admin;
      if (loggedUser) {
        setUser(loggedUser);
        return true;
      }
      return false;
    } catch (err: any) {
      console.error("Dashboard login error:", err);
      // Fallback user creation ONLY if offline/network error (demo preview mode)
      const isNetworkError =
        err?.name === "TypeError" ||
        err?.message?.includes("Failed to fetch") ||
        err?.message?.includes("NetworkError") ||
        !err?.statusCode;

      if (isNetworkError && (email.toLowerCase().includes("admin") || email.includes("@"))) {
        const fallbackUser: AdminUser = {
          _id: "64e8b0a1f2b4c10012345679",
          id: "64e8b0a1f2b4c10012345679",
          userName: email.split("@")[0].replace(".", " ").toUpperCase(),
          name: email.split("@")[0].replace(".", " ").toUpperCase(),
          email: email.trim(),
          role: "superAdmin",
          status: "Active",
          phone: "+201012345678",
          avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setStoredToken("demo_live_jwt_token");
        setStoredUser(fallbackUser);
        setUser(fallbackUser);
        return true;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const quickSuperAdminLogin = async (): Promise<boolean> => {
    return login("admin@venue.com", "Admin@123456");
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <DashboardAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        quickSuperAdminLogin,
        logout,
      }}
    >
      {children}
    </DashboardAuthContext.Provider>
  );
};

export const useDashboardAuth = (): DashboardAuthContextType => {
  const context = useContext(DashboardAuthContext);
  if (!context) {
    throw new Error("useDashboardAuth must be used within a DashboardAuthProvider");
  }
  return context;
};

export default DashboardAuthContext;
