import { useState, useRef, useEffect, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { EventInput, EventClickArg } from "@fullcalendar/core";
import { Modal } from "../components/ui/modal";
import { useModal } from "../hooks/useModal";
import PageMeta from "../components/common/PageMeta";
import { venueApi } from "../services/api/venueApi";
import { bookingApi } from "../services/api/bookingApi";
import { Venue, Booking } from "../types";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
    bookingId?: string;
    venueName?: string;
    customerName?: string;
    price?: number;
    status?: string;
  };
}

const Calendar: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("ALL");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const loadCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const fetchedVenues = await venueApi.getAllVenues();
      setVenues(fetchedVenues);

      const activeVList =
        selectedVenueId === "ALL"
          ? fetchedVenues.filter((v) => v.isActive !== false)
          : fetchedVenues.filter((v) => (v._id || v.id) === selectedVenueId);

      const bookingPromises = activeVList.map((v) =>
        bookingApi.getVenueBookings(v._id || v.id || "")
      );
      const bookingResults = await Promise.all(bookingPromises);
      const allBookings: Booking[] = bookingResults.flat();

      const calEvents: CalendarEvent[] = allBookings.map((b) => {
        let level = "primary";
        if (b.status === "confirmed" || b.status === "Confirmed") level = "success";
        else if (b.status === "completed" || b.status === "Completed") level = "primary";
        else if (b.status === "pending") level = "warning";
        else if (b.status === "cancelled" || b.status === "Cancelled") level = "danger";

        const dateStr = b.date ? String(b.date).split("T")[0] : new Date().toISOString().split("T")[0];

        return {
          id: b._id || b.id,
          title: `${b.venueName || "Venue"}: ${b.customerName || "Customer"} (${b.startTime} - ${b.endTime})`,
          start: `${dateStr}T${String(b.startTime).padStart(2, "0")}:00:00`,
          end: `${dateStr}T${String(b.endTime).padStart(2, "0")}:00:00`,
          allDay: false,
          extendedProps: {
            calendar: level,
            bookingId: b._id || b.id,
            venueName: b.venueName,
            customerName: b.customerName,
            price: b.price || b.totalPrice,
            status: b.status,
          },
        };
      });

      setEvents(calEvents);
    } catch (err) {
      console.error("Error loading calendar bookings:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedVenueId]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    setSelectedEvent(event as unknown as CalendarEvent);
    openModal();
  };

  return (
    <>
      <PageMeta
        title="Live Bookings Calendar | TailAdmin Dashboard"
        description="Interactive calendar view of live sports venue match bookings."
      />
      <div className="space-y-4">
        {/* Venue Filter Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Calendar Schedule
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              {loading ? "Loading live slots..." : `${events.length} Live Bookings`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Filter Venue:
            </label>
            <select
              value={selectedVenueId}
              onChange={(e) => setSelectedVenueId(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              <option value="ALL">All Sports Venues</option>
              {venues.map((v) => (
                <option key={v._id || v.id} value={v._id || v.id}>
                  {v.venueName || v.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadCalendarData}
              className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] p-4">
          <div className="custom-calendar">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={events}
              eventClick={handleEventClick}
              eventContent={renderEventContent}
            />
          </div>
        </div>

        {/* Event Detail Modal */}
        <Modal
          isOpen={isOpen}
          onClose={closeModal}
          className="max-w-md p-6 bg-white dark:bg-gray-900"
        >
          {selectedEvent && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {selectedEvent.extendedProps.venueName || "Booking Details"}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                  {selectedEvent.extendedProps.status}
                </span>
              </div>

              <div className="text-xs space-y-2 text-gray-600 dark:text-gray-300">
                <div>
                  <strong className="text-gray-900 dark:text-white">Customer:</strong>{" "}
                  {selectedEvent.extendedProps.customerName || "Customer"}
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-white">Booking ID:</strong>{" "}
                  <span className="font-mono text-gray-500">{selectedEvent.extendedProps.bookingId}</span>
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-white">Scheduled Time:</strong>{" "}
                  {selectedEvent.start ? new Date(selectedEvent.start as string).toLocaleString() : ""}
                </div>
                <div>
                  <strong className="text-gray-900 dark:text-white">Price:</strong>{" "}
                  <span className="font-bold text-emerald-600">{selectedEvent.extendedProps.price} EGP</span>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
};

const renderEventContent = (eventInfo: any) => {
  const colorClass = `fc-bg-${eventInfo.event.extendedProps.calendar || "primary"}`;
  return (
    <div
      className={`event-fc-color flex fc-event-main ${colorClass} p-1 rounded-sm text-xs font-medium cursor-pointer`}
    >
      <div className="fc-event-title truncate">{eventInfo.event.title}</div>
    </div>
  );
};

export default Calendar;
