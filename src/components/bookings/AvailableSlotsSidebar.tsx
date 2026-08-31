import { useMemo } from "react";
import { Clock, Plus, Sparkles, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { Booking, Venue } from "../../types";
import {
  AvailableSlot,
  fmt,
  getAvailableSlotsForVenue,
  getId,
  toDateStr,
} from "../../utils/booking";
import { AGENDA_ALL_VENUES_TAB } from "./AgendaView";

interface AvailableSlotsSidebarProps {
  venues: Venue[];
  bookings: Booking[];
  selectedDate: string;
  selectedVenueId: string;
  onSelectVenue?: (venueId: string) => void;
  onBookSlot: (venueId: string, hour: number) => void;
}

export function AvailableSlotsSidebar({
  venues,
  bookings,
  selectedDate,
  selectedVenueId,
  onSelectVenue,
  onBookSlot,
}: AvailableSlotsSidebarProps) {
  const now = new Date();
  const todayStr = toDateStr(now);
  const isToday = selectedDate === todayStr;
  const isPast = selectedDate < todayStr;

  // Filter venues based on selected tab (All vs Single)
  const targetVenues = useMemo(() => {
    if (selectedVenueId === AGENDA_ALL_VENUES_TAB) {
      return venues;
    }
    const found = venues.filter((v) => getId(v) === selectedVenueId);
    return found.length > 0 ? found : venues;
  }, [venues, selectedVenueId]);

  // Compute available slots per venue
  const venueSlotsMap = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const v of targetVenues) {
      const vId = getId(v);
      const slots = getAvailableSlotsForVenue(v, selectedDate, bookings, now);
      map.set(vId, slots);
    }
    return map;
  }, [targetVenues, selectedDate, bookings]);

  // Total count of available slots across targeted venues
  const totalAvailableCount = useMemo(() => {
    let count = 0;
    for (const slots of venueSlotsMap.values()) {
      count += slots.length;
    }
    return count;
  }, [venueSlotsMap]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 overflow-hidden shadow-2xl flex flex-col h-full max-h-[85vh]">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700/80 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800/90 dark:to-gray-800/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20 shadow-sm">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                Available Slots
                {isToday && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Live Today
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                {isPast ? "Past Date" : `${totalAvailableCount} open slot${totalAvailableCount === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 shadow-inner font-mono">
              <Sparkles className="w-3 h-3 text-blue-500" />
              {totalAvailableCount}
            </span>
          </div>
        </div>

        {/* Venue focus hint if tab is filtered */}
        {selectedVenueId !== AGENDA_ALL_VENUES_TAB && targetVenues.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11px] bg-gray-100 dark:bg-gray-900/60 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700/60">
            <span className="text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
              Focusing: <strong className="text-gray-800 dark:text-gray-200">{targetVenues[0].venueName || targetVenues[0].name}</strong>
            </span>
            {onSelectVenue && (
              <button
                onClick={() => onSelectVenue(AGENDA_ALL_VENUES_TAB)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-[10px] ml-2 shrink-0"
              >
                View All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Slots List / Content */}
      <div className="p-3.5 space-y-4 overflow-y-auto flex-1 divide-y divide-gray-100 dark:divide-gray-800/60">
        {isPast ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 border border-amber-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Date is in the past</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-[220px] mx-auto">
              Historical dates cannot accept new reservations. Select today or a future date.
            </p>
          </div>
        ) : totalAvailableCount === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 mx-auto rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200">No open slots remaining</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 max-w-[220px] mx-auto">
              {isToday
                ? "All remaining hours today are fully booked or have already passed."
                : "All slots for this venue are fully booked on this date."}
            </p>
          </div>
        ) : (
          targetVenues.map((venue) => {
            const vId = getId(venue);
            const slots = venueSlotsMap.get(vId) || [];
            if (slots.length === 0) return null;

            const sports = venue.sportsType || venue.sportsTypes || [];

            return (
              <div key={vId} className="pt-3 first:pt-0 space-y-2">
                {/* Venue sub-header if viewing multiple venues */}
                {selectedVenueId === AGENDA_ALL_VENUES_TAB && (
                  <div className="flex items-center justify-between gap-1 px-1">
                    <div className="min-w-0">
                      <span className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate block">
                        {venue.venueName || venue.name}
                      </span>
                      {sports.length > 0 && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          {sports[0]}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      {slots.length} open
                    </span>
                  </div>
                )}

                {/* Slots Grid */}
                <div className="grid grid-cols-1 gap-1.5">
                  {slots.map((slot) => (
                    <button
                      key={`${vId}-${slot.hour}`}
                      onClick={() => onBookSlot(vId, slot.hour)}
                      title={`Book ${slot.timeLabel} for ${venue.venueName || venue.name}`}
                      className="group flex items-center justify-between p-2.5 rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-gray-50/60 dark:bg-gray-900/40 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/20 hover:border-emerald-500/40 transition-all text-left"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-mono font-bold text-gray-800 dark:text-gray-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                          {slot.timeLabel}
                        </div>
                        <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 group-hover:text-emerald-600/80 dark:group-hover:text-emerald-400/80">
                          {fmt(slot.price)}/hr
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 group-hover:bg-emerald-600 group-hover:text-white text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 group-hover:border-emerald-600 transition-all shadow-sm">
                        <Plus className="w-3 h-3 group-hover:rotate-90 transition-transform duration-200" />
                        <span className="text-[10px] font-bold">Book</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
