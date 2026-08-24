import React from "react";
import { Modal } from "../ui/modal";
import { AlertIcon, TrashBinIcon } from "../../icons";
import { Venue } from "../../types";

interface DeleteVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  venue: Venue | null;
  activeBookingsCount?: number;
  onConfirmDelete: (venueId: string) => void;
}

export const DeleteVenueModal: React.FC<DeleteVenueModalProps> = ({
  isOpen,
  onClose,
  venue,
  activeBookingsCount = 0,
  onConfirmDelete,
}) => {
  if (!venue) return null;

  const handleDelete = () => {
    onConfirmDelete(venue._id || venue.id || "");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6 sm:p-8">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-950/40 dark:text-error-400 mb-4">
          <TrashBinIcon className="h-7 w-7" />
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Delete Venue: {venue.venueName || venue.name}
        </h3>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Are you sure you want to deactivate and soft-delete this venue? This action preserves booking histories while closing the venue from new reservations.
        </p>

        {activeBookingsCount > 0 && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-warning-300 bg-warning-50 p-3.5 text-left text-xs text-warning-800 dark:border-warning-800 dark:bg-warning-950/40 dark:text-warning-300">
            <AlertIcon className="w-5 h-5 shrink-0 text-warning-600 dark:text-warning-400" />
            <div>
              <p className="font-semibold mb-0.5">Warning: Active Bookings Found</p>
              <p>
                This venue currently has <strong>{activeBookingsCount} active booking(s)</strong>.
                Deleting the venue may affect existing customer reservations.
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700 w-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-error-600 rounded-lg hover:bg-error-700 dark:bg-error-600 dark:hover:bg-error-700 w-full flex items-center justify-center gap-1.5"
          >
            <TrashBinIcon className="w-4 h-4" /> Delete Venue
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DeleteVenueModal;
