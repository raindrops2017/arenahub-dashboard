import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import {
  PencilIcon,
  EyeIcon,
  DollarLineIcon,
  UserIcon,
  AlertIcon,
  CheckCircleIcon,
  CloseIcon,
} from "../icons";
import { CustomerUser, CustomerStatus, WalletTransaction } from "../types";
import { customerApi } from "../services/api/customerApi";
import { walletApi } from "../services/api/walletApi";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusTab, setStatusTab] = useState<string>("ALL");

  // Slide-over Drawer state
  const [drawerCustomer, setDrawerCustomer] = useState<CustomerUser | null>(null);

  // Customer Form Modal State (Edit)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerUser | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    phone: "",
    email: "",
    position: "Midfielder",
    walletBalance: 0,
    status: "Active" as CustomerStatus,
  });
  const [customerFormError, setCustomerFormError] = useState("");
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  // Cash Payout / Admin Deduction Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutCustomer, setPayoutCustomer] = useState<CustomerUser | null>(null);
  const [payoutAmount, setPayoutAmount] = useState<number | "">("");
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutError, setPayoutError] = useState("");
  const [payoutSuccess, setPayoutSuccess] = useState("");
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  // Wallet Top-Up Deposit Modal State
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositCustomer, setDepositCustomer] = useState<CustomerUser | null>(null);
  const [depositAmount, setDepositAmount] = useState<number | "">("");
  const [depositError, setDepositError] = useState("");
  const [depositSuccess, setDepositSuccess] = useState("");
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);

  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const custs = await customerApi.getAllCustomers();
      setCustomers(custs);

      const txs = await walletApi.getTransactions();
      setTransactions(txs);

      // Update active drawer customer if open
      if (drawerCustomer) {
        const updated = custs.find((c) => (c._id || c.id) === (drawerCustomer._id || drawerCustomer.id));
        if (updated) setDrawerCustomer(updated);
      }
    } catch (err) {
      console.error("Error fetching live customers:", err);
    } finally {
      setLoading(false);
    }
  }, [drawerCustomer]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handle Customer Modal Open (Edit)
  const handleOpenEditModal = (cust: CustomerUser) => {
    setEditingCustomer(cust);
    setCustomerFormData({
      name: cust.userName || cust.name || "",
      phone: cust.phone || "",
      email: cust.email || "",
      position: cust.position || cust.favoritePosition || "Midfielder",
      walletBalance: cust.walletBalance || 0,
      status: cust.status || "Active",
    });
    setCustomerFormError("");
    setIsCustomerModalOpen(true);
  };

  // Save Customer Form Submission
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerFormData.name.trim()) {
      setCustomerFormError("Customer Name is required.");
      return;
    }

    setIsSavingCustomer(true);
    setCustomerFormError("");
    try {
      if (editingCustomer) {
        await customerApi.updateCustomerUser(editingCustomer._id || editingCustomer.id || "", {
          userName: customerFormData.name.trim(),
          phone: customerFormData.phone.trim(),
          position: customerFormData.position,
          walletBalance: Number(customerFormData.walletBalance),
        });
      }
      setIsCustomerModalOpen(false);
      await refreshData();
    } catch (err: any) {
      setCustomerFormError(err.message || "Failed to save customer updates.");
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Handle Open Cash Payout Modal
  const handleOpenPayoutModal = (cust: CustomerUser) => {
    setPayoutCustomer(cust);
    setPayoutAmount("");
    setPayoutNote("");
    setPayoutError("");
    setPayoutSuccess("");
    setIsPayoutModalOpen(true);
  };

  // Handle Cash Payout Submission (deductAdmin)
  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutCustomer) return;

    const amountNum = Number(payoutAmount);
    if (!amountNum || amountNum <= 0) {
      setPayoutError("Payout amount must be greater than zero.");
      return;
    }

    if (!payoutNote.trim()) {
      setPayoutError("Audit note / reason is required for administrative deduction.");
      return;
    }

    setIsProcessingPayout(true);
    setPayoutError("");
    try {
      await walletApi.deductAdmin({
        userId: payoutCustomer._id || payoutCustomer.id || "",
        amount: amountNum,
        reason: payoutNote.trim(),
      });
      setPayoutSuccess(`Successfully deducted ${amountNum.toFixed(2)} EGP from ${payoutCustomer.userName || payoutCustomer.name}.`);
      setPayoutAmount("");
      setPayoutNote("");
      await refreshData();

      setTimeout(() => {
        setIsPayoutModalOpen(false);
        setPayoutSuccess("");
      }, 1200);
    } catch (err: any) {
      setPayoutError(err.message || "Failed to process administrative deduction.");
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Handle Open Deposit Modal
  const handleOpenDepositModal = (cust: CustomerUser) => {
    setDepositCustomer(cust);
    setDepositAmount("");
    setDepositError("");
    setDepositSuccess("");
    setIsDepositModalOpen(true);
  };

  // Handle Deposit Submission (depositWallet)
  const handleProcessDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositCustomer) return;

    const amountNum = Number(depositAmount);
    if (!amountNum || amountNum <= 0) {
      setDepositError("Deposit amount must be greater than zero.");
      return;
    }

    setIsProcessingDeposit(true);
    setDepositError("");
    try {
      await walletApi.depositWallet({
        userId: depositCustomer._id || depositCustomer.id || "",
        amount: amountNum,
      });
      setDepositSuccess(`Successfully deposited ${amountNum.toFixed(2)} EGP into ${depositCustomer.userName || depositCustomer.name}'s wallet.`);
      setDepositAmount("");
      await refreshData();

      setTimeout(() => {
        setIsDepositModalOpen(false);
        setDepositSuccess("");
      }, 1200);
    } catch (err: any) {
      setDepositError(err.message || "Failed to deposit funds.");
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // Filter Customers
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase();
    const name = (c.userName || c.name || "").toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const matchesSearch = name.includes(q) || phone.includes(q) || email.includes(q);

    const matchesStatus = statusTab === "ALL" || (c.status || "Active") === statusTab;

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalCustomersCount = customers.length;
  const activeCustomersCount = customers.filter((c) => c.status === "Active" || !c.status).length;
  const onHoldCount = customers.filter((c) => c.status === "On Hold").length;
  const totalWalletPool = customers.reduce((sum, c) => sum + (c.walletBalance || 0), 0);

  const getStatusBadgeColor = (status?: CustomerStatus) => {
    switch (status) {
      case "Active":
        return "success";
      case "On Hold":
        return "warning";
      case "Suspended":
        return "error";
      case "Inactive":
        return "light";
      default:
        return "success";
    }
  };

  // Transaction history for drawer customer
  const drawerTransactions = drawerCustomer
    ? transactions.filter(
        (t) =>
          t.userId === (drawerCustomer._id || drawerCustomer.id) ||
          t.customerId === (drawerCustomer._id || drawerCustomer.id)
      )
    : [];

  return (
    <>
      <PageMeta
        title="Customer Management & Digital Wallets | VenueOps"
        description="Live customer profile management, digital wallet balance top-ups, and admin cash payouts."
      />
      <PageBreadcrumb pageTitle="Customer Management" />

      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md lg:p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Customer Directory & Wallets
              </h2>
              <Badge color="primary" size="md">
                {totalCustomersCount} Live Customers
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Live customer accounts with direct digital wallet balance management, admin deposits, and audit deductions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshData} size="sm" variant="outline" disabled={loading}>
              🔄 {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Summary Metrics Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Total Customers
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                <UserIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-gray-800 dark:text-white">
              {totalCustomersCount}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Registered mobile platform players
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Active Players
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-50 text-success-500 dark:bg-success-500/15 dark:text-success-400">
                <CheckCircleIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-success-600 dark:text-success-400">
              {activeCustomersCount}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Eligible for instant slot locks
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                On Hold Accounts
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-50 text-warning-500 dark:bg-warning-500/15 dark:text-warning-400">
                <AlertIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-warning-600 dark:text-warning-400">
              {onHoldCount}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Pending mobile verification
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                Total Wallet Pool
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400">
                <DollarLineIcon className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalWalletPool.toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Circulating customer balances
            </p>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search customers by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusTab}
              onChange={(e) => setStatusTab(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Suspended">Suspended</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/80 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Phone Number</th>
                  <th className="px-6 py-4">Position</th>
                  <th className="px-6 py-4">Wallet Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredCustomers.map((customer) => {
                  const cId = customer._id || customer.id || "";
                  const cName = customer.userName || customer.name || "Customer";
                  return (
                    <tr key={cId} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={customer.avatar || customer.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                            alt={cName}
                            className="w-10 h-10 rounded-full object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                            }}
                          />
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {cName}
                            </p>
                            <span className="text-xs text-gray-400">
                              {customer.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {customer.phone || "—"}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-gray-700 dark:text-gray-300">
                        ⚽ {customer.position || customer.favoritePosition || "Midfielder"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm font-mono">
                          {Number(customer.walletBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <Badge color={getStatusBadgeColor(customer.status)} size="sm">
                          {customer.status || "Active"}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDepositModal(customer)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 transition"
                            title="Top-Up Wallet Deposit"
                          >
                            + Deposit
                          </button>
                          <button
                            onClick={() => handleOpenPayoutModal(customer)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400 transition"
                            title="Admin Deduction"
                          >
                            - Deduct
                          </button>
                          <button
                            onClick={() => setDrawerCustomer(customer)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="View History"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="Edit Profile"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── WALLET DEPOSIT MODAL ─── */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        className="max-w-md p-6 bg-white dark:bg-gray-800/90 backdrop-blur-md"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Deposit Funds to Wallet
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Top up {depositCustomer?.userName || depositCustomer?.name}&apos;s digital wallet.
          </p>

          {depositError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {depositError}
            </div>
          )}

          {depositSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {depositSuccess}
            </div>
          )}

          <form onSubmit={handleProcessDeposit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1.5">
                Deposit Amount (EGP)
              </label>
              <input
                type="number"
                min="1"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 500"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <Button size="sm" type="submit" disabled={isProcessingDeposit}>
                {isProcessingDeposit ? "Depositing..." : "Confirm Deposit"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── CASH PAYOUT / DEDUCTION MODAL ─── */}
      <Modal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        className="max-w-md p-6 bg-white dark:bg-gray-800/90 backdrop-blur-md"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Administrative Wallet Deduction
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Deduct funds from {payoutCustomer?.userName || payoutCustomer?.name}&apos;s wallet with audit reason.
          </p>

          {payoutError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {payoutError}
            </div>
          )}

          {payoutSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              {payoutSuccess}
            </div>
          )}

          <form onSubmit={handleProcessPayout} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1.5">
                Deduction Amount (EGP)
              </label>
              <input
                type="number"
                min="1"
                required
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="e.g. 200"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1.5">
                Reason / Audit Rationale <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="e.g. Cash settlement at venue reception"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <Button size="sm" type="submit" disabled={isProcessingPayout}>
                {isProcessingPayout ? "Processing..." : "Process Deduction"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── CUSTOMER EDIT MODAL ─── */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        className="max-w-md p-6 bg-white dark:bg-gray-800/90 backdrop-blur-md"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Edit Customer Profile
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Update account information and preferences.
          </p>

          {customerFormError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {customerFormError}
            </div>
          )}

          <form onSubmit={handleSaveCustomer} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={customerFormData.name}
                onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={customerFormData.phone}
                onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Preferred Position
              </label>
              <select
                value={customerFormData.position}
                onChange={(e) => setCustomerFormData({ ...customerFormData, position: e.target.value })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="Striker">Striker</option>
                <option value="Midfielder">Midfielder</option>
                <option value="Defender">Defender</option>
                <option value="Goalkeeper">Goalkeeper</option>
                <option value="Padel Right">Padel Right</option>
                <option value="Padel Left">Padel Left</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <Button size="sm" type="submit" disabled={isSavingCustomer}>
                {isSavingCustomer ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      {/* ─── DRAWER TRANSACTIONS HISTORY ─── */}
      {drawerCustomer && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-white dark:bg-gray-800/90 backdrop-blur-md h-full p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700/80">
                <div className="flex items-center gap-3">
                  <img
                    src={drawerCustomer.avatar || drawerCustomer.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt={drawerCustomer.userName || drawerCustomer.name}
                    className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-gray-800"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">
                      {drawerCustomer.userName || drawerCustomer.name}
                    </h3>
                    <p className="text-xs text-gray-500">{drawerCustomer.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerCustomer(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <CloseIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="my-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                    Live Wallet Balance
                  </span>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {Number(drawerCustomer.walletBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} EGP
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handleOpenDepositModal(drawerCustomer)}
                    className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                  >
                    + Deposit
                  </button>
                  <button
                    onClick={() => handleOpenPayoutModal(drawerCustomer)}
                    className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                  >
                    - Deduct
                  </button>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                  Transaction Ledger History
                </h4>
                {drawerTransactions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">
                    No transactions recorded for this wallet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {drawerTransactions.map((t) => (
                      <div
                        key={t._id || t.id}
                        className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {t.type}
                          </span>
                          <span className={`font-mono font-bold ${t.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {t.amount >= 0 ? `+${t.amount}` : t.amount} EGP
                          </span>
                        </div>
                        <p className="text-gray-500 text-[11px]">{t.description || t.reason}</p>
                        <p className="text-[10px] text-gray-400 mt-1 font-mono">{t.createdAt}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                onClick={() => setDrawerCustomer(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-200"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}


