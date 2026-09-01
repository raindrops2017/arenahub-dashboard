import React, { useState, useEffect } from "react";
import { Calendar, Clock, DollarSign, Tag, Plus, Trash2, CalendarDays, Sparkles } from "lucide-react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { ModernDatePicker } from "../ui/ModernDatePicker";
import { Venue, SportsType, VenueStatus } from "../../types";
import { amenitiesApi } from "../../services/api/amenitiesApi";

const START_HOURS = Array.from({ length: 24 }).map((_, h) => {
  const norm = h % 24;
  const ampm = norm >= 12 ? "PM" : "AM";
  const displayHour = norm % 12 === 0 ? 12 : norm % 12;
  const formatted = `${displayHour.toString().padStart(2, "0")}:00 ${ampm}`;
  return {
    value: h,
    label: `${formatted} (${h.toString().padStart(2, "0")}:00)`,
    display: formatted,
  };
});

const getEndHoursForStart = (startHour: number) => {
  return Array.from({ length: 24 })
    .map((_, i) => {
      const h = i + 1; // 1 to 24
      const isMidnight = h === 24;
      const norm = h % 24;
      const ampm = isMidnight || norm >= 12 ? "PM" : "AM";
      const displayHour = norm % 12 === 0 ? 12 : norm % 12;
      const formatted = isMidnight
        ? "12:00 AM (Midnight / 24:00)"
        : `${displayHour.toString().padStart(2, "0")}:00 ${ampm} (${h.toString().padStart(2, "0")}:00)`;
      return {
        value: h,
        label: formatted,
        display: isMidnight ? "12:00 AM (Midnight)" : `${displayHour}:00 ${ampm}`,
      };
    })
    .filter((opt) => opt.value > startHour);
};

const formatTime12h = (h: number) => {
  if (h === 24) return "12:00 AM (Midnight)";
  const norm = h % 24;
  const ampm = norm >= 12 ? "PM" : "AM";
  const displayHour = norm % 12 === 0 ? 12 : norm % 12;
  return `${displayHour}:00 ${ampm}`;
};

const ALL_SPORTS_TYPES: SportsType[] = [
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
  "Volleyball",
  "BADMINTON",
  "Badminton",
];

const DEFAULT_AMENITIES = [
  "Parking",
  "Shower",
  "WiFi",
  "Lockers",
  "FloodLights",
  "Cafeteria",
  "ChangingRoom",
  "Toilets",
  "DrinkingWater",
  "FirstAid",
  "PrayerArea",
  "EquipmentRental",
];

interface CustomPriceItem {
  hour: number;
  pricePerHour: number;
}

interface CustomDatePriceItem {
  id?: string;
  date: string;
  startHour: number;
  endHour: number;
  pricePerHour: number;
  note?: string;
}

interface VenueFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingVenue: Venue | null;
  onSave: (formData: FormData, isEditing: boolean, venueId?: string) => Promise<void>;
}

export const VenueFormModal: React.FC<VenueFormModalProps> = ({
  isOpen,
  onClose,
  editingVenue,
  onSave,
}) => {
  const [name, setName] = useState("");
  const [sportsTypes, setSportsTypes] = useState<string[]>(["Football", "Padel"]);
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | "">(30.0444);
  const [lng, setLng] = useState<number | "">(31.2357);
  const [startWorkingHours, setStartWorkingHours] = useState<number>(8);
  const [endWorkingHours, setEndWorkingHours] = useState<number>(24);
  const [defaultHourlyPrice, setDefaultHourlyPrice] = useState<number | "">(250);
  const [minimumDepositAmount, setMinimumDepositAmount] = useState<number | "">(0);
  const [customPricingRules, setCustomPricingRules] = useState<CustomPriceItem[]>([]);
  const [customDatePricingRules, setCustomDatePricingRules] = useState<CustomDatePriceItem[]>([]);
  const [availableAmenities, setAvailableAmenities] = useState<string[]>(DEFAULT_AMENITIES);
  const [amenities, setAmenities] = useState<string[]>(["Parking", "FloodLights", "WiFi"]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<VenueStatus>("Active");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hourly Rule Builder Temp State
  const [ruleHour, setRuleHour] = useState<number>(20);
  const [ruleRate, setRuleRate] = useState<number | "">(350);

  // Date Rule Builder Temp State
  const [dateRuleDate, setDateRuleDate] = useState<string>("");
  const [dateRuleStartHour, setDateRuleStartHour] = useState<number>(20);
  const [dateRuleEndHour, setDateRuleEndHour] = useState<number>(24);
  const [dateRuleRate, setDateRuleRate] = useState<number | "">(350);
  const [dateRuleNote, setDateRuleNote] = useState<string>("");

  useEffect(() => {
    if (editingVenue) {
      setName(editingVenue.venueName || editingVenue.name || "");
      const st = editingVenue.sportsType || editingVenue.sportsTypes || ["Football"];
      setSportsTypes(Array.isArray(st) ? st : [st]);
      setAddress(editingVenue.address || "");
      setLat(editingVenue.locationAlt ?? editingVenue.coordinates?.lat ?? 30.0444);
      setLng(editingVenue.locationLang ?? editingVenue.coordinates?.lng ?? 31.2357);
      setStartWorkingHours(Number(editingVenue.startWorkingHours ?? 8));
      setEndWorkingHours(Number(editingVenue.endWorkingHours ?? 24));
      setDefaultHourlyPrice(
        editingVenue.defaultHourPrice ?? editingVenue.defaultHourlyPrice ?? 250
      );
      setMinimumDepositAmount(
        editingVenue.minimumDepositAmount ?? editingVenue.minDeposit ?? 0
      );

      const rules: CustomPriceItem[] = (editingVenue.customHourPrices || []).map((r: any) => ({
        hour: Number(r.hour ?? 18),
        pricePerHour: Number(r.pricePerHour ?? 300),
      }));
      setCustomPricingRules(rules);

      const dateRules: CustomDatePriceItem[] = (editingVenue.customDatePrices || []).map((r: any) => ({
        id: r.id || r._id,
        date: typeof r.date === "string" ? r.date.split("T")[0] : new Date(r.date).toISOString().split("T")[0],
        startHour: Number(r.startHour ?? 20),
        endHour: Number(r.endHour ?? 24),
        pricePerHour: Number(r.pricePerHour ?? 350),
        note: r.note || "",
      }));
      setCustomDatePricingRules(dateRules);

      // Amenities
      if (Array.isArray(editingVenue.amenities)) {
        setAmenities(editingVenue.amenities);
      } else if (typeof editingVenue.amenities === "object" && editingVenue.amenities) {
        setAmenities(
          Object.entries(editingVenue.amenities)
            .filter(([_, v]) => !!v)
            .map(([k]) => k)
        );
      }

      setExistingImages(editingVenue.images || editingVenue.imageUrls || []);
      setRemovedImages([]);
      setSelectedFiles([]);
      setStatus(editingVenue.isActive !== false ? "Active" : "Inactive");
      setErrorMsg("");
    } else {
      // Default creation state
      setName("");
      setSportsTypes(["Football", "Padel"]);
      setAddress("123 Stadium Road, Cairo");
      setLat(30.0444);
      setLng(31.2357);
      setStartWorkingHours(8);
      setEndWorkingHours(24);
      setDefaultHourlyPrice(250);
      setMinimumDepositAmount(0);
      setCustomPricingRules([
        { hour: 19, pricePerHour: 350 },
        { hour: 20, pricePerHour: 350 },
        { hour: 21, pricePerHour: 350 },
      ]);
      setCustomDatePricingRules([]);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDateRuleDate(tomorrow.toISOString().split("T")[0]);
      setDateRuleStartHour(20);
      setDateRuleEndHour(24);
      setDateRuleRate(350);
      setDateRuleNote("");
      setAmenities(["Parking", "FloodLights", "WiFi", "Shower"]);
      setExistingImages([]);
      setRemovedImages([]);
      setSelectedFiles([]);
      setStatus("Active");
      setErrorMsg("");
    }

    if (isOpen) {
      amenitiesApi
        .findAll()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : res?.data || [];
          if (list.length > 0) {
            const names = list
              .map((a: any) => a.name || a.title || a.nameEn || (typeof a === "string" ? a : ""))
              .filter(Boolean);
            if (names.length > 0) {
              setAvailableAmenities(names);
            }
          }
        })
        .catch(() => {});
    }
  }, [editingVenue, isOpen]);

  const handleToggleSport = (sport: string) => {
    if (sportsTypes.includes(sport)) {
      if (sportsTypes.length === 1) return;
      setSportsTypes(sportsTypes.filter((s) => s !== sport));
    } else {
      setSportsTypes([...sportsTypes, sport]);
    }
  };

  const handleToggleAmenity = (amenity: string) => {
    if (amenities.includes(amenity)) {
      setAmenities(amenities.filter((a) => a !== amenity));
    } else {
      setAmenities([...amenities, amenity]);
    }
  };

  const handleAddPricingRule = () => {
    if (!ruleRate || Number(ruleRate) <= 0) {
      setErrorMsg("Custom pricing rate must be greater than 0");
      return;
    }
    const exists = customPricingRules.some((r) => r.hour === ruleHour);
    if (exists) {
      setCustomPricingRules(
        customPricingRules.map((r) =>
          r.hour === ruleHour ? { ...r, pricePerHour: Number(ruleRate) } : r
        )
      );
    } else {
      setCustomPricingRules([
        ...customPricingRules,
        { hour: ruleHour, pricePerHour: Number(ruleRate) },
      ]);
    }
    setErrorMsg("");
  };

  const handleRemovePricingRule = (hour: number) => {
    setCustomPricingRules(customPricingRules.filter((r) => r.hour !== hour));
  };

  const handleAddDatePricingRule = () => {
    if (!dateRuleDate || !/^\d{4}-\d{2}-\d{2}$/.test(dateRuleDate)) {
      setErrorMsg("Please choose a valid date in YYYY-MM-DD format");
      return;
    }
    if (dateRuleStartHour < 0 || dateRuleStartHour > 23) {
      setErrorMsg("Start hour must be between 0 and 23");
      return;
    }
    if (dateRuleEndHour <= dateRuleStartHour || dateRuleEndHour > 24) {
      setErrorMsg("End hour must be greater than start hour and up to 24");
      return;
    }
    if (!dateRuleRate || Number(dateRuleRate) <= 0) {
      setErrorMsg("Custom date price per hour must be greater than 0");
      return;
    }

    const newRule: CustomDatePriceItem = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: dateRuleDate,
      startHour: Number(dateRuleStartHour),
      endHour: Number(dateRuleEndHour),
      pricePerHour: Number(dateRuleRate),
      note: dateRuleNote.trim() || undefined,
    };

    setCustomDatePricingRules([
      ...customDatePricingRules.filter(
        (r) =>
          !(
            r.date === dateRuleDate &&
            r.startHour === dateRuleStartHour &&
            r.endHour === dateRuleEndHour
          )
      ),
      newRule,
    ]);
    setDateRuleNote("");
    setErrorMsg("");
  };

  const handleRemoveDatePricingRule = (index: number) => {
    setCustomDatePricingRules(customDatePricingRules.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = (indexToRemove: number) => {
    const target = existingImages[indexToRemove];
    if (target) {
      setRemovedImages((prev) => [...prev, target]);
    }
    setExistingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleRemoveSelectedFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 10);
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 10));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Venue Name is required");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Address is required");
      return;
    }
    if (lat === "" || isNaN(Number(lat)) || lng === "" || isNaN(Number(lng))) {
      setErrorMsg("Valid Latitude and Longitude coordinates are required");
      return;
    }
    if (!defaultHourlyPrice || Number(defaultHourlyPrice) <= 0) {
      setErrorMsg("Default Hourly Price must be greater than 0");
      return;
    }
    if (minimumDepositAmount !== "" && (isNaN(Number(minimumDepositAmount)) || Number(minimumDepositAmount) < 0)) {
      setErrorMsg("Minimum Deposit Amount must be 0 or a positive number");
      return;
    }
    if (sportsTypes.length === 0) {
      setErrorMsg("Select at least one Sports Type");
      return;
    }

    const formData = new FormData();
    formData.append("venueName", name.trim());
    formData.append("address", address.trim());
    formData.append("locationAlt", String(Number(lat)));
    formData.append("locationLang", String(Number(lng)));
    formData.append("startWorkingHours", String(startWorkingHours));
    formData.append("endWorkingHours", String(endWorkingHours));
    formData.append("defaultHourPrice", String(Number(defaultHourlyPrice)));
    formData.append("minimumDepositAmount", String(minimumDepositAmount === "" ? 0 : Number(minimumDepositAmount)));
    formData.append("isActive", String(status === "Active"));

    // sportsType as array fields or JSON
    sportsTypes.forEach((st) => {
      formData.append("sportsType", st);
    });

    // amenities as array fields
    amenities.forEach((am) => {
      formData.append("amenities", am);
    });

    // customHourPrices as JSON array string
    const sanitizedHourRules = customPricingRules.map((r) => ({
      hour: Number(r.hour),
      pricePerHour: Number(r.pricePerHour),
    }));
    formData.append("customHourPrices", JSON.stringify(sanitizedHourRules));

    // customDatePrices as JSON array string
    const sanitizedDateRules = customDatePricingRules.map((r) => ({
      date: r.date,
      startHour: Number(r.startHour),
      endHour: Number(r.endHour),
      pricePerHour: Number(r.pricePerHour),
      note: r.note || undefined,
    }));
    formData.append("customDatePrices", JSON.stringify(sanitizedDateRules));

    // Send Kept / Remaining Existing Images to Backend
    formData.append("existingImages", JSON.stringify(existingImages));
    existingImages.forEach((img) => {
      formData.append("keepImages", img);
    });

    // Send Removed Images to Backend
    if (removedImages.length > 0) {
      formData.append("removedImages", JSON.stringify(removedImages));
      removedImages.forEach((img) => {
        formData.append("deleteImages", img);
      });
    }

    // New Images to Upload
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onSave(
        formData,
        !!editingVenue,
        editingVenue?._id || editingVenue?.id
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save venue to server");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-3xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 dark:border-gray-800 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingVenue ? `Edit Venue: ${editingVenue.venueName || editingVenue.name}` : "Create New Sports Venue"}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Multi-image uploads, GPS coordinates, operating hours, and custom peak pricing.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Venue Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Camp Nou Arena Cairo"
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Physical Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Stadium Road, District 5, Cairo"
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Latitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              required
              value={lat}
              onChange={(e) => setLat(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Longitude <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.0001"
              required
              value={lng}
              onChange={(e) => setLng(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
            />
          </div>
        </div>

        {/* Sports Types */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
            Supported Sports Types <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SPORTS_TYPES.map((sport) => {
              const isSelected = sportsTypes.includes(sport);
              return (
                <button
                  type="button"
                  key={sport}
                  onClick={() => handleToggleSport(sport)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-brand-500 border-brand-500 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {isSelected ? "✓ " : "+ "}
                  {sport}
                </button>
              );
            })}
          </div>
        </div>

        {/* Operating Hours & Base Price */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              ⏰ Operating Hours & Base Pricing
            </div>
            <button
              type="button"
              onClick={() => {
                setStartWorkingHours(0);
                setEndWorkingHours(24);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                startWorkingHours === 0 && endWorkingHours === 24
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-emerald-500 hover:text-emerald-600"
              }`}
            >
              ⚡ 24 Hours (Open 24/7)
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Opening Hour
              </label>
              <select
                value={startWorkingHours}
                onChange={(e) => setStartWorkingHours(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer shadow-xs"
              >
                {START_HOURS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-1 text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Closing Hour
              </label>
              <select
                value={endWorkingHours}
                onChange={(e) => setEndWorkingHours(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white cursor-pointer shadow-xs"
              >
                {Array.from({ length: 25 }).map((_, i) => (
                  <option key={i} value={i}>
                    {i === 24
                      ? "24:00 (Midnight / 12:00 AM)"
                      : `${i}:00 (${i >= 12 ? (i === 12 ? "12 PM" : `${i - 12} PM`) : i === 0 ? "12 AM" : `${i} AM`})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Base Price / Hour (EGP) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={defaultHourlyPrice}
                onChange={(e) => setDefaultHourlyPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Minimum Deposit Per Slot (EGP)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={minimumDepositAmount}
                onChange={(e) =>
                  setMinimumDepositAmount(e.target.value === "" ? "" : Number(e.target.value))
                }
                placeholder="e.g. 100 (0 for full payment)"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 block mt-1">
                0 = full payment upfront
              </span>
            </div>
          </div>
        </div>

        {/* Peak Hourly Price Overrides */}
        <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              ⚡ Custom Peak Hourly Rates
            </div>
            <span className="text-[11px] text-gray-500">
              {customPricingRules.length} hour overrides
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-32">
              <label className="block text-[11px] text-gray-500 mb-1">Hour (24h)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={ruleHour}
                onChange={(e) => setRuleHour(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="w-36">
              <label className="block text-[11px] text-gray-500 mb-1">Price (EGP)</label>
              <input
                type="number"
                min="1"
                value={ruleRate}
                onChange={(e) => setRuleRate(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="350"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="pt-4">
              <button
                type="button"
                onClick={handleAddPricingRule}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white transition-colors"
              >
                + Add Override
              </button>
            </div>
          </div>

          {customPricingRules.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              {customPricingRules.map((rule) => (
                <div
                  key={rule.hour}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {rule.hour}:00 ➔ {rule.pricePerHour} EGP
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePricingRule(rule.hour)}
                    className="text-red-500 hover:text-red-700 font-bold ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Special Date-Specific Pricing (customDatePrices) */}
        <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Special Date-Specific Pricing (customDatePrices)
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Custom rates for specific calendar dates & time windows. Outside window, falls back to peak/default rates.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {customDatePricingRules.length} Rule(s)
            </span>
          </div>

          {/* Modern Interactive Date & Time Picker Builder */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/30 dark:from-emerald-950/40 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-800/50 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
              
              {/* Modern Date Picker */}
              <div className="lg:col-span-3">
                <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Select Date
                </label>
                <ModernDatePicker
                  value={dateRuleDate}
                  onChange={setDateRuleDate}
                  placeholder="Pick Date"
                />
              </div>

              {/* Modern Start Time Picker */}
              <div className="lg:col-span-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  From (Start Time)
                </label>
                <select
                  value={dateRuleStartHour}
                  onChange={(e) => {
                    const start = Number(e.target.value);
                    setDateRuleStartHour(start);
                    if (dateRuleEndHour <= start) {
                      setDateRuleEndHour(Math.min(24, start + 1));
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition cursor-pointer shadow-xs"
                >
                  {START_HOURS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modern End Time Picker */}
              <div className="lg:col-span-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  To (End Time)
                </label>
                <select
                  value={dateRuleEndHour}
                  onChange={(e) => setDateRuleEndHour(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition cursor-pointer shadow-xs"
                >
                  {getEndHoursForStart(dateRuleStartHour).map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Per Hour Input */}
              <div className="lg:col-span-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Price / Hr (EGP)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    placeholder="350"
                    value={dateRuleRate}
                    onChange={(e) => setDateRuleRate(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 pr-10 text-xs font-bold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono shadow-xs"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                    EGP
                  </span>
                </div>
              </div>

              {/* Tag / Note */}
              <div className="lg:col-span-2">
                <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Note / Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Weekend Peak"
                  value={dateRuleNote}
                  onChange={(e) => setDateRuleNote(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-xs"
                />
              </div>

              {/* Add Button */}
              <div className="lg:col-span-1">
                <button
                  type="button"
                  onClick={handleAddDatePricingRule}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm active:scale-[0.98]"
                  title="Add Date Rule"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Live Preview Summary Bar */}
            {dateRuleDate && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  Preview: <strong>{dateRuleDate}</strong> ({formatTime12h(dateRuleStartHour)} ➔ {formatTime12h(dateRuleEndHour)}) @ <strong>{dateRuleRate || 0} EGP/hr</strong>
                </span>
              </div>
            )}
          </div>

          {/* Configured Rules Grid */}
          {customDatePricingRules.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {customDatePricingRules.map((rule, idx) => (
                <div
                  key={rule.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 text-xs shadow-xs hover:shadow-sm transition"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gray-900 dark:text-white inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {rule.date}
                      </span>
                      {rule.note && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 truncate max-w-[100px]">
                          {rule.note}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400 flex items-center gap-1 text-[11px]">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{formatTime12h(rule.startHour)} ➔ {formatTime12h(rule.endHour)}</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 ml-1">({rule.pricePerHour} EGP)</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveDatePricingRule(idx)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition ml-1 shrink-0"
                    title="Delete rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Amenities */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
            Venue Amenities & Features
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {availableAmenities.map((amenity) => {
              const isSelected = amenities.includes(amenity);
              return (
                <label
                  key={amenity}
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-all ${
                    isSelected
                      ? "bg-brand-50 dark:bg-brand-950/40 border-brand-300 dark:border-brand-800 text-brand-700 dark:text-brand-300 font-semibold"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleAmenity(amenity)}
                    className="rounded text-brand-500 focus:ring-brand-400"
                  />
                  {amenity}
                </label>
              );
            })}
          </div>
        </div>

        {/* Photo Upload & Image Management */}
        <div className="space-y-4 rounded-xl bg-gray-50 dark:bg-gray-800/40 p-4 border border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                📸 Venue Photo Gallery
              </label>
              <span className="text-[11px] text-gray-500">
                {existingImages.length} active image(s)
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
              Upload multi-angle venue photos. Click the delete button on any image to remove it from the venue.
            </p>

            <input
              type="file"
              multiple
              accept="image/png, image/jpeg, image/jpg, image/webp"
              onChange={handleFileChange}
              className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-500 file:text-white hover:file:bg-brand-600 dark:file:bg-brand-500 dark:file:text-white cursor-pointer border border-gray-300 dark:border-gray-700 rounded-lg p-1.5 bg-white dark:bg-gray-900"
            />
          </div>

          {/* Existing Photos with Delete Action */}
          {existingImages.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                Current Venue Images:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {existingImages.map((url, i) => (
                  <div
                    key={url + i}
                    className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900 aspect-video shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`Venue photo ${i + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80";
                      }}
                    />
                    <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white backdrop-blur-sm border border-white/10">
                      {i === 0 ? "Cover #1" : `#${i + 1}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(i)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center text-xs font-black shadow-md transition-transform hover:scale-110 cursor-pointer"
                      title="Remove this photo from venue"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Selected Files Preview with Cancel/Remove */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 block">
                New Photos Selected for Upload ({selectedFiles.length}):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {selectedFiles.map((file, idx) => {
                  const previewUrl = URL.createObjectURL(file);
                  return (
                    <div
                      key={file.name + idx}
                      className="relative rounded-xl overflow-hidden border border-brand-400 dark:border-brand-600 bg-gray-900 aspect-video shadow-sm"
                    >
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-brand-600/90 text-[10px] font-bold text-white backdrop-blur-sm truncate max-w-[70%]">
                        New
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(idx)}
                        className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-gray-800/90 hover:bg-red-600 text-white flex items-center justify-center text-xs font-black shadow-md transition-colors cursor-pointer"
                        title="Cancel this photo"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
            Operational Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as VenueStatus)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="Active">Active (Open for Bookings)</option>
            <option value="Inactive">Inactive (Closed / Maintenance)</option>
          </select>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <Button size="md" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : editingVenue
              ? "Save Changes"
              : "Create Venue"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VenueFormModal;


