import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { venueApi } from "../../services/api/venueApi";
import { Venue } from "../../types";

import { ModernDatePicker } from "../../components/ui/ModernDatePicker";

export interface FilterState {
  startDate: string;
  endDate: string;
  venueId: string;
  interval: "day" | "week" | "month";
}

interface ReportsFilterHeaderProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh: () => void;
  loading?: boolean;
}

const REPORT_TABS = [
  { name: "Overview", path: "/reports" },
  { name: "Revenue & Payments", path: "/reports/revenue" },
  { name: "Refunds & Wallet", path: "/reports/refunds-wallet" },
  { name: "No-Shows", path: "/reports/no-shows" },
  { name: "Coupons", path: "/reports/coupons" },
  { name: "Ads", path: "/reports/ads" },
  { name: "Venue Utilization", path: "/reports/venue-utilization" },
  { name: "Customers & Funnel", path: "/reports/customers-funnel" },
  { name: "Payouts & Disputes", path: "/reports/payouts-disputes" },
];

export const ReportsFilterHeader: React.FC<ReportsFilterHeaderProps> = ({
  filters,
  onFilterChange,
  onRefresh,
  loading,
}) => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const location = useLocation();

  useEffect(() => {
    venueApi.getAllVenues().then((res) => {
      if (Array.isArray(res)) setVenues(res);
    }).catch(() => {});
  }, []);

  const handleChange = (key: keyof FilterState, val: string) => {
    onFilterChange({
      ...filters,
      [key]: val,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            📊 Reports & Analytics Hub
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Real-time financial aggregations, capacity demand analytics, and retention performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Start Date */}
          <div className="w-40">
            <ModernDatePicker
              value={filters.startDate}
              onChange={(val) => handleChange("startDate", val)}
              placeholder="From Date"
              variant="compact"
            />
          </div>

          {/* End Date */}
          <div className="w-40">
            <ModernDatePicker
              value={filters.endDate}
              onChange={(val) => handleChange("endDate", val)}
              placeholder="To Date"
              variant="compact"
            />
          </div>

          {/* Interval */}
          <select
            value={filters.interval}
            onChange={(e) => handleChange("interval", e.target.value as any)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 cursor-pointer shadow-xs"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>

          {/* Venue Dropdown */}
          <select
            value={filters.venueId}
            onChange={(e) => handleChange("venueId", e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 cursor-pointer max-w-[170px]"
          >
            <option value="">All Sports Venues</option>
            {venues.map((v) => (
              <option key={v._id || v.id} value={v._id || v.id}>
                {v.venueName || v.name}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-indigo-500/20"
          >
            {loading ? "⏳ Loading..." : "🔄 Refresh"}
          </button>
        </div>
      </div>

      {/* Category Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-gray-200 dark:border-gray-700/60">
        {REPORT_TABS.map((tab) => {
          const active = location.pathname === tab.path || (tab.path === "/reports" && location.pathname === "/reports/overview");
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                active
                  ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/60 border border-gray-200 dark:border-gray-700/80"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsFilterHeader;
