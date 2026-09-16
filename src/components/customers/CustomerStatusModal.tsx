import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { CustomerUser, CustomerStatus } from "../../types";
import { customerApi } from "../../services/api/customerApi";

interface CustomerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerUser | null;
  onStatusUpdated: (updatedCustomer: Partial<CustomerUser>) => void;
}

export const CustomerStatusModal: React.FC<CustomerStatusModalProps> = ({
  isOpen,
  onClose,
  customer,
  onStatusUpdated,
}) => {
  const [selectedNewStatus, setSelectedNewStatus] = useState<CustomerStatus>("Active");
  const [statusReasonInput, setStatusReasonInput] = useState("");
  const [statusModalError, setStatusModalError] = useState("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (customer) {
      setSelectedNewStatus((customer.status as CustomerStatus) || "Active");
      setStatusReasonInput(customer.statusReason || "");
      setStatusModalError("");
    }
  }, [customer, isOpen]);

  const handleSaveStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    if (
      (selectedNewStatus === "On Hold" || selectedNewStatus === "Suspended") &&
      !statusReasonInput.trim()
    ) {
      setStatusModalError("A reason is required when placing an account On Hold or Suspended.");
      return;
    }

    setIsUpdatingStatus(true);
    setStatusModalError("");
    try {
      const cId = customer._id || customer.id || "";
      const updated = await customerApi.updateCustomerUser(cId, {
        status: selectedNewStatus,
        statusReason: statusReasonInput.trim(),
      });

      onStatusUpdated(updated || { status: selectedNewStatus, statusReason: statusReasonInput.trim() });
      onClose();
    } catch (err: any) {
      setStatusModalError(err.message || "Failed to update account status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-6 bg-white dark:bg-gray-800/90 backdrop-blur-md"
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Update Customer Account Status
          </h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Manage account status for{" "}
          <strong className="text-gray-800 dark:text-gray-200">
            {customer?.userName || customer?.name}
          </strong>
          {customer?.phone ? ` (${customer.phone})` : ""}.
        </p>

        {statusModalError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
            {statusModalError}
          </div>
        )}

        <form onSubmit={handleSaveStatusChange} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-2">
              Account Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: "Active",
                  label: "Active",
                  desc: "Full normal booking & app access",
                  color: "border-emerald-500 text-emerald-600 bg-emerald-50/30",
                },
                {
                  id: "On Hold",
                  label: "On Hold",
                  desc: "Bookings allowed with app & gate warning",
                  color: "border-amber-500 text-amber-600 bg-amber-50/30",
                },
                {
                  id: "Suspended",
                  label: "Suspended",
                  desc: "Blocked from booking & pitches feed",
                  color: "border-red-500 text-red-600 bg-red-50/30",
                },
                {
                  id: "Archived",
                  label: "Archived",
                  desc: "Archived account, cannot create bookings",
                  color: "border-gray-400 text-gray-600 bg-gray-50/30",
                },
              ].map((s) => {
                const isSelected = selectedNewStatus === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedNewStatus(s.id as CustomerStatus)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? `border-2 ${s.color} shadow-xs font-bold`
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                      {s.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1.5">
              Status Reason / Audit Note{" "}
              {(selectedNewStatus === "On Hold" || selectedNewStatus === "Suspended") && (
                <span className="text-red-500">* (Mandatory)</span>
              )}
            </label>
            <textarea
              rows={3}
              required={selectedNewStatus === "On Hold" || selectedNewStatus === "Suspended"}
              value={statusReasonInput}
              onChange={(e) => setStatusReasonInput(e.target.value)}
              placeholder={
                selectedNewStatus === "Suspended"
                  ? "e.g. Multiple booking no-shows without cancellation payment."
                  : selectedNewStatus === "On Hold"
                  ? "e.g. Pending ID / contact verification or payment settlement."
                  : "Optional note or reason..."
              }
              className="w-full rounded-lg border border-gray-300 bg-white p-3 text-xs text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              This reason will be visible as an alert in the customer mobile app and to the pitch gate staff.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 cursor-pointer"
            >
              Cancel
            </button>
            <Button size="sm" type="submit" disabled={isUpdatingStatus}>
              {isUpdatingStatus ? "Updating..." : "Save Status"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
