import api from "./apiClient";

export interface AdminSendNotificationPayload {
  titleAr: string;
  titleEn?: string;
  bodyAr: string;
  bodyEn?: string;
  targetType: "all" | "guests" | "customers" | "specific_users";
  customerIds?: string[];
  deepLinkType?: string;
  venueId?: string;
  customRoute?: string;
}

export interface QueryAdminNotificationHistoryParams {
  startDate?: string;
  endDate?: string;
  targetType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminNotificationHistoryItem {
  _id: string;
  title: { ar: string; en: string };
  body: { ar: string; en: string };
  eventType: string;
  targetType: "all" | "guests" | "customers" | "specific_users";
  recipientUserIds?: string[];
  data?: Record<string, any>;
  readBy?: string[];
  deletedBy?: string[];
  sentBy?: { _id: string; userName?: string; name?: string; email?: string };
  createdAt: string;
  updatedAt: string;
}

export const notificationApi = {
  sendNotification: async (payload: AdminSendNotificationPayload) => {
    const res = await api.post<any>("/notification/admin/send", payload);
    return res;
  },

  getAdminHistory: async (
    params?: QueryAdminNotificationHistoryParams
  ): Promise<{
    data: AdminNotificationHistoryItem[];
    total: number;
    page: number;
    limit: number;
  }> => {
    const res = await api.get<any>("/notification/admin/history", params);
    if (Array.isArray(res)) {
      return { data: res, total: res.length, page: 1, limit: res.length };
    }
    const items = Array.isArray(res?.data) ? res.data : [];
    const total = typeof res?.total === "number" ? res.total : items.length;
    return {
      data: items,
      total,
      page: res?.page || 1,
      limit: res?.limit || 50,
    };
  },
};
