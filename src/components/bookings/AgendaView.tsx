import { ReactNode, useMemo } from "react";
import { Booking, Venue } from "../../types";
import {
  buildAgenda,
  fmt,
  formatHour,
  getId,
  matchesSearch,
  normalizeStatus,
  parseHour,
} from "../../utils/booking";
import { StatusBadge } from "./StatusBadge";

const DEFAULT_OPEN = 6;
const DEFAULT_CLOSE = 23;
export const AGENDA_ALL_VENUES_TAB = "__all__";
const ALL_TAB = AGENDA_ALL_VENUES_TAB;

function venueHours(v: Venue | undefined): { open: number; close: number } {
  return {
    open: v?.startWorkingHours ?? DEFAULT_OPEN,
    close: v?.endWorkingHours ?? DEFAULT_CLOSE,
  };
}

export function AgendaView({
  venues,
  bookings,
  search,
  selectedVenueId,
  onSelectVenue,
  onSelectBooking,
  onCreateAt,
}: {
  venues: Venue[];
  bookings: Booking[];
  search: string;
  selectedVenueId: string;
  onSelectVenue: (venueId: string) => void;
  onSelectBooking: (booking: Booking) => void;
  onCreateAt: (venueId: string, hour: number) => void;
}) {
  const isSearching = search.trim().length > 0;
  const activeVenue = venues.find((v) => getId(v) === selectedVenueId);
  const { open, close } = venueHours(activeVenue);

  // "All venues" tab: every booking for the day, flattened and sorted by
  // start time, tagged with its venue name. No gap rows — a free window
  // is only meaningful in the context of one specific venue.
  const allVenuesFeed = useMemo(() => {
    if (selectedVenueId !== ALL_TAB) return [];
    return bookings
      .filter((b) => (isSearching ? matchesSearch(b, search) : true))
      .slice()
      .sort((a, b) => parseHour(a.startTime, 0) - parseHour(b.startTime, 0));
  }, [bookings, selectedVenueId, search, isSearching]);

  // Single-venue agenda: chronological bookings + the gaps between them.
  const agendaItems = useMemo(() => {
    if (selectedVenueId === ALL_TAB || !selectedVenueId) return [];
    const items = buildAgenda(bookings, selectedVenueId, open, close);
    if (!isSearching) return items;
    // While searching, only show matching bookings — gaps aren't relevant
    // to "find this customer's reservation".
    return items.filter((item) => item.type === "booking" && matchesSearch(item.booking, search));
  }, [bookings, selectedVenueId, open, close, search, isSearching]);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-800/90 overflow-hidden shadow-2xl">
      {/* Venue tabs */}
      <div className="flex items-center gap-1.5 px-4 pt-4 pb-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700/80">
        <TabButton active={selectedVenueId === ALL_TAB} onClick={() => onSelectVenue(ALL_TAB)}>
          All Venues
        </TabButton>
        {venues.map((v) => (
          <TabButton key={getId(v)} active={selectedVenueId === getId(v)} onClick={() => onSelectVenue(getId(v))}>
            {v.venueName || v.name}
          </TabButton>
        ))}
      </div>

      <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
        {selectedVenueId === ALL_TAB ? (
          allVenuesFeed.length === 0 ? (
            <EmptyState isSearching={isSearching} />
          ) : (
            allVenuesFeed.map((booking) => (
              <BookingCard key={getId(booking)} booking={booking} onClick={() => onSelectBooking(booking)} showVenueTag />
            ))
          )
        ) : agendaItems.length === 0 ? (
          <EmptyState isSearching={isSearching} />
        ) : (
          agendaItems.map((item, idx) =>
            item.type === "gap" ? (
              <GapRow
                key={`gap-${idx}`}
                startHour={item.startHour}
                endHour={item.endHour}
                onClick={() => onCreateAt(selectedVenueId, item.startHour)}
              />
            ) : (
              <BookingCard key={getId(item.booking)} booking={item.booking} onClick={() => onSelectBooking(item.booking)} />
            )
          )
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
        active
          ? "bg-blue-600 text-white shadow-md"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({ isSearching }: { isSearching: boolean }) {
  return (
    <div className="py-12 text-center text-xs text-gray-500 dark:text-gray-400">
      {isSearching ? "No bookings match your search." : "No bookings for this day."}
    </div>
  );
}

function GapRow({ startHour, endHour, onClick }: { startHour: number; endHour: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors text-xs"
    >
      <span className="font-mono">
        {formatHour(startHour)} – {formatHour(endHour)}
      </span>
      <span className="font-bold">+ Add booking</span>
    </button>
  );
}

function BookingCard({ booking: b, onClick, showVenueTag }: { booking: Booking; onClick: () => void; showVenueTag?: boolean }) {
  const isCancelled = normalizeStatus(b.status) === "cancelled";
  const due = b.remainingAmount ?? 0;
  const borderColor = isCancelled
    ? "border-l-gray-300 dark:border-l-gray-600"
    : normalizeStatus(b.status) === "pending"
    ? "border-l-amber-400"
    : normalizeStatus(b.status) === "completed"
    ? "border-l-emerald-400"
    : "border-l-blue-500";

  return (
    <button
      onClick={onClick}
      disabled={isCancelled}
      className={`w-full text-left flex items-center gap-4 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700/80 border-l-4 ${borderColor} bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-900/70 transition-colors ${
        isCancelled ? "opacity-50 cursor-default" : "cursor-pointer"
      }`}
    >
      <div className="w-20 shrink-0 text-xs font-mono font-bold text-gray-600 dark:text-gray-300">
        {formatHour(parseHour(b.startTime, 0))}
        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
          to {formatHour(parseHour(b.endTime, parseHour(b.startTime, 0) + 1))}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{b.customerName || "Customer"}</span>
          <StatusBadge status={b.status} />
          {showVenueTag && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              {b.venueName || "Venue"}
            </span>
          )}
        </div>
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">{b.bookingCode ? `#${b.bookingCode}` : ""}</div>
      </div>

      <div className="text-right text-[11px] shrink-0">
        <div className="font-bold text-gray-800 dark:text-gray-200">{fmt(b.price || b.totalPrice || 0)}</div>
        {due > 0 ? (
          <div className="text-amber-600 dark:text-amber-400 font-bold">Due {fmt(due)}</div>
        ) : (
          <div className="text-emerald-600 dark:text-emerald-400 font-bold">Paid in full</div>
        )}
      </div>
    </button>
  );
}
