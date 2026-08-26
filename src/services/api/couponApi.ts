import api from "./apiClient";
import { Coupon } from "../../types";

export interface CreateCouponPayload {
  code: string;
  discountType: "fixed" | "percentage";
  discount: number;
  startDate: string;
  endDate: string;
  maxUses: number;
  isActive?: boolean;
}

export interface ValidateCouponPayload {
  code: string;
  amount: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  code: string;
  discountAmount: number;
  finalAmount: number;
}

export const couponApi = {
  getAllCoupons: async (query?: { search?: string; status?: string }): Promise<Coupon[]> => {
    const res = await api.get<any>("/coupon", query);
    const docs = res && Array.isArray(res.data)
      ? res.data
      : res && Array.isArray(res.docs)
      ? res.docs
      : Array.isArray(res)
      ? res
      : [];
    return docs;
  },

  getCouponById: async (id: string): Promise<Coupon> => {
    const res = await api.get<any>(`/coupon/${id}`);
    return res?.data || res;
  },

  createCoupon: async (payload: CreateCouponPayload): Promise<Coupon> => {
    const res = await api.post<any>("/coupon", payload);
    return res?.data || res;
  },

  validateCoupon: async (payload: ValidateCouponPayload): Promise<ValidateCouponResponse> => {
    const res = await api.post<any>("/coupon/validate", payload);
    return res?.data || res;
  },

  updateCoupon: async (id: string, payload: Partial<CreateCouponPayload>): Promise<Coupon> => {
    const res = await api.patch<any>(`/coupon/${id}`, payload);
    return res?.data || res;
  },

  deleteCoupon: async (id: string): Promise<Coupon> => {
    const res = await api.delete<any>(`/coupon/${id}`);
    return res?.data || res;
  },
};

export default couponApi;
