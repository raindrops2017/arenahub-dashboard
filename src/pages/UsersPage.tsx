import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import { Modal } from "../components/ui/modal";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { PlusIcon, PencilIcon } from "../icons";
import { AdminUser, SystemUserRole } from "../types";
import { usersApi } from "../services/api/usersApi";

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as SystemUserRole,
  });

  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refreshUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await usersApi.getAllAdmins();
      setUsers(list);
    } catch (err) {
      console.error("Error loading admin users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUsers();
  }, [refreshUsers]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "admin",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: AdminUser) => {
    setEditingUser(user);
    setFormData({
      name: user.userName || user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "admin",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setFormError("Name and Email are required fields.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      if (editingUser) {
        await usersApi.updateAdminUser(editingUser._id || editingUser.id || "", {
          userName: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim() || undefined,
          role: formData.role.toLowerCase(),
        });
      } else {
        if (!formData.password.trim()) {
          setFormError("Password is required for new staff accounts.");
          setIsSubmitting(false);
          return;
        }
        await usersApi.createAdminUser({
          userName: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: formData.role.toLowerCase(),
        });
      }
      setIsModalOpen(false);
      await refreshUsers();
    } catch (err: any) {
      setFormError(err.message || "Failed to save administrative staff user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase();
    const name = (u.userName || u.name || "").toLowerCase();
    const email = (u.email || "").toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query);

    const matchesRole = roleFilter === "ALL" || (u.role || "").toLowerCase() === roleFilter.toLowerCase();

    return matchesSearch && matchesRole;
  });

  const getRoleBadgeColor = (role?: string) => {
    const r = (role || "").toLowerCase();
    switch (r) {
      case "superadmin":
        return "primary";
      case "admin":
        return "primary";
      case "manager":
        return "warning";
      case "owner":
        return "success";
      default:
        return "info";
    }
  };

  return (
    <>
      <PageMeta
        title="Admin & Staff Accounts | VenueOps"
        description="System management users, roles, and administrative staff accounts."
      />
      <PageBreadcrumb pageTitle="Staff Accounts" />

      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md lg:p-6 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white/90">
                Staff & Administrators
              </h2>
              <Badge color="primary" size="md">
                {users.length} Accounts
              </Badge>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage SuperAdmins, Venue Managers, and Staff access permissions on the live system.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={refreshUsers} size="sm" variant="outline" disabled={loading}>
              🔄 {loading ? "Loading..." : "Refresh"}
            </Button>
            <Button
              onClick={handleOpenCreateModal}
              startIcon={<PlusIcon className="w-5 h-5" />}
            >
              Add Staff User
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search staff by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2 text-sm text-gray-800 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="ALL">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="owner">Owner</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/80 dark:bg-gray-800/90 backdrop-blur-md shadow-sm">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 dark:bg-gray-800/50 dark:border-gray-700/80 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user._id || user.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                          {(user.userName || user.name || "U").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {user.userName || user.name}
                          </p>
                          <span className="text-xs text-gray-400 font-mono">
                            ID: {user._id || user.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-gray-700 dark:text-gray-300">
                      {user.email}
                    </td>

                    <td className="px-6 py-4">
                      <Badge color={getRoleBadgeColor(user.role)} size="sm">
                        {user.role}
                      </Badge>
                    </td>

                    <td className="px-6 py-4 text-xs text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-brand-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        title="Edit User"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── CREATE / EDIT USER MODAL ─── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="max-w-md p-6 bg-white dark:bg-gray-800/90 backdrop-blur-md"
      >
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            {editingUser ? `Edit Staff User: ${editingUser.userName || editingUser.name}` : "Create Staff Account"}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Configure system permissions and login credentials.
          </p>

          {formError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSaveUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sarah Admin"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. staff@venue.com"
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                Password {editingUser ? "(Leave blank to keep unchanged)" : <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? "••••••••" : "Min. 6 characters"}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-1">
                System Role
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as SystemUserRole })}
                className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              >
                <option value="admin">Admin</option>
                <option value="manager">Venue Manager</option>
                <option value="owner">Venue Owner</option>
                <option value="superAdmin">Super Admin</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/80">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <Button size="sm" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : editingUser ? "Save Changes" : "Create Account"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}



