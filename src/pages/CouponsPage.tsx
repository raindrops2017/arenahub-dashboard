import { useState, useEffect, useCallback, useMemo } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  CopyIcon,
  CheckCircleIcon,
  AlertIcon,
  ShootingStarIcon,
  CloseIcon,
} from "../icons";
import { Coupon } from "../types";
import { couponApi, CreateCouponPayload } from "../services/api/couponApi";
import { ModernDatePicker } from "../components/ui/ModernDatePicker";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [discountTypeFilter, setDiscountTypeFilter] = useState<string>("ALL");

  // Modal State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState<CreateCouponPayload>({
    code: "",
    discountType: "percentage",
    discount: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    maxUses: 100,
    isActive: true,
  });
  const [formError, setFormError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await couponApi.getAllCoupons();
      setCoupons(data || []);
    } catch (err) {
      console.error("Failed to load coupons:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData({
      code: "",
      discountType: "percentage",
      discount: 10,
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      maxUses: 100,
      isActive: true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType || "percentage",
      discount: coupon.discount || 0,
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split("T")[0] : "",
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split("T")[0] : "",
      maxUses: coupon.maxUses || 100,
      isActive: coupon.isActive ?? true,
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Save Coupon (Create or Update)
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) {
      setFormError("Coupon code is required.");
      return;
    }
    if (formData.discount <= 0) {
      setFormError("Discount value must be greater than 0.");
      return;
    }
    if (formData.discountType === "percentage" && formData.discount > 100) {
      setFormError("Percentage discount cannot exceed 100%.");
      return;
    }
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setFormError("End date must be after start date.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const normalizedPayload = {
        ...formData,
        code: formData.code.trim().toUpperCase(),
        discount: Number(formData.discount),
        maxUses: Number(formData.maxUses),
      };

      if (editingCoupon) {
        await couponApi.updateCoupon(editingCoupon._id || editingCoupon.id || "", normalizedPayload);
      } else {
        await couponApi.createCoupon(normalizedPayload);
      }

      setIsModalOpen(false);
      await fetchCoupons();
    } catch (err: any) {
      setFormError(err.message || "Failed to save coupon.");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (coupon: Coupon) => {
    try {
      await couponApi.updateCoupon(coupon._id || coupon.id || "", {
        isActive: !coupon.isActive,
      });
      await fetchCoupons();
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async () => {
    if (!deletingCoupon) return;
    setIsDeleting(true);
    try {
      await couponApi.deleteCoupon(deletingCoupon._id || deletingCoupon.id || "");
      setIsDeleteModalOpen(false);
      setDeletingCoupon(null);
      await fetchCoupons();
    } catch (err) {
      console.error("Failed to delete coupon:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered list
  const filteredCoupons = useMemo(() => {
    const now = new Date();
    return coupons.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = q === "" || c.code.toLowerCase().includes(q);

      const isExpired = new Date(c.endDate) < now;
      let matchesStatus = true;
      if (statusFilter === "ACTIVE") {
        matchesStatus = c.isActive && !isExpired;
      } else if (statusFilter === "INACTIVE") {
        matchesStatus = !c.isActive;
      } else if (statusFilter === "EXPIRED") {
        matchesStatus = isExpired;
      }

      let matchesType = true;
      if (discountTypeFilter !== "ALL") {
        matchesType = c.discountType === discountTypeFilter;
      }

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [coupons, searchQuery, statusFilter, discountTypeFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const total = coupons.length;
    const active = coupons.filter((c) => c.isActive && new Date(c.endDate) >= now).length;
    const totalUses = coupons.reduce((sum, c) => sum + (c.usesCount || 0), 0);
    const expired = coupons.filter((c) => new Date(c.endDate) < now).length;

    return { total, active, totalUses, expired };
  }, [coupons]);

  return (
    <>
      <PageMeta
        title="Coupon & Promotional Discounts | VenueOps Dashboard"
        description="Create, configure, and manage promotional discount coupons, percentage discounts, and voucher campaigns."
      />
      <PageBreadcrumb pageTitle="Coupon Management" />

      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Coupons & Discounts
              </h2>
              <Badge color="primary" size="md">
                {metrics.active} Active Promos
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Create and manage promotional discount codes with validity periods, usage caps, and percentage/fixed rates.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={fetchCoupons} size="sm" variant="outline" disabled={loading}>
              🔄 {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button onClick={handleOpenCreateModal} size="sm">
              <PlusIcon className="w-4 h-4 mr-1" /> Create Coupon
            </Button>
          </div>
        </div>

        {/* Metrics Overview Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Total Coupons
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <ShootingStarIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-800 dark:text-white font-mono">
              {metrics.total}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Created voucher codes
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Active Campaigns
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/15 dark:text-success-400">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-success-600 dark:text-success-400 font-mono">
              {metrics.active} Active
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Available for mobile checkout
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Total Redemptions
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {metrics.totalUses} Uses
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Applied customer discounts
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Expired Coupons
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400">
                <AlertIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
              {metrics.expired}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Past expiration date
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by coupon code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white uppercase"
              />
            </div>

            {/* Discount Type Selector */}
            <select
              value={discountTypeFilter}
              onChange={(e) => setDiscountTypeFilter(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="ALL">All Discount Types</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount (EGP)</option>
            </select>

            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {["ALL", "ACTIVE", "INACTIVE", "EXPIRED"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    statusFilter === tab
                      ? "bg-white text-brand-600 shadow-xs dark:bg-gray-700 dark:text-white"
                      : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Coupons Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/80 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Coupon Code</th>
                  <th className="px-6 py-4">Discount Value</th>
                  <th className="px-6 py-4">Validity Range</th>
                  <th className="px-6 py-4">Usage Limit</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredCoupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      {loading ? "Loading coupons..." : "No coupons found matching your criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredCoupons.map((coupon) => {
                    const cId = coupon._id || coupon.id || "";
                    const isExpired = new Date(coupon.endDate) < new Date();
                    const usesPercent = Math.min(100, Math.round(((coupon.usesCount || 0) / (coupon.maxUses || 1)) * 100));

                    return (
                      <tr key={cId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm px-2.5 py-1 bg-brand-50 text-brand-700 border border-brand-200 rounded-lg dark:bg-brand-950/40 dark:text-brand-400 dark:border-brand-800">
                              {coupon.code}
                            </span>
                            <button
                              onClick={() => handleCopy(coupon.code, cId)}
                              className="text-gray-400 hover:text-brand-500 p-0.5"
                              title="Copy Code"
                            >
                              <CopyIcon className="w-4 h-4" />
                            </button>
                            {copiedId === cId && (
                              <span className="text-[10px] text-emerald-500">Copied!</span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {coupon.discountType === "percentage"
                              ? `${coupon.discount}% OFF`
                              : `${coupon.discount} EGP OFF`}
                          </span>
                          <span className="block text-[11px] text-gray-400 uppercase">
                            {coupon.discountType}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs font-mono text-gray-600 dark:text-gray-300">
                          <div>
                            {new Date(coupon.startDate).toLocaleDateString()} &rarr; {new Date(coupon.endDate).toLocaleDateString()}
                          </div>
                          {isExpired ? (
                            <span className="text-[10px] text-red-500 font-bold">Expired</span>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-bold">Valid & Active</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="w-32">
                            <div className="flex justify-between text-xs font-mono mb-1 text-gray-600 dark:text-gray-400">
                              <span>{coupon.usesCount || 0} / {coupon.maxUses}</span>
                              <span>{usesPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${usesPercent >= 100 ? "bg-red-500" : "bg-brand-500"}`}
                                style={{ width: `${usesPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleActive(coupon)}
                            className="flex items-center gap-1.5 focus:outline-none"
                            title="Toggle Active Status"
                          >
                            <span
                              className={`w-3 h-3 rounded-full ${
                                coupon.isActive && !isExpired ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                              }`}
                            />
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                              {coupon.isActive && !isExpired ? "Active" : coupon.isActive ? "Expired" : "Inactive"}
                            </span>
                          </button>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(coupon)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                              title="Edit Coupon"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeletingCoupon(coupon);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                              title="Delete Coupon"
                            >
                              <TrashBinIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── CREATE / EDIT MODAL ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md p-6 bg-white dark:bg-gray-800/95 backdrop-blur-md"
      >
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700/80">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {editingCoupon ? "Edit Discount Coupon" : "Create New Coupon"}
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>

          {formError && (
            <div className="my-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveCoupon} className="space-y-4 my-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Coupon Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER2026"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono font-bold uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Discount Type
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountType: e.target.value as "fixed" | "percentage",
                    })
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (EGP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Discount Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <ModernDatePicker
                  value={formData.startDate}
                  onChange={(val) => setFormData({ ...formData, startDate: val })}
                  placeholder="Pick Start Date"
                  variant="compact"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <ModernDatePicker
                  value={formData.endDate}
                  onChange={(val) => setFormData({ ...formData, endDate: val })}
                  placeholder="Pick End Date"
                  variant="compact"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Max Uses Limit
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isCouponActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 text-brand-600 rounded"
              />
              <label htmlFor="isCouponActive" className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Activate coupon immediately
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <Button size="sm" type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : editingCoupon ? "Save Changes" : "Create Coupon"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="max-w-sm p-6 bg-white dark:bg-gray-800"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
            <TrashBinIcon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Delete Coupon?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-5">
            Are you sure you want to delete coupon <span className="font-mono font-bold text-red-500">{deletingCoupon?.code}</span>? This action cannot be undone.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              Cancel
            </button>
            <Button
              size="sm"
              onClick={handleDeleteCoupon}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
