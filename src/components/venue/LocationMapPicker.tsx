import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon assets with Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationMapPickerProps {
  lat: number | "";
  lng: number | "";
  onChange: (lat: number, lng: number, addressSuggestion?: string) => void;
  address?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  lat,
  lng,
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const currentLat = typeof lat === "number" && !isNaN(lat) ? lat : 30.0444;
  const currentLng = typeof lng === "number" && !isNaN(lng) ? lng : 31.2357;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Create Leaflet map instance if not existing
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 14,
        zoomControl: true,
      });

      // Add OpenStreetMap standard tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create draggable pin marker
      const marker = L.marker([currentLat, currentLng], {
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        onChange(Number(position.lat.toFixed(6)), Number(position.lng.toFixed(6)));
      });

      // Click on map to place/move marker
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat: clickedLat, lng: clickedLng } = e.latlng;
        marker.setLatLng([clickedLat, clickedLng]);
        onChange(Number(clickedLat.toFixed(6)), Number(clickedLng.toFixed(6)));
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      // Invalidate map size after mount / modal open
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update map and marker when lat/lng props change externally
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (
        Math.abs(currentPos.lat - currentLat) > 0.0001 ||
        Math.abs(currentPos.lng - currentLng) > 0.0001
      ) {
        markerRef.current.setLatLng([currentLat, currentLng]);
        mapInstanceRef.current.panTo([currentLat, currentLng]);
      }
    }
  }, [currentLat, currentLng]);

  // Search Address / Places using OpenStreetMap Nominatim API
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=5&addressdetails=1`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.warn("Nominatim search failed:", err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Select place from search dropdown
  const handleSelectPlace = (place: SearchResult) => {
    const selectedLat = Number(parseFloat(place.lat).toFixed(6));
    const selectedLng = Number(parseFloat(place.lon).toFixed(6));

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLatLng([selectedLat, selectedLng]);
      mapInstanceRef.current.setView([selectedLat, selectedLng], 16);
    }

    onChange(selectedLat, selectedLng, place.display_name);
    setSearchQuery(place.display_name);
    setSearchResults([]);
  };

  // Locate Current Position via browser geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const userLat = Number(pos.coords.latitude.toFixed(6));
        const userLng = Number(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLatLng([userLat, userLng]);
          mapInstanceRef.current.setView([userLat, userLng], 16);
        }
        onChange(userLat, userLng);
      },
      (err) => {
        setIsLocating(false);
        alert(`Failed to retrieve current location: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search & Location Controls */}
      <div className="flex flex-col sm:flex-row gap-2 relative">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Search venue place or address (e.g. Maadi, Cairo)..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          {isSearching && (
            <div className="absolute right-3 top-2.5">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-brand-500 border-r-transparent align-[-0.125em]" />
            </div>
          )}

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
              {searchResults.map((item) => (
                <button
                  key={item.place_id}
                  type="button"
                  onClick={() => handleSelectPlace(item)}
                  className="w-full px-3.5 py-2.5 text-left text-xs font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                >
                  <p className="line-clamp-2">{item.display_name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-bold text-gray-800 dark:text-gray-200 transition border border-gray-200 dark:border-gray-700"
        >
          {isLocating ? (
            <span>Locating...</span>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-brand-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Use My Location</span>
            </>
          )}
        </button>
      </div>

      {/* Interactive Map Box */}
      <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner bg-gray-100 dark:bg-gray-900">
        <div
          ref={mapContainerRef}
          style={{ height: "300px", width: "100%", zIndex: 10 }}
        />
        <div className="absolute bottom-2 left-2 z-20 px-2.5 py-1 rounded bg-black/70 backdrop-blur-md text-[11px] font-mono text-white pointer-events-none">
          Click or drag marker to set pitch coordinates
        </div>
      </div>

      {/* Synced Coordinate Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              if (val !== "") onChange(val, typeof lng === "number" ? lng : currentLng);
            }}
            placeholder="30.0444"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              if (val !== "") onChange(typeof lat === "number" ? lat : currentLat, val);
            }}
            placeholder="31.2357"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white font-mono"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationMapPicker;
