"use client";

import React, { useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CompanyDashboardContext } from "../../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  ArrowRight,
  ArrowLeft,
  Building2,
  CalendarClock,
  Clock,
  Briefcase,
  Phone,
  CreditCard,
  Globe,
  Award,
  ArrowLeftRight,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Loader2,
  Plus,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";

interface EmployeeProfile {
  id: string;
  company_id: string;
  role: string;
  full_name: string;
  phone: string | null;
  national_id: string | null;
  nationality: string | null;
  job_title: string | null;
  branch_id: string | null;
  shift_template_id: string | null;
  status: string;
  device_id: string | null;
  created_at: string;
  branch?: {
    id: string;
    name: string;
  };
  shift_template?: {
    id: string;
    name: string;
  };
}

interface CareerHistoryItem {
  id: string;
  company_id: string;
  employee_id: string;
  event_type: "promotion" | "transfer";
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  note: string | null;
  created_at: string;
  changer?: {
    id: string;
    full_name: string;
  };
}

interface AttendanceSummary {
  totalPresent: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  gracePeriodsUsed: number;
}

export default function EmployeeHRPage() {
  const params = useParams();
  const employeeId = params?.id as string;
  const router = useRouter();
  const { t, dir } = useLanguage();
  const supabase = createClient();
  const { company, profile: managerProfile } = useContext(CompanyDashboardContext);

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [historyItems, setHistoryItems] = useState<CareerHistoryItem[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    totalPresent: 0,
    totalLateMinutes: 0,
    totalOvertimeMinutes: 0,
    gracePeriodsUsed: 0,
  });

  // Company branches for transfer
  const [branches, setBranches] = useState<any[]>([]);

  // Modals
  const [promotionModalOpen, setPromotionModalOpen] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState("");
  const [promotionNote, setPromotionNote] = useState("");
  const [promotionLoading, setPromotionLoading] = useState(false);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [targetBranchId, setTargetBranchId] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);

  useEffect(() => {
    if (employeeId) {
      loadEmployeeHRData();
    }
  }, [employeeId]);

  const loadEmployeeHRData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Employee Profile
      const { data: empData, error: empErr } = await supabase
        .from("profiles")
        .select("*, branch:branch_id(id, name), shift_template:shift_template_id(id, name)")
        .eq("id", employeeId)
        .maybeSingle();

      if (empErr || !empData) {
        console.error("Employee not found:", empErr);
        setEmployee(null);
        return;
      }

      setEmployee(empData as any);
      setNewJobTitle(empData.job_title || "");

      // 2. Fetch Branches for transfer dropdown
      if (empData.company_id) {
        const { data: branchesData } = await supabase
          .from("branches")
          .select("id, name")
          .eq("company_id", empData.company_id)
          .eq("is_active", true)
          .order("name", { ascending: true });
        setBranches(branchesData || []);
        if (branchesData && branchesData.length > 0) {
          const otherBranch = branchesData.find((b) => b.id !== empData.branch_id);
          setTargetBranchId(otherBranch ? otherBranch.id : branchesData[0].id);
        }
      }

      // 3. Fetch Attendance Stats
      const { data: attData } = await supabase
        .from("attendance_logs")
        .select("id, late_minutes, overtime_minutes, grace_period_applied")
        .eq("employee_id", employeeId);

      if (attData) {
        const totalLate = attData.reduce((acc, log) => acc + (log.late_minutes || 0), 0);
        const totalOvertime = attData.reduce((acc, log) => acc + (log.overtime_minutes || 0), 0);
        const totalGrace = attData.filter((log) => log.grace_period_applied).length;
        setSummary({
          totalPresent: attData.length,
          totalLateMinutes: totalLate,
          totalOvertimeMinutes: totalOvertime,
          gracePeriodsUsed: totalGrace,
        });
      }

      // 4. Fetch Career History
      const { data: historyData } = await supabase
        .from("employee_history")
        .select("*, changer:changed_by(id, full_name)")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });

      setHistoryItems((historyData as any) || []);
    } catch (err) {
      console.error("Error loading employee HR file:", err);
    } finally {
      setLoading(false);
    }
  };

  // Record Promotion Action
  const handleRecordPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !newJobTitle.trim()) return;
    setPromotionLoading(true);

    try {
      const oldTitle = employee.job_title || "بدون مسمى";
      const newTitle = newJobTitle.trim();

      // 1. Update job title in profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ job_title: newTitle })
        .eq("id", employee.id);

      if (profileErr) throw profileErr;

      // 2. Insert record into employee_history
      const { error: histErr } = await supabase.from("employee_history").insert({
        company_id: employee.company_id,
        employee_id: employee.id,
        event_type: "promotion",
        old_value: oldTitle,
        new_value: newTitle,
        changed_by: managerProfile?.id || null,
        note: promotionNote.trim() || null,
      });

      if (histErr) throw histErr;

      setPromotionModalOpen(false);
      setPromotionNote("");
      loadEmployeeHRData();
    } catch (err: any) {
      alert("Error recording promotion: " + (err.message || err));
    } finally {
      setPromotionLoading(false);
    }
  };

  // Transfer Branch Action
  const handleTransferBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !targetBranchId) return;
    setTransferLoading(true);

    try {
      const oldBranchName = employee.branch?.name || "بدون فرع";
      const targetBranch = branches.find((b) => b.id === targetBranchId);
      const newBranchName = targetBranch ? targetBranch.name : targetBranchId;

      // 1. Update branch_id in profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .update({ branch_id: targetBranchId })
        .eq("id", employee.id);

      if (profileErr) throw profileErr;

      // 2. Insert record into employee_history
      const { error: histErr } = await supabase.from("employee_history").insert({
        company_id: employee.company_id,
        employee_id: employee.id,
        event_type: "transfer",
        old_value: oldBranchName,
        new_value: newBranchName,
        changed_by: managerProfile?.id || null,
        note: transferNote.trim() || null,
      });

      if (histErr) throw histErr;

      setTransferModalOpen(false);
      setTransferNote("");
      loadEmployeeHRData();
    } catch (err: any) {
      alert("Error transferring branch: " + (err.message || err));
    } finally {
      setTransferLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
        <p className="text-sm font-cairo">{t("loading")}</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold mb-2">الموظف غير موجود</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          تعذر العثور على ملف تعريف الموظف المطلوب أو تم حذفه.
        </p>
        <Link
          href="/dashboard/employees"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white"
        >
          {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>العودة لسجل الموظفين</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-cairo">
      {/* Top Header & Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/employees"
            className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition text-slate-600 dark:text-slate-300"
            title="رجوع"
          >
            {dir === "rtl" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{employee.full_name}</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  employee.status === "active"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                    : employee.status === "pending"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                    : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                }`}
              >
                {employee.status === "active"
                  ? t("active")
                  : employee.status === "pending"
                  ? t("pending")
                  : t("suspended")}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {employee.role === "branch_supervisor" ? "مشرف فرع" : "موظف"}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t("hr_file_title")} • تاريخ الانضمام: {new Date(employee.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPromotionModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
          >
            <Award className="w-4 h-4" />
            <span>{t("record_promotion_btn")}</span>
          </button>
          <button
            onClick={() => setTransferModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition shadow-sm"
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>{t("transfer_branch_btn")}</span>
          </button>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block">المسمى الوظيفي</span>
            <span className="text-xs font-bold truncate block">{employee.job_title || "--"}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block">فرع العمل</span>
            <span className="text-xs font-bold truncate block">{employee.branch?.name || "--"}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block">شفت الدوام</span>
            <span className="text-xs font-bold truncate block">
              {employee.shift_template?.name || "--"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 block">الهوية / الإقامة</span>
            <span className="text-xs font-mono font-bold truncate block">
              {employee.national_id || "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Additional Info Cards: Contact & Attendance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact & Meta */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700">
            البيانات الشخصية والاتصال
          </h2>
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                رقم الجوال:
              </span>
              <span className="font-mono font-bold">{employee.phone || "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                الجنسية:
              </span>
              <span className="font-bold">{employee.nationality || "--"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">حالة ربط الهاتف:</span>
              <span className="font-bold">
                {employee.device_id ? (
                  <span className="text-emerald-600">مرتبط بالجهاز</span>
                ) : (
                  <span className="text-amber-500">غير مقترن (جاهز للربط)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
          <h2 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span>{t("attendance_stats_summary")}</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">{t("total_present_days")}</span>
              <span className="text-xl font-bold font-mono text-emerald-600">
                {summary.totalPresent}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">{t("total_late_minutes")}</span>
              <span className="text-xl font-bold font-mono text-amber-600">
                {summary.totalLateMinutes} <span className="text-xs">د</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">{t("total_overtime_minutes")}</span>
              <span className="text-xl font-bold font-mono text-indigo-600">
                {summary.totalOvertimeMinutes} <span className="text-xs">د</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">فترات السماح المستعملة</span>
              <span className="text-xl font-bold font-mono text-purple-600">
                {summary.gracePeriodsUsed}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Career History & Timeline */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <span>{t("career_history_title")}</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {historyItems.length} حدث مسجل
          </span>
        </div>

        {historyItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <Briefcase className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">لا توجد حركات ترقية أو تنقلات وظيفية مسجلة لهذا الموظف حتى الآن.</p>
          </div>
        ) : (
          <div className="relative border-r-2 border-indigo-200 dark:border-indigo-900 mr-3 pr-5 space-y-6">
            {historyItems.map((item) => (
              <div key={item.id} className="relative">
                {/* Timeline Pin */}
                <div className="absolute -right-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 bg-indigo-600" />

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        item.event_type === "promotion"
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      }`}
                    >
                      {item.event_type === "promotion" ? (
                        <Award className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {item.event_type === "promotion" ? t("event_promotion") : t("event_transfer")}
                      </span>
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-slate-400">{t("old_value")}:</span>
                    <span className="line-through text-slate-500">{item.old_value || "--"}</span>
                    <span>←</span>
                    <span className="text-slate-400">{t("new_value")}:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {item.new_value || "--"}
                    </span>
                  </div>

                  {item.note && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700">
                      <strong>ملاحظة:</strong> {item.note}
                    </p>
                  )}

                  {item.changer && (
                    <div className="text-[10px] text-slate-400">
                      تم بواسطة: {item.changer.full_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal 1: Record Promotion */}
      {promotionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>{t("record_promotion_btn")}</span>
              </h3>
              <button
                onClick={() => setPromotionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordPromotion} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  المسمى الوظيفي الحالي
                </label>
                <input
                  type="text"
                  disabled
                  value={employee.job_title || "بدون مسمى"}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المسمى الوظيفي الجديد (الترقية) *
                </label>
                <input
                  type="text"
                  required
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  placeholder="مثال: مدير عمليات ميداني"
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مبرر الترقية / ملاحظة
                </label>
                <textarea
                  rows={3}
                  value={promotionNote}
                  onChange={(e) => setPromotionNote(e.target.value)}
                  placeholder="مثال: تميز في الأداء التشغيلي وتقييم الربع السنوي الممتاز..."
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={promotionLoading}
                  className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {promotionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ الترقية</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromotionModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Transfer Branch */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-indigo-600" />
                <span>{t("transfer_branch_btn")}</span>
              </h3>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransferBranch} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  الفرع الحالي
                </label>
                <input
                  type="text"
                  disabled
                  value={employee.branch?.name || "بدون فرع"}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفرع الجديد المنقول إليه *
                </label>
                <select
                  required
                  value={targetBranchId}
                  onChange={(e) => setTargetBranchId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.id === employee.branch_id}>
                      {b.name} {b.id === employee.branch_id ? "(الفرع الحالي)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب النقل / ملاحظة
                </label>
                <textarea
                  rows={3}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="مثال: حاجة العمل في فرع العليا لتغطية الشفت الصباحي..."
                  className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 py-2 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {transferLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>تأكيد النقل</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
