"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { CompanyDashboardContext } from "./layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/instantCache";
import { logAuditAction } from "@/lib/auditLog";
import {
  MapPin,
  Users,
  CreditCard,
  KeyRound,
  Copy,
  Check,
  Plus,
  ArrowRight,
  ArrowLeft,
  CalendarClock,
  Sparkles,
  Megaphone,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";

interface AnnouncementRecord {
  id: string;
  company_id: string;
  branch_id?: string | null;
  sender_name?: string | null;
  sender_role?: string | null;
  title: string;
  body: string;
  priority: "normal" | "urgent";
  created_at: string;
}

export default function DashboardOverviewPage() {
  const { company, profile, loading: contextLoading } = useContext(CompanyDashboardContext);
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  const [branchesCount, setBranchesCount] = useState<number>(0);
  const [employeesCount, setEmployeesCount] = useState<number>(0);
  const [shiftsCount, setShiftsCount] = useState<number>(0);
  const [branchesList, setBranchesList] = useState<Array<{ id: string; name: string }>>([]);
  const [copied, setCopied] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  // Company Announcements State
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annPriority, setAnnPriority] = useState<"normal" | "urgent">("normal");
  const [annBranchId, setAnnBranchId] = useState<string>("");
  const [publishingAnn, setPublishingAnn] = useState(false);
  const [deletingAnnId, setDeletingAnnId] = useState<string | null>(null);
  const [annFeedback, setAnnFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    async function loadStats() {
      if (!company?.id) return;
      const cacheKey = `dashboard_overview_${company.id}`;
      const cached = getCachedData<{
        branchesCount: number;
        employeesCount: number;
        shiftsCount: number;
        branchesList?: Array<{ id: string; name: string }>;
        announcements?: AnnouncementRecord[];
      }>(cacheKey);
      if (cached) {
        setBranchesCount(cached.branchesCount);
        setEmployeesCount(cached.employeesCount);
        setShiftsCount(cached.shiftsCount);
        if (cached.branchesList) setBranchesList(cached.branchesList);
        if (cached.announcements) setAnnouncements(cached.announcements);
        setStatsLoading(false);
      }

      try {
        // Run count, branches list & announcements queries in parallel for instant load
        const [bRes, eRes, sRes, annRes] = await Promise.all([
          supabase
            .from("branches")
            .select("id, name", { count: "exact" })
            .eq("company_id", company.id)
            .order("name", { ascending: true }),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("shift_templates")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("announcements")
            .select("*")
            .eq("company_id", company.id)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        const nextBranchesList = (bRes.data as Array<{ id: string; name: string }>) || [];
        const nextBranches = bRes.count || nextBranchesList.length || 0;
        const nextEmployees = Math.max(0, (eRes.count || 1) - 1);
        const nextShifts = sRes.count || 0;
        const nextAnnouncements = (annRes.data as AnnouncementRecord[]) || [];

        setBranchesList(nextBranchesList);
        setBranchesCount(nextBranches);
        setEmployeesCount(nextEmployees);
        setShiftsCount(nextShifts);
        setAnnouncements(nextAnnouncements);
        setCachedData(cacheKey, {
          branchesCount: nextBranches,
          employeesCount: nextEmployees,
          shiftsCount: nextShifts,
          branchesList: nextBranchesList,
          announcements: nextAnnouncements,
        });
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    }

    if (company?.id) {
      loadStats();
    }
  }, [company?.id]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id || !annTitle.trim() || !annBody.trim()) return;
    setPublishingAnn(true);
    setAnnFeedback(null);

    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert([
          {
            company_id: company.id,
            branch_id: annBranchId || null,
            sender_name: profile?.full_name || (language === "ar" ? "مدير الشركة" : "Company Admin"),
            sender_role: "company_admin",
            title: annTitle.trim(),
            body: annBody.trim(),
            priority: annPriority,
            created_by: profile?.id || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      await logAuditAction({
        companyId: company.id,
        actorId: profile?.id,
        actorName: profile?.full_name,
        actorRole: profile?.role || "company_manager",
        actionType: "announcement_sent",
        targetSummary: annTitle.trim(),
        metadata: { branch_id: annBranchId || null, priority: annPriority },
      });

      const updated = [data as AnnouncementRecord, ...announcements];
      setAnnouncements(updated);
      setCachedData(`dashboard_overview_${company.id}`, {
        branchesCount,
        employeesCount,
        shiftsCount,
        branchesList,
        announcements: updated,
      });
      setAnnTitle("");
      setAnnBody("");
      setAnnPriority("normal");
      setAnnBranchId("");
      setAnnFeedback({
        type: "success",
        text: annBranchId
          ? language === "ar"
            ? "تم نشر التعميم للفرع المحدد بنجاح!"
            : "Announcement published to selected branch!"
          : language === "ar"
          ? "تم نشر التعميم لجميع الفروع بنجاح!"
          : "Announcement published to all branches!",
      });
    } catch (err: any) {
      setAnnFeedback({
        type: "error",
        text: err.message || (language === "ar" ? "فشل نشر التعميم." : "Failed to publish announcement."),
      });
    } finally {
      setPublishingAnn(false);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    if (!company?.id) return;
    setDeletingAnnId(annId);
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", annId)
        .eq("company_id", company.id);

      if (error) throw error;

      const updated = announcements.filter((a) => a.id !== annId);
      setAnnouncements(updated);
      setCachedData(`dashboard_overview_${company.id}`, {
        branchesCount,
        employeesCount,
        shiftsCount,
        announcements: updated,
      });
    } catch (err: any) {
      setAnnFeedback({
        type: "error",
        text: err.message || (language === "ar" ? "فشل حذف التعميم." : "Failed to delete announcement."),
      });
    } finally {
      setDeletingAnnId(null);
    }
  };

  const handleCopyInviteCode = () => {
    if (!company?.invite_code) return;
    navigator.clipboard.writeText(company.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlanBadge = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "pro":
        return t("plan_pro");
      case "business":
        return t("plan_business");
      default:
        return t("plan_starter");
    }
  };

  if (contextLoading || statsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/15 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{t("quick_tips_title")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-cairo">
            مرحباً، {profile?.full_name || "المدير المسؤول"} 👋
          </h1>
          <p className="text-sm text-indigo-100 max-w-xl mt-1.5 leading-relaxed">
            {t("quick_tips_desc")}
          </p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div id="tour-admin-overview" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total Branches */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("stat_total_branches")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {branchesCount}
              <span className="text-sm font-semibold text-slate-400 ms-1">
                / {company?.max_branches || 1}
              </span>
            </span>
            <Link
              href="/dashboard/branches"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>{t("nav_branches")}</span>
              <ArrowIcon className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Stat 2: Total Employees */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("stat_total_employees")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {employeesCount}
              <span className="text-sm font-semibold text-slate-400 ms-1">
                / {company?.max_employees || 5}
              </span>
            </span>
            <span className="text-xs text-slate-400">
              {company?.max_employees ? `${company.max_employees - employeesCount} متاح` : ""}
            </span>
          </div>
        </div>

        {/* Stat 3: Current Plan */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("stat_current_plan")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {getPlanBadge(company?.plan)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800">
              {t("active")}
            </span>
          </div>
        </div>

        {/* Stat 4: Company Invite Code with 1-click Copy */}
        <div className="p-5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
              {t("stat_invite_code")}
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-2xl font-black tracking-widest text-indigo-700 dark:text-indigo-200">
              {company?.invite_code || "------"}
            </span>
            <button
              onClick={handleCopyInviteCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 shadow-sm hover:bg-indigo-50 dark:hover:bg-slate-700 transition"
              title={t("copy_code")}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-checkin" />
                  <span>{t("copied")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{t("copy_code")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Setup Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Branches Quick Card */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("nav_branches")}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              حدد مواقع فروع الشركة ومحيط القبول الجغرافي وخيارات التحقق بصورة السيلفي.
            </p>
          </div>
          <Link
            href="/dashboard/branches"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_branch_btn")}</span>
          </Link>
        </div>

        {/* Shifts Quick Card */}
        <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarClock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t("nav_shifts")}
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              أنشئ قوالب أوقات العمل المعتمدة، سواء كانت دوام فردي أو شفتين يومياً مع دقائق السماح.
            </p>
          </div>
          <Link
            href="/dashboard/shifts"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{t("add_shift_btn")}</span>
          </Link>
        </div>
      </div>

      {/* Company Announcements Management Panel */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "تعميمات وإعلانات الشركة" : "Company Announcements"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {language === "ar"
                  ? "انشر تنبيهات وتعميمات فورية تظهر مباشرة في تطبيق جميع الموظفين."
                  : "Publish instant broadcasts directly to all employees in their mobile app."}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 self-start sm:self-center">
            {announcements.length} {language === "ar" ? "تعميم" : "total"}
          </span>
        </div>

        {annFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold border ${
              annFeedback.type === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
            }`}
          >
            {annFeedback.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Announcement Form */}
          <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "ar" ? "عنوان التعميم *" : "Announcement Title *"}
              </label>
              <input
                type="text"
                required
                value={annTitle}
                onChange={(e) => setAnnTitle(e.target.value)}
                placeholder={language === "ar" ? "مثال: تعديل أوقات الدوام في رمضان" : "e.g., Holiday Schedule Notice"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "ar" ? "الجمهور المستهدف (الفرع)" : "Target Audience (Branch)"}
              </label>
              <select
                value={annBranchId}
                onChange={(e) => setAnnBranchId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">
                  {language === "ar" ? "جميع الفروع (تعميم عام للشركة)" : "All Branches (Company-Wide)"}
                </option>
                {branchesList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === "ar" ? "نص التعميم *" : "Message Body *"}
              </label>
              <textarea
                rows={3}
                required
                value={annBody}
                onChange={(e) => setAnnBody(e.target.value)}
                placeholder={language === "ar" ? "اكتب تفاصيل التعميم للموظفين..." : "Write the announcement details..."}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600 dark:text-slate-400">
                  {language === "ar" ? "الأهمية:" : "Priority:"}
                </span>
                <button
                  type="button"
                  onClick={() => setAnnPriority("normal")}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                    annPriority === "normal"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {language === "ar" ? "عادي" : "Normal"}
                </button>
                <button
                  type="button"
                  onClick={() => setAnnPriority("urgent")}
                  className={`px-3 py-1.5 rounded-xl font-bold border transition ${
                    annPriority === "urgent"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {language === "ar" ? "عاجل" : "Urgent"}
                </button>
              </div>

              <button
                type="submit"
                disabled={publishingAnn}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition disabled:opacity-60"
              >
                {publishingAnn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{language === "ar" ? "نشر التعميم" : "Publish"}</span>
              </button>
            </div>
          </form>

          {/* Published Announcements List */}
          <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
            {announcements.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                {language === "ar" ? "لم يتم نشر أي تعميمات بعد." : "No announcements published yet."}
              </div>
            ) : (
              announcements.map((ann) => {
                const targetBranchName = ann.branch_id
                  ? branchesList.find((b) => b.id === ann.branch_id)?.name || (language === "ar" ? "فرع محدد" : "Specific Branch")
                  : language === "ar"
                  ? "جميع الفروع"
                  : "All Branches";
                const senderRoleLabel =
                  ann.sender_role === "supervisor"
                    ? language === "ar"
                      ? "مشرف الفرع"
                      : "Branch Supervisor"
                    : language === "ar"
                    ? "مدير الشركة"
                    : "Company Admin";

                return (
                <div
                  key={ann.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                    ann.priority === "urgent"
                      ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                      : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                        {ann.title}
                      </span>
                      {ann.priority === "urgent" && (
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                          {language === "ar" ? "عاجل" : "Urgent"}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {targetBranchName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {ann.body}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
                      {ann.sender_name && (
                        <span className="font-semibold text-slate-500 dark:text-slate-400">
                          {language === "ar" ? "المرسل:" : "From:"} {ann.sender_name} • {senderRoleLabel}
                        </span>
                      )}
                      <span>•</span>
                      <span className="font-mono">
                        {new Date(ann.created_at).toLocaleDateString("ar-SA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAnnouncement(ann.id)}
                    disabled={deletingAnnId === ann.id}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                    title={language === "ar" ? "حذف التعميم" : "Delete"}
                  >
                    {deletingAnnId === ann.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
