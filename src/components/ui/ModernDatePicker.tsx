import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface ModernDatePickerProps {
  value: string; // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void;
  minDate?: string; // 'YYYY-MM-DD'
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const ModernDatePicker: React.FC<ModernDatePickerProps> = ({
  value,
  onChange,
  minDate = new Date().toISOString().split("T")[0],
  placeholder = "Select Date",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial view year & month from value or today
  const initialDate = value ? new Date(value) : new Date();
  const validInitialDate = isNaN(initialDate.getTime()) ? new Date() : initialDate;

  const [viewYear, setViewYear] = useState<number>(validInitialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(validInitialDate.getMonth());

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

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Generate calendar days for current view
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const handleSelectDay = (day: number) => {
    const y = viewYear;
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const [vy, vm, vd] = value.split("-").map(Number);
    return vy === viewYear && vm === viewMonth + 1 && vd === day;
  };

  const isToday = (day: number) => {
    const now = new Date();
    return (
      now.getFullYear() === viewYear &&
      now.getMonth() === viewMonth &&
      now.getDate() === day
    );
  };

  const isPast = (day: number) => {
    if (!minDate) return false;
    const [my, mm, md] = minDate.split("-").map(Number);
    const target = new Date(viewYear, viewMonth, day, 23, 59, 59);
    const minD = new Date(my, mm - 1, md, 0, 0, 0);
    return target < minD;
  };

  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = d.toISOString().split("T")[0];
    onChange(dateStr);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setIsOpen(false);
  };

  const formatDisplay = (val: string) => {
    if (!val) return "";
    const [y, m, d] = val.split("-").map(Number);
    if (!y || !m || !d) return val;
    const dateObj = new Date(y, m - 1, d);
    if (isNaN(dateObj.getTime())) return val;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Input trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white transition cursor-pointer shadow-xs hover:border-emerald-400"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className={value ? "text-gray-900 dark:text-white font-bold" : "text-gray-400"}>
            {value ? `${value} (${formatDisplay(value)})` : placeholder}
          </span>
        </div>
        <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
          Pick
        </span>
      </button>

      {/* Popover Calendar */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
          {/* Calendar Header: Month + Navigation */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black text-gray-900 dark:text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-white transition"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-1 mb-2.5">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="flex-1 py-1 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-gray-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-gray-600 dark:text-gray-300 transition text-center cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="flex-1 py-1 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-gray-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-gray-600 dark:text-gray-300 transition text-center cursor-pointer"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="flex-1 py-1 text-[10px] font-bold rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 dark:bg-gray-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-gray-600 dark:text-gray-300 transition text-center cursor-pointer"
            >
              +7 Days
            </button>
          </div>

          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAYS_OF_WEEK.map((d, i) => (
              <span key={i} className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots for previous month overflow */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <span
                key={`empty-${i}`}
                className="h-8 flex items-center justify-center text-[11px] text-gray-300 dark:text-gray-700 select-none"
              >
                {daysInPrevMonth - firstDayOfMonth + i + 1}
              </span>
            ))}

            {/* Current month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const today = isToday(day);
              const past = isPast(day);

              return (
                <button
                  type="button"
                  key={`day-${day}`}
                  disabled={past}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-xl text-xs font-semibold transition cursor-pointer ${
                    selected
                      ? "bg-emerald-600 text-white font-black shadow-md scale-105"
                      : past
                      ? "text-gray-300 dark:text-gray-700 cursor-not-allowed"
                      : today
                      ? "border border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
