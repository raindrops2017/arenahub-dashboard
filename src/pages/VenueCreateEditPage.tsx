import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { Calendar, Clock, DollarSign, Tag, Plus, Trash2, CalendarDays, Sparkles } from "lucide-react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import Button from "../components/ui/button/Button";
import { LocationMapPicker } from "../components/venue/LocationMapPicker";
import { ModernDatePicker } from "../components/ui/ModernDatePicker";
import { Venue, SportsType, VenueStatus } from "../types";
import { venueApi, resolveVenueImageUrl } from "../services/api/venueApi";
import { amenitiesApi } from "../services/api/amenitiesApi";

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

export default function VenueCreateEditPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form State
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

  // Custom Hourly Pricing Builder Temp State
  const [ruleHour, setRuleHour] = useState<number>(20);
  const [ruleRate, setRuleRate] = useState<number | "">(350);

  // Custom Date Pricing Builder Temp State
  const [dateRuleDate, setDateRuleDate] = useState<string>("");
  const [dateRuleStartHour, setDateRuleStartHour] = useState<number>(20);
  const [dateRuleEndHour, setDateRuleEndHour] = useState<number>(24);
  const [dateRuleRate, setDateRuleRate] = useState<number | "">(350);
  const [dateRuleNote, setDateRuleNote] = useState<string>("");

  // Load amenities dictionary
  useEffect(() => {
    amenitiesApi
      .findAll()
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const names = data.map((a: any) => a.name || a.amenityKey).filter(Boolean);
          if (names.length > 0) setAvailableAmenities(names);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch existing venue if in edit mode
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      venueApi
        .getVenueById(id)
        .then((venue: Venue) => {
          setName(venue.venueName || venue.name || "");
          const st = venue.sportsType || venue.sportsTypes || ["Football"];
          setSportsTypes(Array.isArray(st) ? st : [st]);
          setAddress(venue.address || "");
          setLat(venue.locationAlt ?? venue.coordinates?.lat ?? 30.0444);
          setLng(venue.locationLang ?? venue.coordinates?.lng ?? 31.2357);
          setStartWorkingHours(Number(venue.startWorkingHours ?? 8));
          setEndWorkingHours(Number(venue.endWorkingHours ?? 24));
          setDefaultHourlyPrice(
            venue.defaultHourPrice ?? venue.defaultHourlyPrice ?? 250
          );
          setMinimumDepositAmount(
            venue.minimumDepositAmount ?? venue.minDeposit ?? 0
          );

          const rules: CustomPriceItem[] = (venue.customHourPrices || []).map((r: any) => ({
            hour: Number(r.hour ?? 18),
            pricePerHour: Number(r.pricePerHour ?? 300),
          }));
          setCustomPricingRules(rules);

          const dateRules: CustomDatePriceItem[] = (venue.customDatePrices || []).map((r: any) => ({
            id: r.id || r._id,
            date: typeof r.date === "string" ? r.date.split("T")[0] : new Date(r.date).toISOString().split("T")[0],
            startHour: Number(r.startHour ?? 20),
            endHour: Number(r.endHour ?? 24),
            pricePerHour: Number(r.pricePerHour ?? 350),
            note: r.note || "",
          }));
          setCustomDatePricingRules(dateRules);

          if (venue.amenities && typeof venue.amenities === "object") {
            if (Array.isArray(venue.amenities)) {
              setAmenities(venue.amenities);
            } else {
              const active = Object.entries(venue.amenities)
                .filter(([_, val]) => Boolean(val))
                .map(([key]) => key);
              setAmenities(active);
            }
          }

          const imgs: string[] = [];
          const anyVenue = venue as any;
          if (anyVenue.image) imgs.push(anyVenue.image);
          if (Array.isArray(venue.images)) imgs.push(...venue.images);
          if (Array.isArray(venue.imageUrls)) imgs.push(...venue.imageUrls);
          setExistingImages(Array.from(new Set(imgs)).filter(Boolean));

          setStatus(venue.isActive === false ? "Maintenance" : "Active");
        })
        .catch((err) => {
          setErrorMsg(err.message || "Failed to load venue details");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id]);

  const handleToggleSport = (sport: string) => {
    setSportsTypes((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  const handleToggleAmenity = (amenity: string) => {
    setAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
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

    setCustomDatePricingRules((prev) => [
      ...prev.filter(
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
    setCustomDatePricingRules((prev) => prev.filter((_, i) => i !== index));
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

  const handleMapLocationChange = (newLat: number, newLng: number, addressSuggestion?: string) => {
    setLat(newLat);
    setLng(newLng);
    if (addressSuggestion && !address.trim()) {
      setAddress(addressSuggestion);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Venue Name is required");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Physical Address is required");
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
    formData.append(
      "minimumDepositAmount",
      String(minimumDepositAmount === "" ? 0 : Number(minimumDepositAmount))
    );
    formData.append("isActive", String(status === "Active"));

    // Sports Types
    sportsTypes.forEach((st) => formData.append("sportsType", st));

    // Amenities
    amenities.forEach((a) => {
      formData.append("amenities", a);
    });

    // Custom Pricing Rules
    const sanitizedHourRules = customPricingRules.map((r) => ({
      hour: Number(r.hour),
      pricePerHour: Number(r.pricePerHour),
    }));
    formData.append("customHourPrices", JSON.stringify(sanitizedHourRules));

    // Custom Date Pricing Rules
    const sanitizedDateRules = customDatePricingRules.map((r) => ({
      date: r.date,
      startHour: Number(r.startHour),
      endHour: Number(r.endHour),
      pricePerHour: Number(r.pricePerHour),
      note: r.note || undefined,
    }));
    formData.append("customDatePrices", JSON.stringify(sanitizedDateRules));

    // New Image Files
    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    // Retained and removed images in edit mode
    if (isEditing) {
      if (existingImages.length > 0) {
        formData.append("existingImages", JSON.stringify(existingImages));
      }
      if (removedImages.length > 0) {
        formData.append("removedImages", JSON.stringify(removedImages));
      }
    }

    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await venueApi.updateVenue(id, formData);
        setSuccessMsg("Venue updated successfully!");
      } else {
        await venueApi.createVenue(formData);
        setSuccessMsg("Venue created successfully!");
      }
      setTimeout(() => {
        navigate("/venues");
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save venue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={isEditing ? `Edit Venue: ${name || "Venue"} | ArenaHub` : "Add New Venue | ArenaHub"}
        description="Comprehensive venue management and location setup"
      />
      <PageBreadcrumb pageTitle={isEditing ? "Edit Venue" : "Add New Venue"} />

      <div className="max-w-5xl mx-auto pb-16">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
              {isEditing ? "Edit Pitch & Operating Settings" : "Create New Pitch Venue"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Configure pitch details, GPS location on map, multi-sports, pricing rules, and media.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/venues"
              className="px-4 py-2 text-xs font-bold rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              Cancel
            </Link>
            <Button
              size="sm"
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-black shadow-lg shadow-brand-500/20"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Publish Venue"}
            </Button>
          </div>
        </div>

        {/* Notifications */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-xs font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Basic Details */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
              1. Basic Information & Status
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Santiago Bernabéu Arena Cairo"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VenueStatus)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-semibold"
                >
                  <option value="Active">Active (Open for Bookings)</option>
                  <option value="Maintenance">Maintenance (Closed/Suspended)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Physical Address / Street <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 50 Road 9, Maadi, Cairo, Egypt"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Location & Map Picker */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
                  2. Pitch Location & GPS Coordinates
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Search address, use browser location, or click/drag the map pin. Mobile app users will get instant turn-by-turn directions to these coordinates.
                </p>
              </div>
            </div>

            <LocationMapPicker
              lat={lat}
              lng={lng}
              onChange={handleMapLocationChange}
              address={address}
            />
          </div>

          {/* Section 3: Sports Types */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
              3. Supported Sports Categories
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SPORTS_TYPES.map((sport) => {
                const isSelected = sportsTypes.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleToggleSport(sport)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                      isSelected
                        ? "bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20"
                        : "bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    {isSelected ? `✓ ${sport}` : `+ ${sport}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Operating Hours & Pricing */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
                4. Working Hours & Base Pricing
              </h3>
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
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Opening Hour
                </label>
                <select
                  value={startWorkingHours}
                  onChange={(e) => setStartWorkingHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i}:00 ({i >= 12 ? (i === 12 ? "12 PM" : `${i - 12} PM`) : i === 0 ? "12 AM" : `${i} AM`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Closing Hour
                </label>
                <select
                  value={endWorkingHours}
                  onChange={(e) => setEndWorkingHours(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {Array.from({ length: 25 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i === 24 ? "24:00 (Midnight)" : `${i}:00 (${i >= 12 ? (i === 12 ? "12 PM" : `${i - 12} PM`) : i === 0 ? "12 AM" : `${i} AM`})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Default Hourly Price (EGP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={defaultHourlyPrice}
                  onChange={(e) =>
                    setDefaultHourlyPrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Min Deposit Amount (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minimumDepositAmount}
                  onChange={(e) =>
                    setMinimumDepositAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
                />
              </div>
            </div>

            {/* Custom Peak Pricing Builder */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <label className="block text-xs font-black uppercase tracking-wider text-gray-900 dark:text-white mb-2">
                Custom Peak/Off-Peak Hourly Pricing
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-3 mb-3">
                <select
                  value={ruleHour}
                  onChange={(e) => setRuleHour(Number(e.target.value))}
                  className="w-full sm:w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      Hour {h}:00 - {h + 1}:00
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  placeholder="Rate EGP/hr"
                  value={ruleRate}
                  onChange={(e) =>
                    setRuleRate(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full sm:w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
                />

                <button
                  type="button"
                  onClick={handleAddPricingRule}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-bold hover:opacity-90 transition"
                >
                  + Add/Update Peak Rate
                </button>
              </div>

              {customPricingRules.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customPricingRules.map((rule) => (
                    <div
                      key={rule.hour}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold"
                    >
                      <span>
                        {rule.hour}:00 - {rule.hour + 1}:00 ➔ {rule.pricePerHour} EGP
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePricingRule(rule.hour)}
                        className="text-red-500 hover:text-red-700 ml-1 font-black"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Date-Specific Pricing Builder (customDatePrices) */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Special Date-Specific Pricing (customDatePrices)
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Set custom hourly rates for specific calendar dates & time windows. Outside the configured window, pricing reverts to default/peak rates.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {customDatePricingRules.length} Active Rule(s)
                </span>
              </div>

              {/* Modern Interactive Rule Builder Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/30 dark:to-teal-950/10 border border-emerald-200/80 dark:border-emerald-800/50 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                  
                  {/* Modern Date Picker */}
                  <div className="lg:col-span-3">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
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
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
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
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition cursor-pointer shadow-xs"
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
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      To (End Time)
                    </label>
                    <select
                      value={dateRuleEndHour}
                      onChange={(e) => setDateRuleEndHour(Number(e.target.value))}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition cursor-pointer shadow-xs"
                    >
                      {getEndHoursForStart(dateRuleStartHour).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Modern Price per Hour Input */}
                  <div className="lg:col-span-2">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
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
                        className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pr-12 text-xs font-bold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono shadow-xs"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                        EGP
                      </span>
                    </div>
                  </div>

                  {/* Optional Reason / Note Tag */}
                  <div className="lg:col-span-2">
                    <label className="flex items-center gap-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Note / Tag
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Ramadan Peak"
                      value={dateRuleNote}
                      onChange={(e) => setDateRuleNote(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white shadow-xs"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="lg:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddDatePricingRule}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold transition shadow-sm"
                      title="Add Date Rule"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Live Preview Summary Bar */}
                {dateRuleDate && (
                  <div className="flex items-center gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>
                      Preview: <strong>{dateRuleDate}</strong> from <strong>{formatTime12h(dateRuleStartHour)}</strong> to <strong>{formatTime12h(dateRuleEndHour)}</strong> ({dateRuleEndHour - dateRuleStartHour} hr window) @ <strong>{dateRuleRate || 0} EGP/hr</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Configured Rules Grid */}
              {customDatePricingRules.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
                  {customDatePricingRules.map((rule, idx) => (
                    <div
                      key={rule.id || idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gray-800/90 border border-emerald-200/90 dark:border-emerald-800/60 shadow-xs hover:shadow-sm transition group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs font-black text-gray-900 dark:text-white">
                            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            {rule.date}
                          </span>
                          {rule.note && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 truncate max-w-[120px]">
                              {rule.note}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {formatTime12h(rule.startHour)} ➔ {formatTime12h(rule.endHour)}
                          </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            • {rule.pricePerHour} EGP/hr
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDatePricingRule(idx)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0 ml-2"
                        title="Remove Date Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 5: Amenities */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
              5. Venue Amenities
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableAmenities.map((amenity) => {
                const isSelected = amenities.includes(amenity);
                return (
                  <label
                    key={amenity}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition ${
                      isSelected
                        ? "bg-brand-50/50 dark:bg-brand-950/20 border-brand-500 text-brand-700 dark:text-brand-300 font-bold"
                        : "bg-gray-50/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleAmenity(amenity)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-xs">{amenity}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 6: Photos & Images */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand-500">
              6. Venue Gallery & Photos
            </h3>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                  Current Uploaded Images
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {existingImages.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 aspect-video bg-gray-100 dark:bg-gray-800"
                    >
                      <img
                        src={resolveVenueImageUrl(img)}
                        alt={`Venue ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(idx)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1 shadow-md opacity-90 hover:opacity-100 transition text-xs font-bold w-5 h-5 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Files */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2">
                Upload New Images (Up to 10 photos)
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-brand-500 file:text-white hover:file:bg-brand-600 cursor-pointer"
              />

              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSelectedFile(idx)}
                        className="text-red-500 hover:text-red-700 font-bold ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Submit Bar */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link
              to="/venues"
              className="px-5 py-2.5 text-xs font-bold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
            >
              Cancel
            </Link>
            <Button
              size="md"
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-3 text-xs font-black shadow-xl shadow-brand-500/25"
            >
              {isSubmitting ? "Saving Venue..." : isEditing ? "Save & Update Venue" : "Create Venue"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
