/**
 * @deprecated
 * MockStore has been disconnected. The Vite Web Dashboard is now connected directly
 * to the live NestJS backend via the services/api layer:
 * - authApi (Authentication & Dashboard Staff)
 * - venueApi (Venues & S3 Multi-Image uploads)
 * - bookingApi (Real-time Bookings & Gate Verification)
 * - customerApi & usersApi (Customer Profiles & Admin Staff)
 * - paymentApi & walletApi (Financials, Top-Ups & Deductions)
 * - socketService (Real-Time WebSocket Gateway)
 */

export const IS_MOCK_DISCONNECTED = true;
