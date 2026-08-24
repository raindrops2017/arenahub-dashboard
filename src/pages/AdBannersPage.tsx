import { useState, useEffect, useCallback, useMemo } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { Modal } from "../components/ui/modal";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  GridIcon,
  ListIcon,
  ShootingStarIcon,
  CheckCircleIcon,
  EyeIcon,
} from "../icons";
import { AdBanner, AdActionType, Venue, Advertisement } from "../types";
import { venueApi } from "../services/api/venueApi";
import { advertisementApi } from "../services/api/advertisementApi";

const DEFAULT_BANNER_IMAGE = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200";

const API_ORIGIN = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL)
  ? String(import.meta.env.VITE_API_URL).replace(/\/api\/v1\/?$/, "")
  : "http://localhost:3000";

export function resolveBannerImageUrl(url?: string): string {
  if (!url) return DEFAULT_BANNER_IMAGE;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${API_ORIGIN}/${url.replace(/^\/+/, "")}`;
}

export function toDatetimeLocalValue(isoStr?: string): string {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function formatTimeRemaining(endDateStr?: string): { label: string; isExpired: boolean; isPermanent: boolean } {
  if (!endDateStr) {
    return { label: "No Expiry", isExpired: false, isPermanent: true };
  }
  const end = new Date(endDateStr).getTime();
  if (isNaN(end)) {
    return { label: "No Expiry", isExpired: false, isPermanent: true };
  }
  const diffMs = end - Date.now();
  if (diffMs <= 0) {
    return { label: "Expired", isExpired: true, isPermanent: false };
  }
  const totalMins = Math.ceil(diffMs / 60000);
  if (totalMins < 60) {
    return { label: `${totalMins}m left`, isExpired: false, isPermanent: false };
  }
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours < 24) {
    return { label: `${hours}h ${mins}m left`, isExpired: false, isPermanent: false };
  }
  const days = Math.floor(hours / 24);
  return { label: `${days}d left`, isExpired: false, isPermanent: false };
}

export default function AdBannersPage() {
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdBanner | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingBanner, setDeletingBanner] = useState<AdBanner | null>(null);

  // Form State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [formData, setFormData] = useState<{
    title: string;
    subtitle: string;
    displayDuration: number; // Carousel slide timeout in seconds before scrolling
    actionType: AdActionType;
    actionValue: string;
    order: number;
    status: "Active" | "Inactive";
    startDate: string;
    endDate: string; // Expiry date & time
  }>({
    title: "",
    subtitle: "",
    displayDuration: 5,
    actionType: "NONE",
    actionValue: "",
    order: 1,
    status: "Active",
    startDate: "",
    endDate: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await advertisementApi.findAll({ limit: 100 });
      const rawAds: Advertisement[] = Array.isArray(res)
        ? res
        : (res as any)?.docs || (res as any)?.advertisements || (res as any)?.banners || (res as any)?.data || [];

      if (rawAds.length > 0) {
        const mapped: AdBanner[] = rawAds.map((ad, idx) => {
          const isExpired = ad.endDate ? new Date(ad.endDate).getTime() <= Date.now() : false;
          return {
            id: ad._id || (ad as any).id || `ad-${idx}`,
            title: ad.title,
            subtitle: ad.description || "",
            imageUrl: resolveBannerImageUrl(ad.image),
            displayDuration: Number(ad.displayDuration || ad.durationMinutes || 5),
            actionType: (ad.linkUrl ? "EXTERNAL_LINK" : "NONE") as AdActionType,
            actionValue: ad.linkUrl || "",
            order: ad.priority ?? idx + 1,
            status: isExpired ? "Inactive" : ad.status === "active" ? "Active" : "Inactive",
            startDate: ad.startDate || "",
            endDate: ad.endDate || "",
            createdAt: ad.createdAt || new Date().toISOString(),
            updatedAt: ad.updatedAt,
            impressions: ad.impressions || 0,
            clicks: ad.clicks || 0,
          };
        });
        setBanners(mapped);
      } else {
        setBanners([]);
      }
    } catch (err: any) {
      console.warn("Failed to load advertisements from API:", err);
      setErrorMsg(err.message || "Failed to load advertisements from backend.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    venueApi.getAllVenues().then((vList) => setVenues(vList)).catch(() => {});
  }, [loadData]);

  const handleOpenAddModal = () => {
    setEditingBanner(null);
    setImageFile(null);
    setImagePreview("");
    // Default expiry 7 days from now
    const defaultEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setFormData({
      title: "",
      subtitle: "",
      displayDuration: 5,
      actionType: "NONE",
      actionValue: "",
      order: banners.length + 1,
      status: "Active",
      startDate: new Date().toISOString(),
      endDate: defaultEnd,
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (banner: AdBanner) => {
    setEditingBanner(banner);
    setImageFile(null);
    setImagePreview(banner.imageUrl);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || "",
      displayDuration: Number(banner.displayDuration || banner.durationMinutes || 5),
      actionType: banner.actionType || "NONE",
      actionValue: banner.actionValue || "",
      order: banner.order || 1,
      status: banner.status || "Active",
      startDate: banner.startDate || "",
      endDate: banner.endDate || "",
    });
    setIsFormModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleToggleStatus = async (id: string) => {
    const target = banners.find((b) => b.id === id);
    if (!target) return;
    const nextStatus = target.status === "Active" ? "inactive" : "active";
    try {
      await advertisementApi.updateStatus(id, nextStatus);
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: nextStatus === "active" ? "Active" : "Inactive" } : b))
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleSetExpiryOffset = (hours: number) => {
    if (hours === 0) {
      setFormData((prev) => ({ ...prev, endDate: "" }));
      return;
    }
    const end = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    setFormData((prev) => ({ ...prev, endDate: end }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Please enter a title for the banner.");
      return;
    }
    if (!editingBanner && !imageFile) {
      alert("Please select a banner image to upload.");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", formData.title.trim());
      if (formData.subtitle.trim()) fd.append("description", formData.subtitle.trim());
      fd.append("position", "DASHBOARD_TOP");
      fd.append("status", formData.status === "Active" ? "active" : "inactive");
      fd.append("priority", String(Number(formData.order) || 1));
      
      if (formData.displayDuration) {
        fd.append("displayDuration", String(Math.max(1, Number(formData.displayDuration) || 5)));
        fd.append("durationMinutes", String(Math.max(1, Number(formData.displayDuration) || 5)));
      }

      if (formData.actionType === "EXTERNAL_LINK" && formData.actionValue) {
        fd.append("linkUrl", formData.actionValue.trim());
      } else if (formData.actionType === "PITCH_DETAIL" && formData.actionValue) {
        fd.append("linkUrl", `https://arenahub.app/venue/${formData.actionValue}`);
      }

      // Start date & Expiry date
      if (formData.startDate) {
        fd.append("startDate", new Date(formData.startDate).toISOString());
      }
      if (formData.endDate) {
        fd.append("endDate", new Date(formData.endDate).toISOString());
      }

      if (imageFile) {
        fd.append("image", imageFile);
      }

      if (editingBanner) {
        await advertisementApi.update(editingBanner.id, fd);
      } else {
        await advertisementApi.create(fd);
      }

      setIsFormModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Error saving advertisement: ${err.message || "Operation failed"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingBanner) {
      try {
        await advertisementApi.remove(deletingBanner.id);
        setBanners((prev) => prev.filter((b) => b.id !== deletingBanner.id));
        setDeletingBanner(null);
        setIsDeleteModalOpen(false);
      } catch (err: any) {
        alert(`Failed to delete banner: ${err.message}`);
      }
    }
  };

  // Filtering
  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.subtitle && b.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === "ALL" || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [banners, searchQuery, statusFilter]);

  const activeCount = banners.filter((b) => b.status === "Active").length;
  const totalImpressions = banners.reduce((sum, b) => sum + (b.impressions || 0), 0);
  const totalClicks = banners.reduce((sum, b) => sum + (b.clicks || 0), 0);

  return (
    <>
      <PageMeta
        title="Ad Banners Management | ArenaHub Admin"
        description="Manage top dynamic scrolling ad banners displayed on the mobile application."
      />
      <PageBreadcrumb pageTitle="Ad Banners Management" />

      {/* Top Action Bar & Analytics */}
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Banners</p>
                <h4 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {banners.length}
                </h4>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/10">
                <ShootingStarIcon className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Mobile Ads</p>
                <h4 className="mt-2 text-2xl font-bold text-[#22c55e]">
                  {activeCount}
                </h4>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
                <CheckCircleIcon className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Views</p>
                <h4 className="mt-2 text-2xl font-bold text-blue-500">
                  {totalImpressions.toLocaleString()}
                </h4>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
                <EyeIcon className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Clicks</p>
                <h4 className="mt-2 text-2xl font-bold text-amber-500">
                  {totalClicks.toLocaleString()}
                </h4>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/10">
                <ShootingStarIcon className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {errorMsg ? (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
            {errorMsg}
          </div>
        ) : null}

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search banner title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white dark:placeholder-gray-500"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-11 rounded-xl border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:text-white"
            >
              <option value="ALL" className="dark:bg-gray-900">All Statuses</option>
              <option value="Active" className="dark:bg-gray-900">Active Only</option>
              <option value="Inactive" className="dark:bg-gray-900">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-gray-200 p-1 dark:border-gray-800">
              <button
                onClick={() => setViewMode("grid")}
                className={`rounded-lg p-2 transition-colors ${
                  viewMode === "grid"
                    ? "bg-gray-100 text-brand-500 dark:bg-gray-800 dark:text-white"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <GridIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`rounded-lg p-2 transition-colors ${
                  viewMode === "table"
                    ? "bg-gray-100 text-brand-500 dark:bg-gray-800 dark:text-white"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <ListIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Create Banner CTA */}
            <Button
              size="md"
              variant="primary"
              onClick={handleOpenAddModal}
              startIcon={<PlusIcon className="h-5 w-5" />}
            >
              Create Ad Banner
            </Button>
          </div>
        </div>

        {/* Content Section: Grid View */}
        {loading ? (
          <div className="flex h-60 items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
          </div>
        ) : filteredBanners.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <ShootingStarIcon className="h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">No ad banners found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create your first promotional banner to display immediately on the mobile app.
            </p>
            <Button size="sm" variant="primary" className="mt-4" onClick={handleOpenAddModal}>
              Create Banner
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBanners.map((banner) => {
              const remaining = formatTimeRemaining(banner.endDate);
              return (
                <div
                  key={banner.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  {/* Banner Preview Card */}
                  <div className="relative h-44 w-full bg-gray-900">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                    {/* Order, Rotation Timeout & Expiry Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 max-w-[80%]">
                      <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-xs font-bold text-white border border-white/20">
                        #{banner.order}
                      </span>
                      <span className="rounded-md bg-blue-600/80 backdrop-blur-md px-2 py-0.5 text-xs font-bold text-white border border-blue-400/30">
                        ⏱️ {banner.displayDuration || 5}s
                      </span>
                      <span
                        className={`rounded-md backdrop-blur-md px-2 py-0.5 text-xs font-bold border ${
                          remaining.isExpired
                            ? "bg-red-500/80 text-white border-red-400"
                            : remaining.isPermanent
                            ? "bg-emerald-600/80 text-white border-emerald-400/40"
                            : "bg-amber-500/80 text-white border-amber-400"
                        }`}
                      >
                        📅 {remaining.label}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <button
                        onClick={() => handleToggleStatus(banner.id)}
                        className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md transition-colors ${
                          banner.status === "Active"
                            ? "bg-emerald-500/90 text-white"
                            : "bg-gray-500/80 text-gray-200"
                        }`}
                      >
                        {banner.status}
                      </button>
                    </div>

                    {/* Overlay Title */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-extrabold uppercase text-white line-clamp-1 drop-shadow-md">
                        {banner.title}
                      </h3>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      {banner.subtitle && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {banner.subtitle}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
                        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <EyeIcon className="h-3.5 w-3.5 text-blue-500" /> {banner.impressions || 0} views
                          </span>
                          <span className="flex items-center gap-1">
                            <ShootingStarIcon className="h-3.5 w-3.5 text-amber-500" /> {banner.clicks || 0} clicks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <button
                        onClick={() => handleOpenEditModal(banner)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                        title="Edit Banner"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingBanner(banner);
                          setIsDeleteModalOpen(true);
                        }}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                        title="Delete Banner"
                      >
                        <TrashBinIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-700 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-300">
                  <tr>
                    <th className="px-6 py-4">Banner</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Rotation Timeout</th>
                    <th className="px-6 py-4">Expiry Date</th>
                    <th className="px-6 py-4">Views</th>
                    <th className="px-6 py-4">Clicks</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredBanners.map((banner) => {
                    const remaining = formatTimeRemaining(banner.endDate);
                    return (
                      <tr key={banner.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={banner.imageUrl}
                              alt={banner.title}
                              className="h-12 w-20 rounded-lg object-cover"
                            />
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{banner.title}</p>
                              {banner.subtitle && (
                                <p className="text-xs text-gray-400 line-clamp-1">{banner.subtitle}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                          #{banner.order}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            ⏱️ {banner.displayDuration || 5}s
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              remaining.isExpired
                                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                                : remaining.isPermanent
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            }`}
                          >
                            📅 {remaining.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-blue-500 font-semibold">
                          {(banner.impressions || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-amber-500 font-semibold">
                          {(banner.clicks || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant="light"
                            color={banner.status === "Active" ? "success" : "warning"}
                          >
                            {banner.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenEditModal(banner)}
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingBanner(banner);
                                setIsDeleteModalOpen(true);
                              }}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                            >
                              <TrashBinIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Banner Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        className="max-w-2xl w-full p-0 overflow-hidden rounded-3xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col max-h-[88vh]"
      >
        <div className="flex flex-col h-full max-h-[88vh]">
          {/* Sticky Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-white dark:bg-gray-900">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingBanner ? "Edit Ad Banner" : "Create New Ad Banner"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure banner image, carousel rotation timeout, and automatic expiry date.
              </p>
            </div>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1">
              {/* Section 1: Creative & Visual Content */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                  <span>🎨 Banner Content & Image</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Headline Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="e.g. Summer Night Tournament"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Subtitle / Description
                      </label>
                      <input
                        type="text"
                        value={formData.subtitle}
                        onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                        placeholder="e.g. 20% Discount for weekend bookings"
                        className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Image Upload & Preview */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                      Banner Image {editingBanner ? "(Leave empty to keep current)" : "*"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white"
                    />
                    {imagePreview ? (
                      <div className="mt-2 h-20 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-900">
                        <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="mt-2 flex h-20 w-full items-center justify-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs text-gray-400">
                        Recommended: 1200x500px landscape image
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Carousel Auto-Scroll Timeout */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                    <span>⏱️ Carousel Auto-Scroll Timeout</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded">
                    {formData.displayDuration} seconds
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                  How long the mobile app shows this ad before automatically scrolling to the next ad in the carousel.
                </p>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: "3s (Fast)", val: 3 },
                    { label: "5s (Standard)", val: 5 },
                    { label: "8s", val: 8 },
                    { label: "10s", val: 10 },
                    { label: "15s", val: 15 },
                    { label: "30s", val: 30 },
                    { label: "60s (1 min)", val: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFormData({ ...formData, displayDuration: preset.val })}
                      className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        formData.displayDuration === preset.val
                          ? "bg-blue-600 text-white shadow-sm font-bold"
                          : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    Custom Duration (Seconds):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={formData.displayDuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayDuration: Math.max(1, parseInt(e.target.value, 10) || 5),
                      })
                    }
                    className="w-28 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Section 3: Ad Expiry Date & Auto-Deactivation */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span>📅 Ad Expiry Date (Auto-Disable)</span>
                  </div>
                  <span
                    className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                      formData.endDate
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
                        : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                    }`}
                  >
                    {formData.endDate ? "Expires: " + new Date(formData.endDate).toLocaleString() : "Never Expires (Permanent)"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                  The ad will be active immediately on the mobile app and automatically disabled once this expiry date/time arrives.
                </p>

                {/* Quick Expiry Presets */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: "+1 Hour", hours: 1 },
                    { label: "+12 Hours", hours: 12 },
                    { label: "+24 Hours (1 Day)", hours: 24 },
                    { label: "+3 Days", hours: 72 },
                    { label: "+7 Days (1 Week)", hours: 168 },
                    { label: "+30 Days (1 Month)", hours: 720 },
                    { label: "♾️ Never Expire", hours: 0 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleSetExpiryOffset(preset.hours)}
                      className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all bg-white text-gray-700 border border-gray-200 hover:bg-amber-100/50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Exact Date & Time Picker */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Exact Expiry Date & Time:
                    </label>
                    <input
                      type="datetime-local"
                      value={toDatetimeLocalValue(formData.endDate)}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          endDate: e.target.value ? new Date(e.target.value).toISOString() : "",
                        })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Ad Status:
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as "Active" | "Inactive" })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="Active">Active (Visible immediately)</option>
                      <option value="Inactive">Inactive (Hidden/Disabled)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 4: Target Link & Priority */}
              <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
                  <span>🔗 Click Action & Priority</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Display Priority:
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) || 1 })}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      On-Click Action:
                    </label>
                    <select
                      value={formData.actionType}
                      onChange={(e) =>
                        setFormData({ ...formData, actionType: e.target.value as AdActionType })
                      }
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    >
                      <option value="NONE">None (Display Only)</option>
                      <option value="EXTERNAL_LINK">Open External Web Link</option>
                      <option value="PITCH_DETAIL">Navigate to Pitch Details</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      {formData.actionType === "EXTERNAL_LINK"
                        ? "Target Web URL:"
                        : formData.actionType === "PITCH_DETAIL"
                        ? "Target Pitch:"
                        : "Target Value:"}
                    </label>
                    {formData.actionType === "PITCH_DETAIL" ? (
                      <select
                        value={formData.actionValue}
                        onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="">Select Pitch...</option>
                        {venues.map((v) => (
                          <option key={v._id || v.id} value={v._id || v.id}>
                            {v.venueName || v.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        disabled={formData.actionType === "NONE"}
                        value={formData.actionValue}
                        onChange={(e) => setFormData({ ...formData, actionValue: e.target.value })}
                        placeholder="https://..."
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/80 dark:bg-gray-800/40">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                ⚡ Changes sync immediately with the mobile app carousel.
              </span>
              <div className="flex items-center gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFormModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                  {submitting ? "Saving..." : editingBanner ? "Update Ad Banner" : "Create Ad Banner"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="max-w-md p-6"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
            <TrashBinIcon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Ad Banner?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you sure you want to remove &quot;{deletingBanner?.title}&quot;? This will immediately remove it from the mobile app carousel.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleDeleteConfirm}
            >
              Yes, Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
