import { useMemo, useState } from "react";
import { Link } from "react-router";
import { DoorOpen, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Booking } from "../types";
import { useLiveBookings } from "../hooks/useLiveBookings";
import { activeOnly, getId, toDateStr } from "../utils/booking";
import { AgendaView, AGENDA_ALL_VENUES_TAB } from "../components/bookings/AgendaView";
import { AvailableSlotsSidebar } from "../components/bookings/AvailableSlotsSidebar";
import { NewBookingModal, NewBookingDefaults } from "../components/bookings/modals/NewBookingModal";
import { ManageBookingModal } from "../components/bookings/modals/ManageBookingModal";
import { CancelBookingModal } from "../components/bookings/modals/CancelBookingModal";
import { GateCheckInModal } from "../components/bookings/modals/GateCheckInModal";
import { ModernDatePicker } from "../components/ui/ModernDatePicker";

export default function BookingsFullScreen() {
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [search, setSearch] = useState("");
  // "All Venues" is the default landing tab — parity with the old grid,
  // which showed every venue at once. Admins can tab into one venue from there.
  const [selectedVenueId, setSelectedVenueId] = useState<string>(AGENDA_ALL_VENUES_TAB);

  const { bookings, venues, customers, loading, errorMsg, reloadData } = useLiveBookings(selectedDate);
  const activeVenues = useMemo(() => activeOnly(venues), [venues]);

  const [showGateCheckIn, setShowGateCheckIn] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [newBookingDefaults, setNewBookingDefaults] = useState<NewBookingDefaults>({
    venueId: "",
    date: selectedDate,
    startHour: 18,
  });
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);

  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateStr(d));
  };

  const openNewBookingAt = (venueId: string, hour: number) => {
    setNewBookingDefaults({ venueId, date: selectedDate, startHour: hour });
    setShowNewBooking(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100 flex flex-col font-sans antialiased">
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-gray-800/90 border-b border-gray-200 dark:border-gray-700/80 shadow-sm">
        <div className="flex items-center justify-between px-6 py-3.5 max-w-[1920px] mx-auto flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600/60 transition-all text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Return to Dashboard
            </Link>
            <div className="h-5 w-px bg-gray-200 dark:bg-gray-800" />
            <h1 className="text-sm font-bold flex items-center gap-2">
              Live Bookings
              {loading && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 animate-pulse">
                  Syncing slots...
                </span>
              )}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/90 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-inner">
            <button onClick={() => shiftDate(-1)} aria-label="Previous day" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="w-44">
              <ModernDatePicker
                value={selectedDate}
                onChange={setSelectedDate}
                placeholder="Pick Match Date"
                variant="compact"
              />
            </div>
            <button onClick={() => shiftDate(1)} aria-label="Next day" className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(toDateStr(new Date()))}
              className="ml-1 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 text-xs font-bold transition cursor-pointer"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search booking/customer..."
                aria-label="Search bookings"
                className="w-52 pl-9 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" />
            </div>

            <button
              onClick={() => setShowGateCheckIn(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <DoorOpen className="w-4 h-4" /> Gate Check-In
            </button>

            <button
              onClick={() =>
                openNewBookingAt(
                  selectedVenueId !== AGENDA_ALL_VENUES_TAB ? selectedVenueId : getId(activeVenues[0]),
                  18
                )
              }
              className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 shadow-lg shadow-blue-500/25"
            >
              + New Booking
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-[1920px] w-full mx-auto space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium flex items-center justify-between">
            <span>⚠️ {errorMsg}</span>
            <button onClick={reloadData} className="font-bold underline ml-4 hover:opacity-80">
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          <div className="xl:col-span-3">
            <AgendaView
              venues={activeVenues}
              bookings={bookings}
              search={search}
              selectedVenueId={selectedVenueId}
              onSelectVenue={setSelectedVenueId}
              onSelectBooking={setEditBooking}
              onCreateAt={openNewBookingAt}
            />
          </div>

          <div className="xl:col-span-1">
            <AvailableSlotsSidebar
              venues={activeVenues}
              bookings={bookings}
              selectedDate={selectedDate}
              selectedVenueId={selectedVenueId}
              onSelectVenue={setSelectedVenueId}
              onBookSlot={openNewBookingAt}
            />
          </div>
        </div>
      </main>


      <GateCheckInModal isOpen={showGateCheckIn} onClose={() => setShowGateCheckIn(false)} onCompleted={reloadData} />

      <NewBookingModal
        isOpen={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        onCreated={reloadData}
        venues={activeVenues}
        customers={customers}
        defaults={newBookingDefaults}
      />

      <ManageBookingModal
        booking={editBooking}
        onClose={() => setEditBooking(null)}
        onUpdated={reloadData}
        onRequestCancel={(b) => {
          setEditBooking(null);
          setCancelTarget(b);
        }}
      />

      <CancelBookingModal booking={cancelTarget} onClose={() => setCancelTarget(null)} onCancelled={reloadData} />
    </div>
  );
}
