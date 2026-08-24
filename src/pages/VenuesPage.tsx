import { useState, useEffect, useMemo, useCallback } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import {
  PlusIcon,
  PencilIcon,
  TrashBinIcon,
  EyeIcon,
  GridIcon,
  ListIcon,
} from "../icons";
import { Venue, SportsType } from "../types";
import { venueApi } from "../services/api/venueApi";
import { VenueFormModal } from "../components/venue/VenueFormModal";
import { DeleteVenueModal } from "../components/venue/DeleteVenueModal";
import { VenueDetailModal } from "../components/venue/VenueDetailModal";

const ALL_SPORTS: (SportsType | "ALL")[] = [
  "ALL",
  "5-A-SIDE",
  "7-A-SIDE",
  "11-A-SIDE",
  "Football",
  "PADEL",
  "Padel",
  "BASKETBALL",
  "Basketball",
  "TENNIS",
  "Tennis",
  "VOLLEYBALL",
  "BADMINTON",
];

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingVenue, setDeletingVenue] = useState<Venue | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingVenue, setViewingVenue] = useState<Venue | null>(null);

  const refreshVenues = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await venueApi.getAllVenues();
      setVenues(data);
    } catch (err: any) {
      console.error("Error fetching venues:", err);
      setErrorMsg(err.message || "Failed to load venues from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVenues();
  }, [refreshVenues]);

  // Filter logic
  const filteredVenues = useMemo(() => {
    return venues.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const name = (v.venueName || v.name || "").toLowerCase();
      const addr = (v.address || "").toLowerCase();
      const matchesQuery = !q || name.includes(q) || addr.includes(q);

      const sTypes = v.sportsType || v.sportsTypes || [];
      const matchesSport =
        sportFilter === "ALL" ||
        sTypes.some((s) => s.toLowerCase() === sportFilter.toLowerCase());

      const isActive = v.isActive !== false;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "Active" ? isActive : !isActive);

      return matchesQuery && matchesSport && matchesStatus;
    });
  }, [venues, searchQuery, sportFilter, statusFilter]);

  // Metrics summary
  const metrics = useMemo(() => {
    const totalVenues = venues.length;
    const activeVenues = venues.filter((v) => v.isActive !== false).length;
    const allSports = new Set<string>();
    let totalPriceSum = 0;

    venues.forEach((v) => {
      const sTypes = v.sportsType || v.sportsTypes || [];
      sTypes.forEach((s) => allSports.add(s));
      const price = v.defaultHourPrice ?? v.defaultHourlyPrice ?? 0;
      totalPriceSum += price;
    });

    const activeSportsCount = allSports.size;
    const avgPrice = totalVenues > 0 ? Math.round(totalPriceSum / totalVenues) : 0;

    return {
      totalVenues,
      activeVenues,
      activeSportsCount,
      avgPrice,
    };
  }, [venues]);

  // Actions
  const handleOpenCreate = () => {
    setEditingVenue(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (venue: Venue) => {
    setEditingVenue(venue);
    setIsFormModalOpen(true);
  };

  const handleOpenDelete = (venue: Venue) => {
    setDeletingVenue(venue);
    setIsDeleteModalOpen(true);
  };

  const handleOpenDetail = (venue: Venue) => {
    setViewingVenue(venue);
    setIsDetailModalOpen(true);
  };

  const handleSaveVenueSubmit = async (
    formData: FormData,
    isEditing: boolean,
    venueId?: string
  ) => {
    if (isEditing && venueId) {
      await venueApi.updateVenue(venueId, formData);
    } else {
      await venueApi.createVenue(formData);
    }
    await refreshVenues();
  };

  const handleConfirmDeleteSubmit = async (venueId: string) => {
    try {
      await venueApi.deleteVenue(venueId);
      await refreshVenues();
    } catch (err: any) {
      alert(err.message || "Failed to delete venue");
    }
  };

  const getStatusColor = (isActive?: boolean) => {
    return isActive !== false ? "success" : "error";
  };

  return (
    <>
      <PageMeta
        title="Live Sports Venues Management | VenueOps"
        description="Live NestJS backend connected venue management with S3 multi-image uploads."
      />

      <PageBreadcrumb pageTitle="Venue Management" />

      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
                  Venue & Pitch Management
                </h1>
                <Badge color="primary" size="md">
                  {venues.length} Live Venues
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Connected to live NestJS backend. Multi-image S3 storage, custom hourly rates, and working hours.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={refreshVenues}
                size="sm"
                variant="outline"
                disabled={loading}
              >
                🔄 {loading ? "Loading..." : "Refresh"}
              </Button>
              <Button
                onClick={handleOpenCreate}
                startIcon={<PlusIcon className="w-5 h-5" />}
                size="md"
              >
                Add Venue
              </Button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-gray-100 pt-6 dark:border-gray-800 sm:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                TOTAL VENUES
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.totalVenues}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                OPERATING / ACTIVE
              </span>
              <p className="mt-1 text-2xl font-bold text-success-600 dark:text-success-400">
                {metrics.activeVenues}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                ACTIVE SPORTS TYPES
              </span>
              <p className="mt-1 text-2xl font-bold text-brand-600 dark:text-brand-400">
                {metrics.activeSportsCount} Types
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                AVG HOURLY RATE
              </span>
              <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.avgPrice} <span className="text-xs font-normal text-gray-500">EGP/hr</span>
              </p>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button
              onClick={refreshVenues}
              className="font-bold underline ml-4 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between shadow-sm">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search venue by name or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Sport Filter */}
            <select
              value={sportFilter}
              onChange={(e) => setSportFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {ALL_SPORTS.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Sports Types" : s}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded ${
                viewMode === "grid"
                  ? "bg-gray-100 text-brand-600 dark:bg-gray-800 dark:text-brand-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="Grid View"
            >
              <GridIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded ${
                viewMode === "table"
                  ? "bg-gray-100 text-brand-600 dark:bg-gray-800 dark:text-brand-400"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
              title="Table View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Venues Grid / Table Content */}
        {loading && venues.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Loading venues from live backend...
            </p>
          </div>
        ) : filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-center">
            <span className="text-4xl mb-3">🏟️</span>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              No Venues Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mb-4">
              {searchQuery || sportFilter !== "ALL" || statusFilter !== "ALL"
                ? "Try adjusting your search queries or filter options."
                : "Get started by creating your first sports venue on the server."}
            </p>
            <Button onClick={handleOpenCreate} size="sm">
              Create Venue
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVenues.map((venue) => {
              const defaultPrice = venue.defaultHourPrice ?? venue.defaultHourlyPrice ?? 250;
              const customRules = venue.customHourPrices || [];
              const coverImg =
                venue.images && venue.images.length > 0
                  ? venue.images[0]
                  : "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80";
              const sTypes = venue.sportsType || venue.sportsTypes || [];
              const isActive = venue.isActive !== false;

              return (
                <div
                  key={venue._id || venue.id}
                  className="rounded-2xl border border-gray-200 bg-white overflow-hidden dark:border-gray-800 dark:bg-gray-900 hover:shadow-lg transition-shadow flex flex-col"
                >
                  {/* Card Cover Header */}
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img
                      src={coverImg}
                      alt={venue.venueName || venue.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                    <div className="absolute top-3 right-3">
                      <Badge color={getStatusColor(isActive)} size="sm">
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">
                        {venue.venueName || venue.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        📍 {venue.address}
                      </p>

                      {/* Sports Pills */}
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {sTypes.map((sport) => (
                          <span
                            key={sport}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800"
                          >
                            {sport}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Schedule & Pricing Row */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block text-[10px] font-semibold uppercase">
                          HOURLY RATE
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {defaultPrice} EGP
                        </span>
                        {customRules.length > 0 && (
                          <span className="block text-[10px] text-brand-500 font-medium">
                            +{customRules.length} peak rule(s)
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400 dark:text-gray-500 block text-[10px] font-semibold uppercase">
                          WORKING HOURS
                        </span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {venue.startWorkingHours}:00 - {venue.endWorkingHours}:00
                        </span>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenDetail(venue)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                      >
                        <EyeIcon className="w-4 h-4" /> View Details
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(venue)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Edit Venue"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(venue)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-error-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                          title="Delete Venue"
                        >
                          <TrashBinIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View Mode */
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 shadow-sm">
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-800 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Venue Details</th>
                    <th className="px-6 py-4">Sports Types</th>
                    <th className="px-6 py-4">Address & Coordinates</th>
                    <th className="px-6 py-4">Working Hours</th>
                    <th className="px-6 py-4">Hourly Rate</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredVenues.map((venue) => {
                    const defaultPrice = venue.defaultHourPrice ?? venue.defaultHourlyPrice ?? 250;
                    const coverImg =
                      venue.images && venue.images.length > 0
                        ? venue.images[0]
                        : "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80";
                    const sTypes = venue.sportsType || venue.sportsTypes || [];
                    const isActive = venue.isActive !== false;

                    return (
                      <tr key={venue._id || venue.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={coverImg}
                              alt={venue.venueName || venue.name}
                              className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80";
                              }}
                            />
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">
                                {venue.venueName || venue.name}
                              </p>
                              <span className="text-xs text-gray-400 font-mono">
                                ID: {venue._id || venue.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {sTypes.map((sport) => (
                              <span
                                key={sport}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {sport}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-1 max-w-[200px]">
                            {venue.address}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            Lat: {(venue.locationAlt ?? 30.0444).toFixed(3)}, Lng: {(venue.locationLang ?? 31.2357).toFixed(3)}
                          </p>
                        </td>

                        <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300">
                          {venue.startWorkingHours}:00 - {venue.endWorkingHours}:00
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            {defaultPrice} EGP
                          </span>
                          <span className="text-xs text-gray-500"> / hr</span>
                        </td>

                        <td className="px-6 py-4">
                          <Badge color={getStatusColor(isActive)} size="sm">
                            {isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenDetail(venue)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(venue)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Edit Venue"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(venue)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-error-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Delete Venue"
                            >
                              <TrashBinIcon className="w-4 h-4" />
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

      {/* Form Modal (Create / Edit) */}
      <VenueFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        editingVenue={editingVenue}
        onSave={handleSaveVenueSubmit}
      />

      {/* Delete Confirmation Modal */}
      <DeleteVenueModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        venue={deletingVenue}
        onConfirmDelete={handleConfirmDeleteSubmit}
      />

      {/* Quick Detail View Modal */}
      <VenueDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        venue={viewingVenue}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
      />
    </>
  );
}
