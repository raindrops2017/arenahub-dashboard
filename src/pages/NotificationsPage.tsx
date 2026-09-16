import React, { useState, useEffect, useCallback, useMemo } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import {
  CheckCircleIcon,
  AlertIcon,
  CloseIcon,
} from "../icons";
import {
  notificationApi,
  AdminSendNotificationPayload,
  AdminNotificationHistoryItem,
} from "../services/api/notificationApi";
import { customerApi } from "../services/api/customerApi";
import { venueApi } from "../services/api/venueApi";
import { CustomerUser, Venue } from "../types";

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Compose State
  const [targetType, setTargetType] = useState<
    "all" | "guests" | "customers" | "specific_users"
  >("all");
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [deepLinkType, setDeepLinkType] = useState<
    "none" | "pitch" | "bookings" | "profile" | "promo" | "custom"
  >("none");
  const [selectedVenueId, setSelectedVenueId] = useState("");
  const [customRoute, setCustomRoute] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");

  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState<string | null>(null);
  const [sendErrorMessage, setSendErrorMessage] = useState<string | null>(null);

  // History State
  const [historyItems, setHistoryItems] = useState<AdminNotificationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all_targets");
  const [searchFilter, setSearchFilter] = useState("");

  // External data
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);

  // Load Customers & Venues
  useEffect(() => {
    customerApi.getAllCustomers().then((data) => setCustomers(data || [])).catch(() => {});
    venueApi.getAllVenues().then((data: Venue[]) => setVenues(data || [])).catch(() => {});
  }, []);

  // Fetch History
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await notificationApi.getAdminHistory({
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
        targetType: audienceFilter !== "all_targets" ? audienceFilter : undefined,
        search: searchFilter || undefined,
        limit: 50,
      });
      const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setHistoryItems(items);
      setHistoryTotal(typeof res?.total === "number" ? res.total : items.length);
    } catch (err) {
      console.error("Failed to load notification history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [startDateFilter, endDateFilter, audienceFilter, searchFilter]);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 15);
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.userName?.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const toggleCustomerSelection = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendSuccessMessage(null);
    setSendErrorMessage(null);

    if (!titleAr.trim()) {
      setSendErrorMessage("Please provide the notification title in Arabic.");
      return;
    }
    if (!bodyAr.trim()) {
      setSendErrorMessage("Please provide the notification message body in Arabic.");
      return;
    }
    if (targetType === "specific_users" && selectedCustomerIds.length === 0) {
      setSendErrorMessage("Please select at least one customer.");
      return;
    }
    if (deepLinkType === "pitch" && !selectedVenueId) {
      setSendErrorMessage("Please select a target pitch for the notification link.");
      return;
    }

    setIsSending(true);
    try {
      const payload: AdminSendNotificationPayload = {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim() || titleAr.trim(),
        bodyAr: bodyAr.trim(),
        bodyEn: bodyEn.trim() || bodyAr.trim(),
        targetType,
        customerIds: targetType === "specific_users" ? selectedCustomerIds : undefined,
        deepLinkType: deepLinkType === "custom" ? "none" : deepLinkType,
        venueId: deepLinkType === "pitch" ? selectedVenueId : undefined,
        customRoute: deepLinkType === "custom" ? customRoute.trim() : undefined,
      };

      const result = await notificationApi.sendNotification(payload);

      setSendSuccessMessage(
        `Notification sent successfully! Pushed to ${result.pushedCount || 0} active devices and recorded in in-app notification inbox.`
      );

      // Reset form
      setTitleAr("");
      setTitleEn("");
      setBodyAr("");
      setBodyEn("");
      setDeepLinkType("none");
      setSelectedVenueId("");
      setCustomRoute("");
      setSelectedCustomerIds([]);
    } catch (err: any) {
      setSendErrorMessage(err?.response?.data?.message || err?.message || "Failed to dispatch notification.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Notifications & Broadcasts | San Siro"
        description="Compose and dispatch instant push notifications and in-app updates to customers and guests."
      />
      <PageBreadcrumb pageTitle="Notifications Hub" />

      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Push & In-App Notifications
              </h2>
              <Badge color="primary" size="md">
                Broadcast Center
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Send targeted updates, match alerts, promotional discounts, and announcements to app customers & guests.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("compose")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                activeTab === "compose"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              ✍️ Compose Notification
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${
                activeTab === "history"
                  ? "bg-red-600 text-white shadow-sm"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              📜 Sent History ({historyTotal})
            </button>
          </div>
        </div>

        {/* TAB 1: COMPOSE */}
        {activeTab === "compose" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700/80 dark:bg-gray-800/90 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white/90 mb-4">
                Compose New Notification
              </h3>

              {sendSuccessMessage && (
                <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div className="flex-1 text-sm text-emerald-800 dark:text-emerald-200">
                    {sendSuccessMessage}
                  </div>
                  <button onClick={() => setSendSuccessMessage(null)}>
                    <CloseIcon className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>
              )}

              {sendErrorMessage && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 flex items-start gap-3">
                  <AlertIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                  <div className="flex-1 text-sm text-red-800 dark:text-red-200">
                    {sendErrorMessage}
                  </div>
                  <button onClick={() => setSendErrorMessage(null)}>
                    <CloseIcon className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-5">
                {/* Audience Selection */}
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-2">
                    Target Audience
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: "all", label: "Everyone", desc: "Customers & Guests" },
                      { id: "customers", label: "Customers Only", desc: "Registered accounts" },
                      { id: "guests", label: "Guests Only", desc: "Anonymous devices" },
                      { id: "specific_users", label: "Specific Customers", desc: "Selected users" },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setTargetType(opt.id as any)}
                        className={`p-3 rounded-xl border text-left transition ${
                          targetType === opt.id
                            ? "border-red-600 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-300 ring-2 ring-red-500/20"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="font-bold text-xs">{opt.label}</div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Specific Customers Selector */}
                {targetType === "specific_users" && (
                  <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/40">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Select Customers ({selectedCustomerIds.length} chosen)
                      </label>
                      {selectedCustomerIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerIds([])}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Search customer by name, phone or email..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mb-3"
                    />
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                      {filteredCustomers.map((cust) => {
                        const custId = cust.id || cust._id || "";
                        const isSelected = selectedCustomerIds.includes(custId);
                        return (
                          <div
                            key={custId}
                            onClick={() => toggleCustomerSelection(custId)}
                            className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition ${
                              isSelected
                                ? "bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-200 font-semibold"
                                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded border flex items-center justify-center text-[10px] border-gray-400 dark:border-gray-500">
                                {isSelected ? "✓" : ""}
                              </span>
                              <span>{cust.userName || cust.name}</span>
                              <span className="text-gray-400">({cust.phone})</span>
                            </div>
                            <span className="text-[10px] text-gray-400">{cust.email}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Title (Arabic & English) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                      العنوان باللغة العربية <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      dir="rtl"
                      required
                      placeholder="مثال: خصم خاص 20% على حجز الملاعب اليوم"
                      value={titleAr}
                      onChange={(e) => setTitleAr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                      Title in English (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 20% Discount on Pitch Bookings Today"
                      value={titleEn}
                      onChange={(e) => setTitleEn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Message Body (Arabic & English) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                      نص الرسالة بالعربية <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      dir="rtl"
                      required
                      placeholder="اكتب تفاصيل الإشعار أو العرض الترويجي هنا..."
                      value={bodyAr}
                      onChange={(e) => setBodyAr(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
                      Message Body in English (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Write notification message or promotional details here..."
                      value={bodyEn}
                      onChange={(e) => setBodyEn(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white resize-none"
                    />
                  </div>
                </div>

                {/* Deep Link Action */}
                <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                    On Tap Action (App Deep-Link)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: "none", label: "None (Home)" },
                      { id: "pitch", label: "Specific Pitch" },
                      { id: "bookings", label: "My Bookings" },
                      { id: "profile", label: "Profile / Wallet" },
                      { id: "custom", label: "Custom Route" },
                    ].map((act) => (
                      <button
                        type="button"
                        key={act.id}
                        onClick={() => setDeepLinkType(act.id as any)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold transition ${
                          deepLinkType === act.id
                            ? "bg-red-600 text-white border-red-600 shadow-xs"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                        }`}
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>

                  {deepLinkType === "pitch" && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Select Pitch:
                      </label>
                      <select
                        value={selectedVenueId}
                        onChange={(e) => setSelectedVenueId(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="">-- Choose Venue Pitch --</option>
                        {venues.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.sportsType?.join(", ") || "Football"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {deepLinkType === "custom" && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Custom Route URI:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. /contact or /player-card"
                        value={customRoute}
                        onChange={(e) => setCustomRoute(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                      </input>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSending}
                    className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
                  >
                    {isSending ? "Dispatching..." : "🚀 Dispatch Notification"}
                  </Button>
                </div>
              </form>
            </div>

            {/* Live Mobile Notification Preview */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700/80 dark:bg-gray-800/90 shadow-sm flex flex-col items-center">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 self-start">
                Live App Preview
              </h3>

              <div className="w-full max-w-xs bg-slate-900 rounded-3xl p-4 border border-slate-800 shadow-2xl text-white">
                <div className="flex items-center justify-between text-[11px] text-gray-400 mb-3 pb-2 border-b border-gray-800">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    San Siro
                  </div>
                  <span>Just now</span>
                </div>

                <div className="space-y-1.5" dir="rtl">
                  <div className="font-bold text-sm text-white">
                    {titleAr || "عنوان الإشعار يظهر هنا..."}
                  </div>
                  <div className="text-xs text-gray-300 leading-relaxed">
                    {bodyAr || "نص الإشعار الترويجي أو التنبيه يظهر للمستخدم في صندوق الإشعارات..."}
                  </div>
                </div>

                {titleEn && (
                  <div className="mt-3 pt-2 border-t border-gray-800/60 text-left" dir="ltr">
                    <div className="font-semibold text-xs text-gray-200">{titleEn}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{bodyEn}</div>
                  </div>
                )}

                <div className="mt-4 pt-2 border-t border-gray-800 flex items-center justify-between text-[10px] text-gray-400">
                  <span>Target: {targetType.toUpperCase()}</span>
                  <span className="text-red-400">Tap to open</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SENT HISTORY */}
        {activeTab === "history" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700/80 dark:bg-gray-800/90 shadow-sm space-y-4">
            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Target Audience
                </label>
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="all_targets">All Audiences</option>
                  <option value="all">Everyone (All)</option>
                  <option value="customers">Customers</option>
                  <option value="guests">Guests</option>
                  <option value="specific_users">Specific Users</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search title or body..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Found {historyTotal} sent notifications
              </span>
              <Button onClick={fetchHistory} size="sm" variant="outline" disabled={historyLoading}>
                🔄 {historyLoading ? "Refreshing..." : "Refresh"}
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-xs text-gray-600 dark:text-gray-300">
                <thead className="bg-gray-50 dark:bg-gray-800/80 uppercase tracking-wider text-[11px] font-bold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Audience</th>
                    <th className="px-4 py-3">Action Route</th>
                    <th className="px-4 py-3">Sent By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        Loading notifications history...
                      </td>
                    </tr>
                  ) : historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                        No notifications found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    historyItems.map((item) => (
                      <tr key={item._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition">
                        <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white max-w-xs truncate">
                          {item.title?.ar || item.title?.en || "-"}
                        </td>
                        <td className="px-4 py-3 max-w-sm truncate text-gray-500 dark:text-gray-400">
                          {item.body?.ar || item.body?.en || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            color={
                              item.targetType === "all"
                                ? "primary"
                                : item.targetType === "customers"
                                ? "success"
                                : item.targetType === "guests"
                                ? "warning"
                                : "info"
                            }
                            size="sm"
                          >
                            {item.targetType.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-gray-400 truncate max-w-[150px]">
                          {item.data?.route || "-"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {item.sentBy?.userName || item.sentBy?.name || item.sentBy?.email || "System"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
