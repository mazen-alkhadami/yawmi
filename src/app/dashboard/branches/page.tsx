"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  MapPin,
  Plus,
  Crosshair,
  Camera,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
  Compass,
  QrCode,
  ExternalLink,
} from "lucide-react";

interface Branch {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  radius_meters: number;
  require_selfie: boolean;
  created_at: string;
}

export default function BranchesPage() {
  const { company, loading: compLoading } = useContext(CompanyDashboardContext);
  const { t } = useLanguage();
  const supabase = createClient();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [radiusMeters, setRadiusMeters] = useState<number>(100);
  const [requireSelfie, setRequireSelfie] = useState<boolean>(false);

  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const maxBranches = company?.max_branches || 1;
  const isLimitReached = !editingBranch && branches.length >= maxBranches;

  const fetchBranches = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("branches")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setBranches(data || []);
    } catch (err: any) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchBranches();
    }
  }, [company?.id]);

  const openAddModal = () => {
    setEditingBranch(null);
    setName("");
    setAddress("");
    setLat("");
    setLng("");
    setRadiusMeters(100);
    setRequireSelfie(false);
    setErrorMsg(null);
    setGpsStatus(null);
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setName(branch.name);
    setAddress(branch.address || "");
    setLat(branch.lat !== null ? String(branch.lat) : "");
    setLng(branch.lng !== null ? String(branch.lng) : "");
    setRadiusMeters(branch.radius_meters || 100);
    setRequireSelfie(branch.require_selfie || false);
    setErrorMsg(null);
    setGpsStatus(null);
    setModalOpen(true);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus(t("location_error"));
      return;
    }
    setGpsLoading(true);
    setGpsStatus(t("getting_location"));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setGpsLoading(false);
        setGpsStatus(t("location_success"));
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGpsLoading(false);
        setGpsStatus(t("location_error"));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        company_id: company.id,
        name: name.trim(),
        address: address.trim() || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        radius_meters: Number(radiusMeters) || 100,
        require_selfie: requireSelfie,
      };

      if (editingBranch) {
        // Update
        const { error } = await supabase
          .from("branches")
          .update(payload)
          .eq("id", editingBranch.id)
          .eq("company_id", company.id);

        if (error) throw error;
      } else {
        // Enforce max_branches limit
        if (branches.length >= maxBranches) {
          throw new Error(
            `${t("branch_limit_reached")} (${branches.length}/${maxBranches}). ${t("upgrade_prompt")}`
          );
        }

        // Insert
        const { error } = await supabase.from("branches").insert([payload]);
        if (error) throw error;
      }

      setModalOpen(false);
      await fetchBranches();
    } catch (err: any) {
      console.error("Save branch error:", err);
      setErrorMsg(err.message || "Failed to save branch.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    try {
      const { error } = await supabase
        .from("branches")
        .delete()
        .eq("id", id)
        .eq("company_id", company!.id);

      if (error) throw error;
      await fetchBranches();
    } catch (err: any) {
      alert(err.message || "Failed to delete branch");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-cairo">
            {t("branches_title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("branches_subtitle")}
          </p>
        </div>

        <div>
          <button
            onClick={openAddModal}
            disabled={isLimitReached}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_branch_btn")}</span>
            <span className="text-xs bg-indigo-800/80 px-2 py-0.5 rounded-lg ms-1">
              {branches.length} / {maxBranches}
            </span>
          </button>
        </div>
      </div>

      {/* Upgrade Notice Banner if Limit Reached */}
      {isLimitReached && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold">{t("branch_limit_reached")}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                باقتك الحالية ({company?.plan}) تسمح بـ {maxBranches} فرع فقط. {t("upgrade_prompt")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branches List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800" />
          <div className="h-40 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800" />
        </div>
      ) : branches.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <MapPin className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("no_branches_yet")}
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("add_branch_btn")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {branches.map((b) => (
            <div
              key={b.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {b.name}
                      </h3>
                      {b.address && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{b.address}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(b)}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title={t("edit")}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title={t("delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block">{t("branch_coords")}</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">
                      {b.lat && b.lng ? `${b.lat}, ${b.lng}` : "غير محدد"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t("branch_radius")}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {b.radius_meters} م
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                {b.require_selfie ? (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800">
                    <Camera className="w-3 h-3 text-indigo-500" />
                    <span>{t("require_selfie")}</span>
                  </div>
                ) : (
                  <span />
                )}

                <Link
                  href={`/dashboard/branches/${b.id}/kiosk`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs border border-indigo-200 dark:border-indigo-800/80 transition shadow-sm"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{t("kiosk_open_btn")}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Branch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingBranch ? t("edit") : t("add_branch_btn")}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Branch Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("branch_name")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: المقر الرئيسي - الرياض"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Branch Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("branch_address")}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: طريق الملك فهد، حي الصحافة"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* GPS Coordinates & Acquire Button */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("branch_coords")}
                  </label>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={gpsLoading}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {gpsLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Crosshair className="w-3.5 h-3.5" />
                    )}
                    <span>{t("get_current_location")}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(e.target.value)}
                      placeholder="Latitude (خط العرض)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(e.target.value)}
                      placeholder="Longitude (خط الطول)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      dir="ltr"
                    />
                  </div>
                </div>
                {gpsStatus && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">{gpsStatus}</p>
                )}
              </div>

              {/* Radius in Meters */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("branch_radius")}
                </label>
                <input
                  type="number"
                  min="20"
                  max="5000"
                  required
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-0.5">
                  المسافة المسموحة للموظف لتسجيل الحضور من مركز الفرع (افتراضي 100 متر).
                </p>
              </div>

              {/* Require Selfie Toggle */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Camera className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {t("require_selfie")}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        {t("require_selfie_desc")}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={requireSelfie}
                    onChange={(e) => setRequireSelfie(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t("save")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
