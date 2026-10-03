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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 inline-flex -rotate-1 items-center gap-1.5 border-[3px] border-black bg-neo-green px-2.5 py-1 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs">
            <Users className="h-3.5 w-3.5" strokeWidth={3} />
            Role-based access control
          </div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-black">Team &amp; store access</h1>
          <p className="mt-1 text-xs font-bold text-black/70">
            Invite store admins and choose exactly which locations they can manage. Owners always
            retain platform control.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="shrink-0 cursor-pointer border-4 border-black bg-neo-red px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow active:translate-x-1 active:translate-y-1 active:shadow-none"
        >
          <Plus className="mr-1 inline h-4 w-4" strokeWidth={3} /> Invite store admin
        </button>
      </div>

      {/* Platform owner card */}
      <div className="flex flex-col items-start justify-between gap-4 border-4 border-black bg-white p-6 shadow-neo-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 -rotate-3 items-center justify-center border-[3px] border-black bg-neo-yellow text-lg font-black text-black shadow-neo-xs">
            ★
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-black uppercase tracking-wide text-black">Platform Owner</h3>
              <span className="border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                Super Admin
              </span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-black/60">{superAdminEmail}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-black">
          <ShieldCheck className="h-4 w-4 text-neo-green" strokeWidth={3} /> Full control over every location
        </span>
      </div>

      {/* Search */}
      <div className="border-4 border-black bg-white p-3.5 shadow-neo-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-black" strokeWidth={3} />
          <input
            type="text"
            placeholder="Search team by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-[3px] border-black bg-cream py-2.5 pl-10 pr-9 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-2.5 cursor-pointer border border-black bg-white px-1 text-xs font-black text-black hover:bg-neo-red"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-5">
        {filteredMembers.length === 0 ? (
          <div className="space-y-3 border-4 border-dashed border-black bg-white p-12 text-center shadow-neo-sm">
            <Users className="mx-auto h-10 w-10 text-black/30" strokeWidth={2.5} />
            <h3 className="font-black uppercase tracking-wide text-black">
              {members.length === 0 ? "No store admins invited yet" : "No team members match your search"}
            </h3>
            <p className="mx-auto max-w-md text-xs font-bold text-black/60">
              {members.length === 0
                ? "Invite a restaurant owner or manager and assign only the locations they should manage."
                : "Try a different name or email."}
            </p>
            {members.length === 0 && (
              <button
                onClick={openAddModal}
                className="inline-flex cursor-pointer items-center gap-1.5 border-[3px] border-black bg-neo-red px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-xs transition-all duration-100 ease-linear hover:bg-black active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={3} /> Invite your first store admin
              </button>
            )}
          </div>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className={`flex flex-col items-start justify-between gap-5 border-4 border-black p-6 shadow-neo-sm transition-all duration-200 ease-linear hover:-translate-y-1 hover:shadow-neo-md lg:flex-row lg:items-center ${
                member.status === "suspended" ? "bg-cream" : "bg-white"
              }`}
            >
              <div className="flex flex-1 items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 -rotate-3 items-center justify-center border-[3px] border-black text-sm font-black shadow-neo-xs ${
                    member.status === "suspended" ? "bg-white text-black/50" : "bg-black text-white"
                  }`}
                >
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-black text-black">
                      {member.name || member.email.split("@")[0]}
                    </h3>
                    <span
                      className={`border-2 border-black px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs ${
                        member.role === "super_admin" ? "bg-neo-yellow" : "bg-neo-blue text-white"
                      }`}
                    >
                      {member.role === "super_admin" ? "Super Admin" : "Store Admin"}
                    </span>
                    {member.status === "suspended" && (
                      <span className="border-2 border-black bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-black shadow-neo-xs">
                        Suspended
                      </span>
                    )}
                  </div>

                  <p className="flex items-center gap-1.5 truncate text-xs font-bold text-black/60">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-black" strokeWidth={3} />
                    {member.email}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {member.role === "super_admin" ? (
                      <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-black">
                        <ShieldCheck className="h-3.5 w-3.5 text-neo-green" strokeWidth={3} /> All locations
                      </span>
                    ) : member.storeIds.length === 0 ? (
                      <span className="text-[11px] font-black uppercase tracking-widest text-black">
                        No locations assigned yet
                      </span>
                    ) : (
                      member.storeIds.map((storeId, i) => {
                        const store = storeNameById(storeId);
                        return (
                          <span
                            key={storeId}
                            className={`flex items-center gap-1 border-2 border-black bg-white px-2.5 py-1 text-[11px] font-black text-black shadow-neo-xs ${
                              i % 2 === 0 ? "-rotate-1" : "rotate-1"
                            }`}
                          >
                            <StoreIcon className="h-3 w-3" strokeWidth={3} />
                            {store ? store.name : storeId}
                          </span>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 lg:w-auto">
                <button
                  type="button"
                  onClick={() => openEditModal(member)}
                  className="flex cursor-pointer items-center gap-1.5 border-[3px] border-black bg-white px-3.5 py-2.5 text-xs font-black uppercase tracking-widest text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-blue hover:text-white active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                >
                  <Edit2 className="h-3.5 w-3.5" strokeWidth={3} /> Edit access
                </button>

                <button
                  type="button"
                  disabled={busyMemberId === member.id}
                  onClick={() => handleToggleStatus(member)}
                  className={`flex cursor-pointer items-center gap-1.5 border-[3px] border-black px-3.5 py-2.5 text-xs font-black uppercase tracking-widest shadow-neo-xs transition-all duration-100 ease-linear disabled:cursor-wait disabled:opacity-50 enabled:active:translate-x-0.5 enabled:active:translate-y-0.5 enabled:active:shadow-none ${
                    member.status === "active"
                      ? "bg-neo-yellow text-black hover:bg-white"
                      : "bg-neo-green text-black hover:bg-white"
                  }`}
                >
                  {member.status === "active" ? (
                    <>
                      <Ban className="h-3.5 w-3.5" strokeWidth={3} /> Suspend
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" strokeWidth={3} /> Reactivate
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={busyMemberId === member.id}
                  onClick={() => handleRemove(member)}
                  className="cursor-pointer border-2 border-black bg-white p-2.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red disabled:cursor-wait disabled:opacity-50 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  title="Remove from team"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={3} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto border-4 border-black bg-white shadow-neo-xl">
            <div className="sticky top-0 flex items-center justify-between border-b-4 border-black bg-neo-yellow px-6 py-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-wide text-black">
                  {editingMemberId ? "Edit team access" : "Invite store admin"}
                </h2>
                <p className="text-[11px] font-bold text-black/70">
                  They sign in with Clerk using this exact email address.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="cursor-pointer border-2 border-black bg-white p-1.5 text-black shadow-neo-xs transition-all duration-100 ease-linear hover:bg-neo-red active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
              >
                <X className="h-4 w-4" strokeWidth={3} />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 border-[3px] border-black bg-neo-red px-3 py-2 text-xs font-black uppercase tracking-wide text-black">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Rohan Mehta"
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Email address *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="owner@restaurant.com"
                    className="w-full border-[3px] border-black bg-cream px-3 py-3 text-xs font-bold text-black placeholder-black/40 shadow-neo-xs transition-all duration-100 ease-linear focus:bg-neo-yellow focus:shadow-neo-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: "store_admin" }))}
                    className={`cursor-pointer border-[3px] border-black p-3 text-left transition-all duration-100 ease-linear shadow-neo-xs ${
                      form.role === "store_admin"
                        ? "-rotate-1 bg-black text-white"
                        : "bg-white text-black hover:bg-neo-yellow"
                    }`}
                  >
                    <span className="block text-xs font-black uppercase tracking-wide">Store admin</span>
                    <span className={`mt-0.5 block text-[11px] font-bold ${form.role === "store_admin" ? "text-white/70" : "text-black/60"}`}>
                      Sees only assigned locations
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, role: "super_admin" }))}
                    className={`cursor-pointer border-[3px] border-black p-3 text-left transition-all duration-100 ease-linear shadow-neo-xs ${
                      form.role === "super_admin"
                        ? "rotate-1 bg-black text-white"
                        : "bg-white text-black hover:bg-neo-yellow"
                    }`}
                  >
                    <span className="block text-xs font-black uppercase tracking-wide">Super admin</span>
                    <span className={`mt-0.5 block text-[11px] font-bold ${form.role === "super_admin" ? "text-white/70" : "text-black/60"}`}>
                      Full platform access
                    </span>
                  </button>
                </div>
              </div>

              {form.role === "store_admin" && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-black uppercase tracking-widest text-black">
                    Assigned locations ({form.storeIds.length} selected)
                  </label>
                  {stores.length === 0 ? (
                    <p className="border-[3px] border-black bg-cream p-3 text-[11px] font-bold text-black/70 shadow-neo-xs">
                      Add a restaurant first, then assign it here.
                    </p>
                  ) : (
                    <div className="max-h-52 space-y-2 overflow-y-auto border-[3px] border-black bg-cream p-2 shadow-neo-xs">
                      {stores.map((store) => {
                        const checked = form.storeIds.includes(store.id);
                        return (
                          <button
                            key={store.id}
                            type="button"
                            onClick={() => toggleStore(store.id)}
                            className={`flex w-full cursor-pointer items-center justify-between gap-3 border-[3px] border-black p-2.5 text-left transition-all duration-100 ease-linear shadow-neo-xs ${
                              checked ? "bg-neo-green" : "bg-white hover:bg-neo-yellow"
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-2.5">
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 border-black ${
                                  checked ? "bg-black" : "bg-white"
                                }`}
                              >
                                {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-black text-black">{store.name}</span>
                                <span className="block truncate font-mono text-[10px] font-bold text-black/60">
                                  /r/{store.slug}
                                </span>
                              </span>
                            </div>
                            <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-black/50">
                              {store.category}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <p className="mt-1.5 text-[11px] font-bold text-black/60">
                    Store admins can edit menus, dishes and sentence combinations for their locations
                    — and nothing else.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t-[3px] border-black pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="cursor-pointer border-2 border-transparent px-4 py-2.5 text-xs font-black uppercase tracking-widest text-black transition-all duration-100 ease-linear hover:border-black hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="cursor-pointer border-4 border-black bg-neo-red px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-neo-sm transition-all duration-100 ease-linear hover:bg-black hover:text-neo-yellow disabled:cursor-wait disabled:opacity-50 enabled:active:translate-x-1 enabled:active:translate-y-1 enabled:active:shadow-none"
                >
                  {isSaving ? "Saving..." : editingMemberId ? "Save access" : "Send invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
