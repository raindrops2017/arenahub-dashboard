import { useCallback, useEffect, useRef, useState } from "react";
import { Booking, Venue } from "../types";
import { CustomerUser } from "../types";
import { bookingApi } from "../services/api/bookingApi";
import { venueApi } from "../services/api/venueApi";
import { customerApi } from "../services/api/customerApi";
import { socketService } from "../services/api/socketService";
import { activeOnly, getId } from "../utils/booking";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * All data-fetching and real-time sync for the bookings screen, in one place.
 * The component that uses this hook doesn't need to know bookings are fetched
 * per-venue, or that a socket reconnect logic exists — it just gets data + a
 * reload function.
 */
export function useLiveBookings(selectedDate: string) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Track venues in a ref so the socket effect doesn't need `venues` in its
  // dependency array (a new array reference on every fetch would otherwise
  // tear down and rebuild every socket subscription on every reload).
  const venuesRef = useRef<Venue[]>([]);

  const reloadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [fetchedVenues, fetchedCustomers] = await Promise.all([
        venueApi.getAllVenues(),
        customerApi.getAllCustomers(),
      ]);
      setVenues(fetchedVenues);
      setCustomers(fetchedCustomers);
      venuesRef.current = fetchedVenues;

      const active = activeOnly(fetchedVenues);
      const bookingsPerVenue = await Promise.all(
        active.map((v) => bookingApi.getVenueBookings(getId(v), { date: selectedDate }))
      );
      setBookings(bookingsPerVenue.flat());
    } catch (err: unknown) {
      console.error("Error loading live bookings:", err);
      setErrorMsg(getErrorMessage(err, "Failed to load live booking records."));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // Real-time Socket.IO sync — subscribed once per venue list change, not
  // once per render.
  useEffect(() => {
    const active = activeOnly(venues);
    active.forEach((v) => socketService.joinVenue(getId(v)));

    const unsubLocked = socketService.onSlotLocked(() => reloadData());
    const unsubReleased = socketService.onSlotReleased(() => reloadData());
    const unsubConfirmed = socketService.onBookingConfirmed(() => reloadData());

    return () => {
      unsubLocked();
      unsubReleased();
      unsubConfirmed();
      active.forEach((v) => socketService.leaveVenue(getId(v)));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venues.map(getId).join(","), reloadData]);

  return { bookings, venues, customers, loading, errorMsg, reloadData, getErrorMessage };
}
