import api from './apiClient';

export interface QueryReportParams {
  startDate?: string;
  endDate?: string;
  from?: string;
  to?: string;
  venueId?: string;
  interval?: 'day' | 'week' | 'month';
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  commissionRate?: number;
}

export const reportsApi = {
  getReportsOverview: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/overview', params);
    return res?.data || res;
  },

  getRevenueReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/revenue', params);
    return res?.data || res;
  },

  getRefundsAndWalletReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/refunds-wallet', params);
    return res?.data || res;
  },

  getNoShowsReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/no-shows', params);
    return res?.data || res;
  },

  getCouponsReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/coupons', params);
    return res?.data || res;
  },

  getAdsReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/ads', params);
    return res?.data || res;
  },

  getVenueUtilizationReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/venue-utilization', params);
    return res?.data || res;
  },

  getCustomersAndFunnelReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/customers-funnel', params);
    return res?.data || res;
  },

  getPayoutsAndDisputesReport: async (params?: QueryReportParams) => {
    const res = await api.get<any>('/reports/payouts-disputes', params);
    return res?.data || res;
  },
};

export default reportsApi;
