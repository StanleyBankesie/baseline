/**
 * @fileoverview UserList component.
 * Provides functionality for UserList.
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { filterAndSort } from "@/utils/searchUtils.js";
import api from "@/api/client.js";

/**
 *  component
 * 
 * @returns {JSX.Element} The rendered component
 */
export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Stats
  const stats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    inactive: users.filter((u) => !u.is_active).length,
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/admin/users");
      const d = response?.data;
      let items = [];
      if (Array.isArray(d)) items = d;
      else if (Array.isArray(d?.items)) items = d.items;
      else if (Array.isArray(d?.data?.items)) items = d.data.items;
      else if (Array.isArray(d?.data)) items = d.data;
      
      setUsers(items);
    } catch (err) {
      setError(err?.response?.data?.message || `API Error: ${err.message} (${err.code})` || "Error fetching users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = (() => {
    const base = users.filter((user) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && user.is_active) ||
        (statusFilter === "inactive" && !user.is_active);
      const matchesType =
        typeFilter === "all" ||
        (user.user_type &&
          user.user_type.toLowerCase() === typeFilter.toLowerCase());
      return matchesStatus && matchesType;
    });
    if (!searchTerm.trim()) return base;
    return filterAndSort(base, {
      query: searchTerm,
      getKeys: (u) => [u.full_name, u.username, u.email],
    });
  })();

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      // Assuming we might implement DELETE later, or just deactivate
      // For now, let's try to deactivate via PUT if DELETE not supported
      // But admin.routes.js doesn't have DELETE yet.
      // I'll skip DELETE implementation or just show alert.
      alert("Delete functionality not yet implemented in backend.");
    } catch (err) {
      alert("Failed to delete user");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">🔐 User Management System</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage user accounts and details</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/administration" className="btn btn-secondary">
            Return to Menu
          </Link>
          <Link to="/administration/users/new" className="btn btn-success">
            ➕ Create New User
          </Link>
          <button className="btn btn-primary" onClick={fetchUsers}>
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Search by Name/Email</label>
              <input
                type="text"
                className="input w-full"
                placeholder="Enter name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                className="input w-full"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Total Users</h3>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{stats.total}</div>
        </div>
        <div className="card p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Users</h3>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{stats.active}</div>
        </div>
        <div className="card p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
          <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400">Inactive Users</h3>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{stats.inactive}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Company</th>
                    <th>Branch</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const initials = (user.full_name || user.username || "?")
                        .substring(0, 2)
                        .toUpperCase();

                      return (
                        <tr key={user.id}>
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 overflow-hidden">
                                {user.profile_picture_url ? (
                                  <img
                                    src={user.profile_picture_url}
                                    alt={user.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  initials
                                )}
                              </div>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {user.full_name || "N/A"}
                              </span>
                            </div>
                          </td>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{user.company_name || "N/A"}</td>
                          <td>{user.branch_name || "N/A"}</td>
                          <td>
                            <span
                              className={`badge ${
                                user.is_active ? "badge-success" : "badge-danger"
                              }`}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td>
                            <Link
                              to={`/administration/users/${user.id}`}
                              className="btn btn-sm btn-primary"
                            >
                              ✏️ Edit
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
