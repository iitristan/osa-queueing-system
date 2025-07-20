"use client";

import { useState, useEffect } from "react";
import { FiPlus, FiTrash2, FiX, FiSettings, FiUser } from "react-icons/fi";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Header from "@/app/_components/Header";

interface User {
  id: string;
  name: string;
  email: string;
  online: boolean;
  access?: boolean;
}

interface Officer {
  id: string;
  user_id: string;
  prefix: string;
  role: string;
  counter_type: string;
  online: boolean;
  user: User;
}

const ROLES = ["OSA Director", "OSA Staff", "Student Assistant", "Admin Staff"];

const COUNTER_TYPES = [
  "General Inquiries",
  "Document Processing",
  "Student Organizations",
  "ID/Form Requests",
  "Scholarships",
  "Student Services",
  "Complaints/Concerns",
];

export default function OfficerManager() {
  const router = useRouter();
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    userId: "",
    prefix: "",
    role: "",
    counter_type: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{
    open: boolean;
    officer: Officer | null;
  }>({ open: false, officer: null });
  const [editForm, setEditForm] = useState({
    prefix: "",
    role: "",
    counter_type: "",
    online: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("user.name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [userSortBy, setUserSortBy] = useState<string>("name");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("asc");
  const [nonOfficerUsers, setNonOfficerUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchOfficers();
    fetchAvailableUsers();
    fetchNonOfficerUsers();

    // Subscribe to real-time updates
    const officerSubscription = supabase
      .channel("officers-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "officers" },
        () => {
          fetchOfficers();
          fetchAvailableUsers();
        }
      )
      .subscribe();

    return () => {
      officerSubscription.unsubscribe();
    };
  }, []);

  const fetchOfficers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("officers")
        .select(
          `
          *,
          user:users (
            id,
            name,
            email,
            online,
            access
          )
        `
        )
        .order("prefix");

      if (error) throw error;

      // Sort officers by prefix alphabetically
      const sortedOfficers = (data || []).sort((a, b) =>
        a.prefix.localeCompare(b.prefix)
      );
      setOfficers(sortedOfficers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch officers");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // First get all officer user_ids
      const { data: officerData } = await supabase
        .from("officers")
        .select("user_id");

      const officerUserIds = officerData?.map((o) => o.user_id) || [];

      // If there are no officers, just get all users
      if (officerUserIds.length === 0) {
        const { data, error } = await supabase
          .from("users")
          .select("id, name, email, online");

        if (error) throw error;
        setAvailableUsers(data || []);
        return;
      }

      // Then get users who are not officers
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, online")
        .not("id", "in", `(${officerUserIds.join(",")})`);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (err) {
      console.error("Error fetching available users:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch available users"
      );
    }
  };

  const fetchNonOfficerUsers = async () => {
    try {
      const { data: officerData } = await supabase.from("officers").select("user_id");
      const officerUserIds = officerData?.map((o) => o.user_id) || [];
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, online, access")
        .not("id", "in", `(${officerUserIds.join(",")})`);
      if (error) throw error;
      setNonOfficerUsers(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    }
  };

  const validateForm = () => {
    if (!formData.userId) {
      setFormError("User is required");
      return false;
    }
    if (!formData.prefix.trim()) {
      setFormError("Counter number is required");
      return false;
    }
    if (!formData.role) {
      setFormError("Role is required");
      return false;
    }
    if (!formData.counter_type) {
      setFormError("Counter type is required");
      return false;
    }
    // Check if prefix already exists
    if (
      officers.some(
        (officer) =>
          officer.prefix.toLowerCase() === formData.prefix.trim().toLowerCase()
      )
    ) {
      setFormError("Counter number already exists");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validateForm()) return;

    try {
      setLoading(true);
      const formattedPrefix = formData.prefix.trim();

      const { error } = await supabase.from("officers").insert([
        {
          user_id: formData.userId,
          prefix: formattedPrefix,
          role: formData.role,
          counter_type: formData.counter_type,
          online: true,
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setFormData({ userId: "", prefix: "", role: "", counter_type: "" });
    } catch (err) {
      console.error("Error creating officer:", err);
      setError(err instanceof Error ? err.message : "Failed to create officer");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this officer?")) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("officers").delete().eq("id", id);
      if (error) throw error;
      fetchOfficers();
      fetchAvailableUsers(); // Refresh available users list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete officer");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (officer: Officer) => {
    setEditForm({
      prefix: officer.prefix,
      role: officer.role,
      counter_type: officer.counter_type,
      online: officer.online,
    });
    setEditModal({ open: true, officer });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editModal.officer) return;
    if (!editForm.prefix.trim()) {
      setEditError("Counter number is required");
      return;
    }
    if (!editForm.role) {
      setEditError("Role is required");
      return;
    }
    if (!editForm.counter_type) {
      setEditError("Counter type is required");
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase
        .from("officers")
        .update({
          prefix: editForm.prefix.trim(),
          role: editForm.role,
          counter_type: editForm.counter_type,
          online: editForm.online,
        })
        .eq("id", editModal.officer.id);
      if (error) throw error;
      setEditModal({ open: false, officer: null });
      fetchOfficers();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update officer"
      );
    } finally {
      setLoading(false);
    }
  };

  // Toggle access for a user
  const handleToggleAccess = async (userId: string, currentAccess: boolean | undefined) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ access: !currentAccess })
        .eq("id", userId);
      if (error) throw error;
      fetchOfficers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setLoading(false);
    }
  };

  // Toggle online status for an officer
  const handleToggleStatus = async (officer: Officer) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("officers")
        .update({ online: !officer.online })
        .eq("id", officer.id);
      if (error) throw error;
      fetchOfficers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  // Sorting logic for officers
  const sortedOfficers = [...officers]
    .filter((officer) => {
      const q = search.toLowerCase();
      return (
        officer.user.name.toLowerCase().includes(q) ||
        officer.user.email.toLowerCase().includes(q) ||
        officer.prefix.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let aValue: string | number | boolean = "";
      let bValue: string | number | boolean = "";
      if (sortBy === "user.name") {
        aValue = a.user.name;
        bValue = b.user.name;
      } else if (sortBy.startsWith("user.")) {
        const key = sortBy.split(".")[1] as keyof User;
        aValue = a.user[key] as string | number | boolean;
        bValue = b.user[key] as string | number | boolean;
      } else {
        const key = sortBy as keyof Officer;
        aValue = a[key] as string | number | boolean;
        bValue = b[key] as string | number | boolean;
      }
      if (aValue < bValue) return sortDir === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  // Sorting logic for non-officer users
  const sortedNonOfficerUsers = [...nonOfficerUsers]
    .filter((user) => {
      const q = search.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const key = userSortBy as keyof User;
      const aValue = a[key] as string | number | boolean;
      const bValue = b[key] as string | number | boolean;
      if (aValue < bValue) return userSortDir === "asc" ? -1 : 1;
      if (aValue > bValue) return userSortDir === "asc" ? 1 : -1;
      return 0;
    });

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };
  const handleUserSort = (col: string) => {
    if (userSortBy === col) {
      setUserSortDir(userSortDir === "asc" ? "desc" : "asc");
    } else {
      setUserSortBy(col);
      setUserSortDir("asc");
    }
  };

  // Add as Officer action
  const handleAddAsOfficer = async (user: User) => {
    setLoading(true);
    try {
      // You may want to show a modal to select role/counter, but for now just add with defaults
      const { error } = await supabase.from("officers").insert([
        {
          user_id: user.id,
          prefix: "", // Should be set by admin in real use
          role: "OSA Staff",
          counter_type: "General Inquiries",
          online: false,
        },
      ]);
      if (error) throw error;
      fetchOfficers();
      fetchNonOfficerUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add officer");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedOfficerIds.length === sortedOfficers.length) {
      setSelectedOfficerIds([]);
    } else {
      setSelectedOfficerIds(sortedOfficers.map((o) => o.id));
    }
  };

  const toggleSelectOfficer = (id: string) => {
    setSelectedOfficerIds((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
    <div className="w-full min-h-screen px-12 py-12 text-[1.15rem]">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Officers</h2>
          <p className="text-base text-gray-500 mt-1">Manage counter officers</p>
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search officer..."
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent bg-white"
          />
          <button
            onClick={() => setShowModal(true)}
            className="p-2 bg-[#FCBF15] text-white rounded-lg hover:bg-[#e5ac13] transition-colors shadow-sm flex items-center gap-2"
            title="Add Officer"
            disabled={availableUsers.length === 0}
          >
            <FiPlus className="w-5 h-5" />
            <span className="font-semibold">Add Officer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm border border-red-100 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full">
        <table className="w-full divide-y divide-gray-200 text-lg">
          <thead className="bg-gray-100 text-lg">
            <tr>
              <th className="px-6 py-4 w-12 text-center font-semibold"> <input type="checkbox" checked={selectedOfficerIds.length === sortedOfficers.length && sortedOfficers.length > 0} onChange={toggleSelectAll} /> </th>
              <th className="px-6 py-4 font-semibold text-left cursor-pointer" onClick={() => handleSort("user.name")}>Name</th>
              <th className="px-6 py-4 font-semibold text-left cursor-pointer" onClick={() => handleSort("user.email")}>Email</th>
              <th className="px-6 py-4 font-semibold text-center cursor-pointer" onClick={() => handleSort("prefix")}>Counter</th>
              <th className="px-6 py-4 font-semibold text-center cursor-pointer" onClick={() => handleSort("counter_type")}>Counter Type</th>
              <th className="px-6 py-4 font-semibold text-center cursor-pointer" onClick={() => handleSort("role")}>Role</th>
              <th className="px-6 py-4 font-semibold text-center cursor-pointer" onClick={() => handleSort("online")}>Status</th>
              <th className="px-6 py-4 font-semibold text-center cursor-pointer" onClick={() => handleSort("user.access")}>Access</th>
              <th className="px-6 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedOfficers.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-gray-400 text-lg">No officers found.</td>
              </tr>
            ) : (
              sortedOfficers.map((officer) => (
                <tr key={officer.id} className="hover:bg-gray-50 transition-colors text-xl">
                  <td className="px-6 py-4 text-center align-middle">
                    <input type="checkbox" checked={selectedOfficerIds.includes(officer.id)} onChange={() => toggleSelectOfficer(officer.id)} />
                  </td>
                  <td className="px-6 py-4 align-middle font-semibold text-gray-900 whitespace-nowrap">{officer.user.name}</td>
                  <td className="px-6 py-4 align-middle text-gray-700 whitespace-nowrap">{officer.user.email}</td>
                  <td className="px-6 py-4 align-middle text-center text-gray-800 font-bold whitespace-nowrap">{officer.prefix}</td>
                  <td className="px-6 py-4 align-middle text-center text-gray-700 whitespace-nowrap">{officer.counter_type}</td>
                  <td className="px-6 py-4 align-middle text-center text-gray-700 whitespace-nowrap">{officer.role}</td>
                  <td className="px-6 py-4 align-middle text-center">
                    <button
                      onClick={() => handleToggleStatus(officer)}
                      disabled={loading}
                      className={`inline-flex items-center px-4 py-1 rounded-full font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#FCBF15] ${officer.online ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"}`}
                      title={officer.online ? "Set to Standby" : "Set to Active"}
                    >
                      <span className="mr-2 w-2 h-2 rounded-full inline-block" style={{ background: officer.online ? '#22c55e' : '#eab308' }}></span>
                      {officer.online ? "Active" : "Standby"}
                    </button>
                  </td>
                  <td className="px-6 py-4 align-middle text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={officer.user.access ?? true}
                        onChange={() => handleToggleAccess(officer.user.id, officer.user.access)}
                        disabled={loading}
                      />
                      <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-400 transition-colors"></div>
                      <span className="ml-2 text-sm font-medium text-gray-700">{officer.user.access ? "Enabled" : "Disabled"}</span>
                    </label>
                  </td>
                  <td className="px-6 py-4 align-middle text-center flex gap-2 justify-center">
                    <button
                      onClick={() => router.push(`/admin/officer/${officer.id}`)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="View Profile"
                    >
                      <FiUser className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(officer);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                      title="Edit Officer"
                    >
                      <FiSettings className="w-5 h-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(officer.id);
                      }}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Officer"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-16">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Newly Registered Users (Not Yet Officers)</h3>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 w-full">
          <table className="w-full divide-y divide-gray-200 text-lg">
            <thead className="bg-gray-100 text-lg">
              <tr>
                <th className="px-6 py-4 font-semibold text-left cursor-pointer" onClick={() => handleUserSort("name")}>Name</th>
                <th className="px-6 py-4 font-semibold text-left cursor-pointer" onClick={() => handleUserSort("email")}>Email</th>
                <th className="px-6 py-4 font-semibold text-center cursor-pointer" onClick={() => handleUserSort("access")}>Access</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedNonOfficerUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400 text-lg">No new users found.</td>
                </tr>
              ) : (
                sortedNonOfficerUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors text-xl">
                    <td className="px-6 py-4 align-middle font-semibold text-gray-900 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 align-middle text-gray-700 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 align-middle text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={user.access ?? true}
                          onChange={() => handleToggleAccess(user.id, user.access)}
                          disabled={loading}
                        />
                        <div className="w-12 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-400 transition-colors"></div>
                        <span className="ml-2 text-sm font-medium text-gray-700">{user.access ? "Enabled" : "Disabled"}</span>
                      </label>
                    </td>
                    <td className="px-6 py-4 align-middle text-center flex gap-2 justify-center">
                      <button
                        onClick={() => handleAddAsOfficer(user)}
                        className="p-2 text-white bg-[#FCBF15] rounded-lg hover:bg-[#e5ac13] transition-colors font-semibold"
                        disabled={loading}
                      >
                        Add as Officer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Officer Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Add Officer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Create a new counter officer</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select User
                  </label>
                  <select
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                  >
                    <option value="">Select a user</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Counter Number
                  </label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                    placeholder="1, 2, 3, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                  >
                    <option value="">Select a role</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Table Type
                  </label>
                  <select
                    value={formData.counter_type}
                    onChange={(e) => setFormData({ ...formData, counter_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                  >
                    <option value="">Select table type</option>
                    {COUNTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#FCBF15] rounded-lg hover:bg-[#e5ac13] disabled:opacity-50 transition-colors"
                >
                  {loading ? "Adding..." : "Add Officer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Officer Modal */}
      {editModal.open && editModal.officer && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Edit Officer</h3>
                <p className="text-xs text-gray-500 mt-0.5">Update officer details</p>
              </div>
              <button
                onClick={() => setEditModal({ open: false, officer: null })}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {editError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  {editError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Table Number
                  </label>
                  <input
                    type="text"
                    value={editForm.prefix}
                    onChange={(e) => setEditForm({ ...editForm, prefix: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                    placeholder="1, 2, 3, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                  >
                    <option value="">Select a role</option>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Table Type
                  </label>
                  <select
                    value={editForm.counter_type}
                    onChange={(e) => setEditForm({ ...editForm, counter_type: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                  >
                    <option value="">Select counter type</option>
                    {COUNTER_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Status
                  </label>
                  <select
                    value={editForm.online ? "active" : "standby"}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        online: e.target.value === "active",
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FCBF15] focus:border-transparent"
                    required
                  >
                    <option value="active">Active</option>
                    <option value="standby">Standby</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditModal({ open: false, officer: null })}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#FCBF15] rounded-lg hover:bg-[#e5ac13] disabled:opacity-50 transition-colors"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
