import React from "react";
import { Modal } from "../ui/modal";
import Badge from "../ui/badge/Badge";
import { PencilIcon, TrashBinIcon, TimeIcon, DollarLineIcon } from "../../icons";
import { Venue } from "../../types";

interface VenueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  onEdit: (venue: Venue) => void;
  onDelete: (venue: Venue) => void;
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({
  isOpen,
  onClose,
  venue,
  onEdit,
  onDelete,
}) => {
  if (!venue) return null;

  const defaultPrice = venue.defaultHourPrice ?? venue.defaultHourlyPrice ?? venue.pricing?.defaultPricePerHour ?? 200;
  const depositAmount = venue.minimumDepositAmount ?? venue.minDeposit ?? 0;
  const customRules = venue.customHourPrices || venue.customHourlyPrices || venue.pricing?.customHourlyRates || [];
  const gallery = (venue.images && venue.images.length > 0) ? venue.images : ((venue.imageUrls && venue.imageUrls.length > 0) ? venue.imageUrls : ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80"]);
  const [activePhotoIdx, setActivePhotoIdx] = React.useState(0);

  React.useEffect(() => {
    setActivePhotoIdx(0);
  }, [venue]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Active":
        return "success";
      case "Maintenance":
        return "warning";
      case "Inactive":
        return "error";
      default:
        return "info";
    }
  };

  const amenityList: string[] = Array.isArray(venue.amenities)
    ? venue.amenities
    : typeof venue.amenities === "object" && venue.amenities
    ? Object.entries(venue.amenities)
        .filter(([_, val]) => !!val)
        .map(([key]) => key)
    : [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
      <div className="space-y-6">
        {/* Gallery / Hero Cover & Multi-Photo Strip */}
        <div className="space-y-2">
          <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-900">
            <img
              src={gallery[activePhotoIdx] || gallery[0]}
              alt={venue.venueName || venue.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80";
              }}
            />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              {gallery.length > 1 && (
                <span className="rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-xs font-bold text-white border border-white/20">
                  {activePhotoIdx + 1} / {gallery.length} Photos
                </span>
              )}
              <Badge color={getStatusColor(venue.status || (venue.isActive ? "Active" : "Inactive"))} size="md">
                {venue.status || (venue.isActive ? "Active" : "Inactive")}
              </Badge>
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((imgUrl, idx) => (
                <button
                  type="button"
                  key={imgUrl + idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`relative h-14 w-20 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activePhotoIdx === idx
                      ? "border-brand-500 ring-2 ring-brand-400/50 scale-105"
                      : "border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`Thumb ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Header Title & Sports Pills */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {venue.venueName || venue.name}
          </h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {(venue.sportsType || venue.sportsTypes)?.map((sport) => (
              <span
                key={sport}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400 border border-brand-200 dark:border-brand-800"
              >
                ⚽ {sport}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            📍 {venue.address}
          </p>
          {(venue.locationAlt !== undefined || venue.coordinates?.lat !== undefined) && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-mono">
              GPS: Lat {(venue.locationAlt ?? venue.coordinates?.lat ?? 30.0444).toFixed(4)}, Lng {(venue.locationLang ?? venue.coordinates?.lng ?? 31.2357).toFixed(4)}
            </p>
          )}
        </div>

        {/* Operating Hours & Pricing Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 border border-gray-200 dark:bg-gray-800/60 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              <TimeIcon className="w-4 h-4 text-brand-500" /> OPERATING HOURS
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {venue.workingHours?.openTime || `${venue.startWorkingHours}:00`} - {venue.workingHours?.closeTime || `${venue.endWorkingHours}:00`}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {venue.endWorkingHours - venue.startWorkingHours} hours / day open
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              <DollarLineIcon className="w-4 h-4 text-brand-500" /> STANDARD HOURLY RATE
            </div>
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
              {defaultPrice} EGP <span className="text-xs font-normal text-gray-500">/ hour</span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Custom rules: {customRules.length} override(s)
            </p>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              <DollarLineIcon className="w-4 h-4 text-brand-500" /> MINIMUM DEPOSIT / SLOT
            </div>
            <p className="text-lg font-bold text-brand-600 dark:text-brand-400">
              {depositAmount > 0 ? `${depositAmount} EGP` : "0 EGP"}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {depositAmount > 0 ? `${depositAmount} EGP (Deposit)` : "0 EGP (Full Payment)"}
            </p>
          </div>
        </div>

        {/* Custom Pricing Rules Detail */}
        {customRules.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Peak Hourly Pricing Overrides
            </h4>
            <div className="space-y-2">
              {customRules.map((rule: any, idx: number) => (
                <div
                  key={rule.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-gray-100/70 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Hour {rule.hour !== undefined ? `${rule.hour}:00` : `${rule.startHour} - ${rule.endHour}`}
                  </span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    {rule.pricePerHour} EGP/hr
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        {amenityList.length > 0 && (
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Amenities & Facilities
            </h4>
            <div className="flex flex-wrap gap-2">
              {amenityList.map((amenity) => (
                <span
                  key={amenity}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 flex items-center gap-1"
                >
                  <span className="text-success-500 font-bold">✓</span> {amenity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete(venue);
            }}
            className="px-3.5 py-2 text-xs font-medium text-error-600 hover:text-error-700 hover:bg-error-50 dark:hover:bg-error-950/30 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <TrashBinIcon className="w-4 h-4" /> Delete Venue
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(venue);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <PencilIcon className="w-4 h-4" /> Edit Venue
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default VenueDetailModal;
