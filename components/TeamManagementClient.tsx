"use client";

import React, { useState } from "react";
import { Store, TeamMember, UserRole } from "@/lib/types";
import {
  Users,
  Plus,
  X,
  Mail,
  ShieldCheck,
  Store as StoreIcon,
  Ban,
  Check,
  Trash2,
  Edit2,
  Search,
} from "lucide-react";

interface Props {
  initialMembers: TeamMember[];
  stores: Store[];
  superAdminEmail: string;
}

interface FormState {
  name: string;
  email: string;
  role: UserRole;
  storeIds: string[];
}

const EMPTY_FORM: FormState = { name: "", email: "", role: "store_admin", storeIds: [] };

export default function TeamManagementClient({ initialMembers, stores, superAdminEmail }: Props) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

  const storeNameById = (id: string) => stores.find((s) => s.id === id);

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  const openAddModal = () => {
    setEditingMemberId(null);
    setForm(EMPTY_FORM);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      role: member.role,
      storeIds: member.role === "super_admin" ? [] : member.storeIds,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const toggleStore = (storeId: string) => {
    setForm((prev) => ({
      ...prev,
      storeIds: prev.storeIds.includes(storeId)
        ? prev.storeIds.filter((id) => id !== storeId)
        : [...prev.storeIds, storeId],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      setErrorMsg("An email address is required");
      return;
    }

    setIsSaving(true);
    setErrorMsg("");

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      storeIds: form.role === "super_admin" ? [] : form.storeIds,
    };

    try {
      if (editingMemberId) {
        const res = await fetch(`/api/team/${editingMemberId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setMembers((prev) => prev.map((m) => (m.id === editingMemberId ? data.member : m)));
          setIsModalOpen(false);
        } else {
          const data = await res.json().catch(() => null);
          setErrorMsg(data?.error || "Failed to update team member");
        }
      } else {
        const res = await fetch("/api/team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          setMembers((prev) => [...prev, data.member]);
          setIsModalOpen(false);
        } else {
          const data = await res.json().catch(() => null);
          setErrorMsg(data?.error || "Failed to invite team member");
        }
      }
    } catch {
      setErrorMsg("Network error saving team member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (member: TeamMember) => {
    setBusyMemberId(member.id);
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: member.status === "active" ? "suspended" : "active",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setMembers((prev) => prev.map((m) => (m.id === member.id ? data.member : m)));
      } else {
        alert("Failed to update access");
      }
    } catch {
      alert("Network error updating access");
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemove = async (member: TeamMember) => {
    if (!confirm(`Remove ${member.email} from the team? They will lose console access immediately.`)) return;
    setBusyMemberId(member.id);
    try {
      const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== member.id));
      } else {
        alert("Failed to remove team member");
      }
    } catch {
      alert("Network error removing team member");
    } finally {
      setBusyMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
            <Users className="w-3.5 h-3.5" />
            Role-Based Access Control
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Team &amp; Store Access</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Invite store admins and choose exactly which locations they can manage. Owners always retain platform control.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-5 py-2.5 rounded-2xl bg-zinc-900 text-white font-semibold text-xs hover:bg-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Invite Store Admin
        </button>
      </div>

      {/* Platform owner card */}
      <div className="bg-white rounded-3xl p-6 border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
            ★
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-zinc-900">Platform Owner</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Super Admin
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">{superAdminEmail}</p>
          </div>
        </div>
        <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Full control over every location
        </span>
      </div>

      {/* Search */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search team by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 text-xs pl-10 pr-9 py-2.5 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-4">
        {filteredMembers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-zinc-200 text-center space-y-3">
            <Users className="w-10 h-10 text-zinc-300 mx-auto" />
            <h3 className="font-bold text-zinc-900">
              {members.length === 0 ? "No store admins invited yet" : "No team members match your search"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              {members.length === 0
                ? "Invite a restaurant owner or manager and assign only the locations they should manage."
                : "Try a different name or email."}
            </p>
            {members.length === 0 && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Invite your first store admin
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 ${
                member.status === "suspended" ? "border-zinc-300 bg-zinc-50/60" : "border-zinc-200"
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                    member.status === "suspended"
                      ? "bg-zinc-200 text-zinc-500"
                      : "bg-zinc-900 text-white"
                  }`}
                >
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>

                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-zinc-900 truncate">
                      {member.name || member.email.split("@")[0]}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        member.role === "super_admin"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {member.role === "super_admin" ? "Super Admin" : "Store Admin"}
                    </span>
                    {member.status === "suspended" && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600 border border-zinc-300">
                        Suspended
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    {member.email}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {member.role === "super_admin" ? (
                      <span className="text-[11px] text-zinc-500 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> All locations
                      </span>
                    ) : member.storeIds.length === 0 ? (
                      <span className="text-[11px] text-amber-700 font-medium">
                        No locations assigned yet
                      </span>
                    ) : (
                      member.storeIds.map((storeId) => {
                        const store = storeNameById(storeId);
                        return (
                          <span
                            key={storeId}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 font-medium flex items-center gap-1"
                          >
                            <StoreIcon className="w-3 h-3 text-zinc-400" />
                            {store ? store.name : storeId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => openEditModal(member)}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-100 text-zinc-800 text-xs font-semibold hover:bg-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit Access
                </button>

                <button
                  type="button"
                  disabled={busyMemberId === member.id}
                  onClick={() => handleToggleStatus(member)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    member.status === "active"
                      ? "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                      : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  {member.status === "active" ? (
                    <>
                      <Ban className="w-3.5 h-3.5" /> Suspend
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Reactivate
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={busyMemberId === member.id}
                  onClick={() => handleRemove(member)}
                  className="p-2.5 rounded-xl bg-zinc-100 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                  title="Remove from team"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">
                  {editingMemberId ? "Edit Team Access" : "Invite Store Admin"}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  They sign in with Clerk using this exact email address.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 text-zinc-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rohan Mehta"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="owner@restaurant.com"
                    className="w-full text-xs p-3 rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: "store_admin" }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      form.role === "store_admin"
                        ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="block text-xs font-bold text-zinc-900">Store Admin</span>
                    <span className="block text-[11px] text-zinc-500 mt-0.5">
                      Sees only assigned locations
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: "super_admin" }))}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      form.role === "super_admin"
                        ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                        : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="block text-xs font-bold text-zinc-900">Super Admin</span>
                    <span className="block text-[11px] text-zinc-500 mt-0.5">
                      Full platform access
                    </span>
                  </button>
                </div>
              </div>

              {form.role === "store_admin" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Assigned Locations ({form.storeIds.length} selected)
                  </label>
                  {stores.length === 0 ? (
                    <p className="text-[11px] text-zinc-500 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      Add a restaurant first, then assign it here.
                    </p>
                  ) : (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 rounded-xl border border-zinc-200 bg-zinc-50">
                      {stores.map((store) => {
                        const checked = form.storeIds.includes(store.id);
                        return (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => toggleStore(store.id)}
                            className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                              checked
                                ? "bg-white border-zinc-900 shadow-sm"
                                : "bg-white/60 border-zinc-200 hover:bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  checked ? "bg-zinc-900 border-zinc-900" : "border-zinc-300"
                                }`}
                              >
                                {checked && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-xs font-semibold text-zinc-900 truncate">
                                  {store.name}
                                </span>
                                <span className="block text-[10px] text-zinc-500 font-mono truncate">
                                  /r/{store.slug}
                                </span>
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400 shrink-0">{store.category}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-1.5">
                    Store admins can edit dishes and sentence combinations for their locations — and nothing else.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-black transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingMemberId ? "Save Access" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
