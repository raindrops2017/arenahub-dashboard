import React, { useState, useEffect } from "react";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { CustomerUser } from "../../types";
import { notificationApi } from "../../services/api/notificationApi";

interface CustomerNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerUser | null;
  onSuccess?: () => void;
}

export const CustomerNotificationModal: React.FC<CustomerNotificationModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSuccess,
}) => {
  const [notifyTitleAr, setNotifyTitleAr] = useState("");
  const [notifyTitleEn, setNotifyTitleEn] = useState("");
  const [notifyBodyAr, setNotifyBodyAr] = useState("");
  const [notifyBodyEn, setNotifyBodyEn] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notifyModalSuccess, setNotifyModalSuccess] = useState<string | null>(null);
  const [notifyModalError, setNotifyModalError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNotifyTitleAr("");
      setNotifyTitleEn("");
      setNotifyBodyAr("");
      setNotifyBodyEn("");
      setNotifyModalSuccess(null);
      setNotifyModalError(null);
    }
  }, [isOpen, customer]);

  const handleSendCustomerNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    if (!notifyTitleAr.trim() || !notifyBodyAr.trim()) {
      setNotifyModalError("Please provide both Arabic Title and Message.");
      return;
    }

    setIsSendingNotification(true);
    setNotifyModalError(null);
    try {
      const cId = customer._id || customer.id || "";
      await notificationApi.sendNotification({
        titleAr: notifyTitleAr.trim(),
        titleEn: notifyTitleEn.trim() || notifyTitleAr.trim(),
        bodyAr: notifyBodyAr.trim(),
        bodyEn: notifyBodyEn.trim() || notifyBodyAr.trim(),
        targetType: "specific_users",
        customerIds: [cId],
      });
      setNotifyModalSuccess("Notification dispatched successfully to this customer!");
      if (onSuccess) {
        onSuccess();
      }
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setNotifyModalError(
        err?.response?.data?.message || err?.message || "Failed to send notification."
      );
    } finally {
      setIsSendingNotification(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-md p-6 bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 text-gray-900 dark:text-white"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>🔔</span> Send Notification
        </h3>
        <button
          onClick={onClose}
          type="button"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
        >
          ✕
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Send a push and in-app message directly to{" "}
        <strong className="text-gray-800 dark:text-gray-200">
          {customer?.userName || customer?.name}
        </strong>{" "}
        {customer?.phone ? `(${customer.phone})` : ""}.
      </p>

      {notifyModalSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-semibold">
          ✓ {notifyModalSuccess}
        </div>
      )}

      {notifyModalError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-200 text-xs font-medium">
          ⚠️ {notifyModalError}
        </div>
      )}

      <form onSubmit={handleSendCustomerNotification} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
            العنوان بالعربية <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            dir="rtl"
            required
            placeholder="مثال: تنبيه بخصوص حجزك القادم"
            value={notifyTitleAr}
            onChange={(e) => setNotifyTitleAr(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
            Title in English (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Alert regarding your upcoming booking"
            value={notifyTitleEn}
            onChange={(e) => setNotifyTitleEn(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
            نص الرسالة بالعربية <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            dir="rtl"
            required
            placeholder="اكتب نص الرسالة هنا..."
            value={notifyBodyAr}
            onChange={(e) => setNotifyBodyAr(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-600 dark:text-gray-300 mb-1">
            Message Body in English (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Write English message here..."
            value={notifyBodyEn}
            onChange={(e) => setNotifyBodyEn(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSendingNotification}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSendingNotification}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold"
          >
            {isSendingNotification ? "Sending..." : "🚀 Send Notification"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
