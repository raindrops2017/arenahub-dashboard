import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronDown } from "lucide-react";

export interface ModernTimePickerProps {
  value: number | string; // hour number (0-23) or 'HH:mm'
  onChange: (val: any) => void;
  format?: "hour" | "time"; // 'hour' returns number 0-23, 'time' returns 'HH:mm'
  minHour?: number;
  maxHour?: number;
  placeholder?: string;
  label?: string;
  className?: string;
  variant?: "default" | "compact";
}

export const ModernTimePicker: React.FC<ModernTimePickerProps> = ({
  value,
  onChange,
  format = "hour",
  minHour = 0,
  maxHour = 23,
  placeholder = "Select Time",
  label,
  className = "",
  variant = "default",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current hour from number or string
  let currentHour = 18;
  if (typeof value === "number") {
    currentHour = value;
  } else if (typeof value === "string") {
    const match = value.match(/^(\d{1,2}):?/);
    if (match) currentHour = parseInt(match[1], 10);
  }

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const formatHourLabel = (h: number) => {
    const norm = h % 24;
    const ampm = norm >= 12 ? "PM" : "AM";
    const displayH = norm % 12 === 0 ? 12 : norm % 12;
    return `${displayH}:00 ${ampm} (${String(norm).padStart(2, "0")}:00)`;
  };

  const handleSelectHour = (h: number) => {
    if (format === "hour") {
      onChange(h);
    } else {
      onChange(`${String(h).padStart(2, "0")}:00`);
    }
    setIsOpen(false);
  };

  const hoursList = Array.from({ length: maxHour - minHour + 1 }, (_, i) => minHour + i);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 border bg-white px-3 text-xs font-semibold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition cursor-pointer shadow-xs hover:border-indigo-400 ${
          variant === "compact"
            ? "py-1.5 rounded-xl border-gray-300 dark:border-gray-600"
            : "py-2.5 rounded-xl border-gray-300 dark:border-gray-700"
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-bold text-gray-900 dark:text-white">
            {value !== undefined && value !== null && value !== ""
              ? formatHourLabel(currentHour)
              : placeholder}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-64 max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
          {/* Quick presets */}
          <div className="grid grid-cols-2 gap-1 pb-2 mb-2 border-b border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => handleSelectHour(10)}
              className="py-1 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-gray-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 text-gray-600 dark:text-gray-300 transition text-center cursor-pointer"
            >
              Morning (10 AM)
            </button>
            <button
              type="button"
              onClick={() => handleSelectHour(18)}
              className="py-1 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-gray-800 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-300 text-gray-600 dark:text-gray-300 transition text-center cursor-pointer"
            >
              Prime (6 PM)
            </button>
          </div>

          <div className="space-y-1">
            {hoursList.map((h) => {
              const selected = h === currentHour;
              return (
                <button
                  type="button"
                  key={h}
                  onClick={() => handleSelectHour(h)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition cursor-pointer ${
                    selected
                      ? "bg-indigo-600 text-white font-bold shadow-xs"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>{formatHourLabel(h)}</span>
                  {selected && <span className="text-[10px] uppercase font-black tracking-wider">Active</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModernTimePicker;
