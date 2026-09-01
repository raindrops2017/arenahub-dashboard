// TypeScript Definitions matching nest-server Mongoose Schemas & Dashboard Models

export type SportsType =
  | '5-A-SIDE'
  | '7-A-SIDE'
  | '11-A-SIDE'
  | 'Football'
  | 'PADEL'
  | 'Padel'
  | 'BASKETBALL'
  | 'Basketball'
  | 'TENNIS'
  | 'Tennis'
  | 'VOLLEYBALL'
  | 'Volleyball'
  | 'BADMINTON'
  | 'Badminton'
  | string;

export type VenueStatus = 'Active' | 'Maintenance' | 'Inactive';

export interface VenueAmenities {
  Parking?: boolean;
  Cafeteria?: boolean;
  Shower?: boolean;
  ChangingRoom?: boolean;
  Toilets?: boolean;
  WiFi?: boolean;
  Lockers?: boolean;
  FloodLights?: boolean;
  DrinkingWater?: boolean;
  FirstAid?: boolean;
  PrayerArea?: boolean;
  EquipmentRental?: boolean;
  [key: string]: boolean | undefined;
}

export interface CustomHourPrice {
  hour: number;
  pricePerHour: number;
}

export interface CustomDatePrice {
  id?: string;
  _id?: string;
  date: string; // ISO String format YYYY-MM-DD
  startHour: number; // 0 - 23
  endHour: number; // 1 - 24
  pricePerHour: number;
  note?: string;
}

export type CustomPricingRate = CustomHourPrice & {
  id?: string;
  label?: string;
  startHour?: string;
  endHour?: string;
};
export type CustomPricingRule = CustomPricingRate;

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface WorkingHours {
  openTime: string;
  closeTime: string;
  daysOpen: string[];
}

export interface VenuePricing {
  defaultPricePerHour: number;
  currency: 'EGP' | 'USD';
  customHourlyRates: CustomPricingRate[];
}

export interface Venue {
  _id: string;
  id?: string; // UI alias
  venueName: string;
  name?: string; // UI alias
  sportsType: string[];
  sportsTypes?: SportsType[]; // UI alias
  address: string;
  locationAlt: number;
  locationLang: number;
  coordinates?: Coordinates; // UI alias
  images: string[];
  imageUrls?: string[]; // UI alias
  imageGallery?: string[]; // UI alias
  amenities: VenueAmenities | string[];
  startWorkingHours: number;
  endWorkingHours: number;
  WorkingHours?: number;
  workingHours?: WorkingHours; // UI alias
  defaultHourPrice: number;
  defaultHourlyPrice?: number; // UI alias
  pricing?: VenuePricing; // UI alias
  minimumDepositAmount?: number;
  minDeposit?: number; // UI alias
  existingImages?: string[];
  keepImages?: string[];
  removedImages?: string[];
  deleteImages?: string[];
  customHourPrices?: CustomHourPrice[];
  customDatePrices?: CustomDatePrice[];
  customHourlyPrices?: CustomPricingRate[]; // UI alias
  isActive: boolean;
  status?: VenueStatus; // UI alias
  rating?: number;
  reviewCount?: number;
  description?: string;
  createdBy?: any;
  updatedBy?: any;
  deletedBy?: any;
  deletedAt?: string;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomerStatus = 'Active' | 'On Hold' | 'Suspended' | 'Archived' | 'Inactive';

export interface CustomerUser {
  _id: string;
  id?: string; // UI alias
  userName: string;
  name?: string; // UI alias
  email?: string;
  phone?: string;
  avatar?: string;
  avatarUrl?: string; // UI alias
  position?: string;
  favoritePosition?: string; // UI alias
  walletBalance: number;
  provider?: 'system' | 'google' | string;
  emailConfirmed?: boolean;
  status?: CustomerStatus;
  statusReason?: string;
  statusUpdatedAt?: string;
  walletId?: string; // UI alias
  createdAt?: string;
  updatedAt?: string;
}
export type Customer = CustomerUser;

export type SystemUserRole =
  | 'superAdmin'
  | 'admin'
  | 'manager'
  | 'owner'
  | 'Admin'
  | 'Employee'
  | 'Manager'
  | 'Owner'
  | string;
export type UserRole = SystemUserRole;

export type SystemUserStatus = 'Active' | 'Inactive';
export type UserStatus = SystemUserStatus;

export interface AdminUser {
  _id: string;
  id?: string; // UI alias
  userName: string;
  name?: string; // UI alias
  email: string;
  role: SystemUserRole;
  status?: SystemUserStatus; // UI alias
  phone?: string;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
export type SystemUser = AdminUser;

export type TransactionType =
  | 'DEPOSIT'
  | 'BOOKING_PAYMENT'
  | 'BOOKING_REFUND'
  | 'ADMIN_DEDUCTION'
  | 'USER_DEDUCTION'
  | 'REFUND_CREDIT'
  | 'BOOKING_DEBIT'
  | 'ADMIN_PAYOUT'
  | 'TOP_UP'
  | 'TOPUP'
  | string;

export interface WalletTransaction {
  _id?: string;
  id: string;
  walletId: string;
  userId?: string;
  customerId?: string;
  customerName?: string;
  type: TransactionType;
  amount: number;
  balanceBefore?: number;
  balanceAfter: number;
  bookingId?: string;
  receiptNumber?: string;
  description?: string;
  reason?: string;
  auditNotes?: string;
  createdBy?: string;
  createdAt: string;
  timestamp?: string;
}

export interface Wallet {
  _id?: string;
  id: string;
  userId?: string;
  customerId?: string;
  customerName?: string;
  balance: number;
  currency?: string;
  transactions?: WalletTransaction[];
  createdAt?: string;
  updatedAt?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'no_show'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'
  | 'BOOKED'
  | 'COMPLETED';

export type PaymentMethod =
  | 'wallet'
  | 'cash'
  | 'paymob'
  | 'Wallet Balance'
  | 'Cash'
  | 'Credit Card'
  | 'WALLET'
  | 'CASH'
  | 'CREDIT_CARD'
  | 'PAYMOB';

export type PaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'pay_at_venue'
  | 'partially_paid'
  | 'refunded'
  | 'partially_refunded'
  | 'Paid'
  | 'Partially Paid'
  | 'Pending'
  | 'Refunded'
  | 'Partially Refunded';

export interface Booking {
  _id: string;
  id: string; // UI compatibility
  bookingCode?: string;
  groupId?: string;
  venueId: string | any;
  venueName?: string;
  userId: string | any;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  date: string;
  startTime: number | string;
  endTime: number | string;
  slotId?: string;
  slots?: string[];
  totalPrice?: number;
  price?: number;
  discountAmount?: number;
  finalPrice?: number;
  paidAmount?: number;
  remainingAmount?: number;
  couponCode?: string;
  currency?: string;
  paymentMethod: PaymentMethod;
  paymentStatus?: PaymentStatus;
  status: BookingStatus;
  qrCode?: string;
  expiresAt?: string | null;
  idempotencyKey?: string;
  cancellationReason?: string;
  refundReason?: string;
  refundOption?: 'FULL' | 'PARTIAL' | 'NONE';
  refundAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  _id: string;
  id?: string;
  bookingId: string | any;
  userId: string | any;
  venueId?: string | any;
  groupId?: string;
  amount: number;
  refundedAmount?: number;
  paymentMethod: string;
  status: string;
  currency?: string;
  referenceId?: string;
  transactionId?: string;
  paymobOrderId?: number | string;
  paymobTransactionId?: number | string;
  paymobAuthCode?: string;
  paymobResponse?: any;
  paymobOrder?: any;
  paymobData?: any;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Coupon {
  _id: string;
  id?: string;
  code: string;
  discountType: 'fixed' | 'percentage';
  discount: number;
  startDate: string;
  endDate: string;
  maxUses: number;
  usesCount: number;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Amenities {
  _id: string;
  id?: string;
  venueId: string;
  Parking: boolean;
  Cafeteria: boolean;
  Shower: boolean;
  ChangingRoom: boolean;
  Toilets: boolean;
  WiFi: boolean;
  Lockers: boolean;
  FloodLights: boolean;
  DrinkingWater: boolean;
  FirstAid: boolean;
  PrayerArea: boolean;
  EquipmentRental: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportsSummaryData {
  grossRevenue: number;
  netRevenue: number;
  totalRefunds: number;
  occupancyRate: number;
  totalBookings: number;
  cancelledBookings: number;
  noShowBookings?: number;
  cashRevenue?: number;
  gatewayRevenue?: number;
  cancellationRate: number;
  dailyRevenue: { date: string; gross: number; net: number; refunds: number }[];
  venuePerformance: {
    venueId: string;
    venueName: string;
    totalRevenue: number;
    bookingsCount: number;
    occupancyRate: number;
  }[];
  peakHours: { hour: string; bookingCount: number }[];
}

export type AdActionType = 'EXTERNAL_LINK' | 'PITCH_DETAIL' | 'INFO_MODAL' | 'NONE';

export interface Advertisement {
  _id: string;
  id?: string;
  title: string;
  description?: string;
  image: string;
  linkUrl?: string;
  position?: 'DASHBOARD_TOP' | 'DASHBOARD_MIDDLE' | 'DASHBOARD_SIDEBAR' | string;
  status?: 'active' | 'inactive' | 'scheduled' | 'expired' | string;
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  displayDuration?: number;
  priority?: number;
  impressions?: number;
  clicks?: number;
  createdBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  displayDuration: number;
  actionType: AdActionType;
  actionValue?: string;
  order: number;
  status: 'Active' | 'Inactive';
  startDate?: string;
  endDate?: string;
  durationMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
  impressions?: number;
  clicks?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ContactInquiry {
  _id: string;
  id?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  campaignType?: string;
  message?: string;
  status: 'PENDING' | 'CONTACTED' | 'RESOLVED' | 'DISMISSED';
  source?: string;
  createdAt: string;
  updatedAt?: string;
}
