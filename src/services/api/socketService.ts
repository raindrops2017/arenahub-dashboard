import { io, Socket } from "socket.io-client";

const WS_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_WS_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api/v1", "")
    : "http://localhost:3000");

class SocketService {
  private socket: Socket | null = null;
  private joinedVenues: Set<string> = new Set();

  public getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(WS_URL, {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      this.socket.on("connect", () => {
        // Rejoin rooms on reconnection
        this.joinedVenues.forEach((venueId) => {
          this.socket?.emit("join_venue", { venueId });
        });
      });
    }
    return this.socket;
  }

  public joinVenue(venueId: string) {
    if (!venueId) return;
    this.joinedVenues.add(venueId);
    const socket = this.getSocket();
    socket.emit("join_venue", { venueId });
  }

  public leaveVenue(venueId: string) {
    if (!venueId) return;
    this.joinedVenues.delete(venueId);
    if (this.socket && this.socket.connected) {
      this.socket.emit("leave_venue", { venueId });
    }
  }

  public onSlotLocked(callback: (data: {
    bookingId: string;
    venueId: string;
    date: string;
    startTime: number;
    endTime: number;
    expiresAt?: string;
  }) => void) {
    const socket = this.getSocket();
    socket.on("slot_locked", callback);
    return () => {
      socket.off("slot_locked", callback);
    };
  }

  public onSlotReleased(callback: (data: {
    bookingId: string;
    venueId: string;
    date: string;
    startTime: number;
    endTime: number;
  }) => void) {
    const socket = this.getSocket();
    socket.on("slot_released", callback);
    return () => {
      socket.off("slot_released", callback);
    };
  }

  public onBookingConfirmed(callback: (data: {
    bookingId: string;
    venueId: string;
    date: string;
    startTime: number;
    endTime: number;
  }) => void) {
    const socket = this.getSocket();
    socket.on("booking_confirmed", callback);
    return () => {
      socket.off("booking_confirmed", callback);
    };
  }

  public onOwnerNotification(
    ownerId: string,
    callback: (data: { eventType: string; booking: any }) => void
  ) {
    const socket = this.getSocket();
    const eventName = `owner_${ownerId}`;
    socket.on(eventName, callback);
    return () => {
      socket.off(eventName, callback);
    };
  }

  public onAdvertisementsUpdated(
    callback: (data?: { action?: string; adId?: string; timestamp?: string }) => void
  ) {
    const socket = this.getSocket();
    socket.on("advertisements_updated", callback);
    return () => {
      socket.off("advertisements_updated", callback);
    };
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.joinedVenues.clear();
    }
  }
}

export const socketService = new SocketService();
export default socketService;
