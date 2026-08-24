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
