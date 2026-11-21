"use client";

import React, { useContext, useEffect, useState } from "react";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarClock,
  Plus,
  Clock,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Layers,
} from "lucide-react";

interface ShiftTemplate {
  id: string;
  company_id: string;
  name: string;
  is_dual_shift: boolean;
  shift1_start: string;
  shift1_end: string;
  shift2_start: string | null;
  shift2_end: string | null;
  grace_minutes: number;
  weekly_grace_limit: number;
  created_at: string;
}

export default function ShiftTemplatesPage() {
  const { company } = useContext(CompanyDashboardContext);
  const { t } = useLanguage();
  const supabase = createClient();

  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftTemplate | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [isDualShift, setIsDualShift] = useState(false);
  const [shift1Start, setShift1Start] = useState("08:00");
  const [shift1End, setShift1End] = useState("16:00");
  const [shift2Start, setShift2Start] = useState("17:00");
  const [shift2End, setShift2End] = useState("22:00");
  const [graceMinutes, setGraceMinutes] = useState<number>(15);
  const [weeklyGraceLimit, setWeeklyGraceLimit] = useState<number>(2);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchShifts = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shift_templates")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setShifts(data || []);
    } catch (err: any) {
      console.error("Error fetching shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchShifts();
    }
  }, [company?.id]);

  const openAddModal = () => {
    setEditingShift(null);
    setName("");
    setIsDualShift(false);
    setShift1Start("08:00");
    setShift1End("16:00");
    setShift2Start("17:00");
    setShift2End("22:00");
    setGraceMinutes(15);
    setWeeklyGraceLimit(2);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (shift: ShiftTemplate) => {
    setEditingShift(shift);
    setName(shift.name);
    setIsDualShift(shift.is_dual_shift);
    setShift1Start(shift.shift1_start ? shift.shift1_start.slice(0, 5) : "08:00");
    setShift1End(shift.shift1_end ? shift.shift1_end.slice(0, 5) : "16:00");
    setShift2Start(shift.shift2_start ? shift.shift2_start.slice(0, 5) : "17:00");
    setShift2End(shift.shift2_end ? shift.shift2_end.slice(0, 5) : "22:00");
    setGraceMinutes(shift.grace_minutes || 15);
    setWeeklyGraceLimit(shift.weekly_grace_limit || 2);
    setErrorMsg(null);
    setModalOpen(true);
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
        is_dual_shift: isDualShift,
        shift1_start: shift1Start,
        shift1_end: shift1End,
        shift2_start: isDualShift ? shift2Start : null,
        shift2_end: isDualShift ? shift2End : null,
        grace_minutes: Number(graceMinutes) || 15,
        weekly_grace_limit: Number(weeklyGraceLimit) || 2,
      };

      if (editingShift) {
        const { error } = await supabase
          .from("shift_templates")
          .update(payload)
          .eq("id", editingShift.id)
          .eq("company_id", company.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("shift_templates").insert([payload]);
        if (error) throw error;
      }

      setModalOpen(false);
      await fetchShifts();
    } catch (err: any) {
      console.error("Save shift template error:", err);
      setErrorMsg(err.message || "Failed to save shift template.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    try {
      const { error } = await supabase
        .from("shift_templates")
        .delete()
        .eq("id", id)
        .eq("company_id", company!.id);

      if (error) throw error;
      await fetchShifts();
    } catch (err: any) {
      alert(err.message || "Failed to delete shift template");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-cairo">
            {t("shifts_title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("shifts_subtitle")}
          </p>
        </div>

        <div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_shift_btn")}</span>
          </button>
        </div>
      </div>

      {/* Shifts List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          <div className="h-44 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800" />
          <div className="h-44 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800" />
        </div>
      ) : shifts.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <CalendarClock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("no_shifts_yet")}
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("add_shift_btn")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shifts.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-800 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {s.name}
                      </h3>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        {s.is_dual_shift ? "شفت مزدوج (فترتين)" : "شفت فردي (فترة واحدة)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      title={t("edit")}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title={t("delete")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Shift Hours Grid */}
                <div className="space-y-2 py-2 border-y border-slate-100 dark:border-slate-700/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">الفترة الأولى:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {s.shift1_start?.slice(0, 5)} - {s.shift1_end?.slice(0, 5)}
                    </span>
                  </div>

                  {s.is_dual_shift && s.shift2_start && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">الفترة الثانية:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                        {s.shift2_start?.slice(0, 5)} - {s.shift2_end?.slice(0, 5)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Grace Policy Info */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>سماح التأخير: <strong className="text-slate-800 dark:text-slate-200">{s.grace_minutes} دقيقة</strong></span>
                  <span>الحد الأسبوعي: <strong className="text-slate-800 dark:text-slate-200">{s.weekly_grace_limit} مرات</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Shift Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingShift ? t("edit") : t("add_shift_btn")}
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
              {/* Shift Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("shift_name")} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("shift_name_placeholder")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Is Dual Shift Toggle */}
              <div className="pt-1">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block">
                        {t("is_dual_shift")}
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        تفعيل فترتين عمل منفصلتين خلال نفس اليوم
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDualShift}
                    onChange={(e) => setIsDualShift(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>

              {/* Shift 1 Start & End */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30 space-y-3">
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  الفترة الأولى (الأساسية)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {t("shift1_start")}
                    </label>
                    <input
                      type="time"
                      required
                      value={shift1Start}
                      onChange={(e) => setShift1Start(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {t("shift1_end")}
                    </label>
                    <input
                      type="time"
                      required
                      value={shift1End}
                      onChange={(e) => setShift1End(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Shift 2 Start & End (Conditional) */}
              {isDualShift && (
                <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/20 dark:bg-indigo-950/20 space-y-3 animate-fadeIn">
                  <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block">
                    الفترة الثانية (المسائية)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {t("shift2_start")}
                      </label>
                      <input
                        type="time"
                        required={isDualShift}
                        value={shift2Start}
                        onChange={(e) => setShift2Start(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                        {t("shift2_end")}
                      </label>
                      <input
                        type="time"
                        required={isDualShift}
                        value={shift2End}
                        onChange={(e) => setShift2End(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Grace Policies */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("grace_minutes")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("weekly_grace_limit")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="7"
                    required
                    value={weeklyGraceLimit}
                    onChange={(e) => setWeeklyGraceLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
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
