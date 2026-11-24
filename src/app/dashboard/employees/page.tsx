"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Smartphone,
  RotateCcw,
  Edit2,
  Building2,
  CalendarClock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  UserCheck,
  UserX,
  X,
  Plus,
  FileText,
  CheckSquare,
  Square,
  KeyRound,
} from "lucide-react";

interface EmployeeProfile {
  id: string;
  email?: string | null;
  full_name: string;
  national_id: string | null;
  nationality: string | null;
  job_title: string | null;
  phone: string | null;
  role: "employee" | "branch_supervisor";
  status: "active" | "pending" | "suspended";
  branch_id: string | null;
  shift_template_id: string | null;
  device_id: string | null;
  supervisor_permissions?: {
    can_approve_employees?: boolean;
    can_exceed_edit_limit?: boolean;
    can_close_month?: boolean;
  };
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
}

interface ShiftTemplate {
  id: string;
  name: string;
}

export default function EmployeesManagementPage() {
  const { company } = useContext(CompanyDashboardContext);
  const { t, language } = useLanguage();
  const supabase = createClient();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "active" | "pending" | "suspended">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit / Assignment Modal
  const [editingEmp, setEditingEmp] = useState<EmployeeProfile | null>(null);
  const [editBranchId, setEditBranchId] = useState<string>("");
  const [editShiftId, setEditShiftId] = useState<string>("");
  const [editRole, setEditRole] = useState<"employee" | "branch_supervisor">("employee");
  const [editJobTitle, setEditJobTitle] = useState<string>("");

  // Supervisor Permissions & Assigned Branches State
  const [supervisorBranches, setSupervisorBranches] = useState<string[]>([]);
  const [canApproveEmployees, setCanApproveEmployees] = useState(false);
  const [canExceedEditLimit, setCanExceedEditLimit] = useState(false);
  const [canCloseMonth, setCanCloseMonth] = useState(false);

  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Action status message
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const maxEmployees = company?.max_employees || 5;
  const currentCount = employees.filter((e) => e.status !== "suspended").length;
  const isLimitReached = currentCount >= maxEmployees;

  const fetchData = async () => {
    if (!company?.id) return;
    try {
      setLoading(true);

      // 1. Fetch employees
      const { data: empData, error: empErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("company_id", company.id)
        .in("role", ["employee", "branch_supervisor"])
        .order("created_at", { ascending: false });

      if (empErr) throw empErr;
      setEmployees((empData as any) || []);

      // 2. Fetch branches
      const { data: branchData } = await supabase
        .from("branches")
        .select("id, name")
        .eq("company_id", company.id);
      setBranches(branchData || []);

      // 3. Fetch shifts
      const { data: shiftData } = await supabase
        .from("shift_templates")
        .select("id, name")
        .eq("company_id", company.id);
      setShifts(shiftData || []);
    } catch (err: any) {
      console.error("Error loading employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchData();
    }
  }, [company?.id]);

  const handleApprove = async (emp: EmployeeProfile) => {
    if (isLimitReached) {
      setActionMsg({
        type: "error",
        text: `${t("employee_limit_reached")} (${currentCount}/${maxEmployees}). ${t("upgrade_prompt")}`,
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", emp.id)
        .eq("company_id", company!.id);

      if (error) throw error;
      setActionMsg({
        type: "success",
        text: "تم اعتماد الموظف بنجاح! تم فتح نافذة التعيين لتحديد الفرع والشفت والدور له مباشرة.",
      });
      await fetchData();
      // Auto-open assignment modal immediately!
      openEditModal({ ...emp, status: "active" });
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to approve employee." });
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", id)
        .eq("company_id", company!.id);

      if (error) throw error;
      setActionMsg({ type: "success", text: "تم رفض وحذف طلب الموظف." });
      await fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to reject employee." });
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "suspended" ? "active" : "suspended";
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", id)
        .eq("company_id", company!.id);

      if (error) throw error;
      setActionMsg({
        type: "success",
        text: newStatus === "active" ? "تم تنشيط الحساب بنجاح." : "تم تعليق الحساب.",
      });
      await fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update status." });
    }
  };

  const handleResetDevice = async (id: string) => {
    if (!confirm(t("reset_device_confirm"))) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ device_id: null })
        .eq("id", id)
        .eq("company_id", company!.id);

      if (error) throw error;
      setActionMsg({ type: "success", text: "تم فك ربط الجهاز بنجاح. يمكن للموظف الآن التسجيل من أي جهاز جديد." });
      await fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to reset device binding." });
    }
  };

  const handleSendPasswordReset = async (empEmail?: string | null) => {
    if (!empEmail) {
      setActionMsg({
        type: "error",
        text: language === "ar" ? "لا يوجد بريد إلكتروني مسجل لهذا الموظف." : "No email registered for this employee.",
      });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(empEmail, {
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
      });
      if (error) throw error;
      setActionMsg({
        type: "success",
        text: language === "ar"
          ? `تم إرسال رابط استعادة كلمة المرور بنجاح إلى (${empEmail})!`
          : `Password reset link sent successfully to (${empEmail})!`,
      });
    } catch (err: any) {
      setActionMsg({
        type: "error",
        text: err?.message || (language === "ar" ? "فشل إرسال رابط استعادة كلمة المرور." : "Failed to send reset link."),
      });
    }
  };

  const openEditModal = async (emp: EmployeeProfile) => {
    setEditingEmp(emp);
    setEditBranchId(emp.branch_id || "");
    setEditShiftId(emp.shift_template_id || "");
    setEditRole(emp.role);
    setEditJobTitle(emp.job_title || "");

    const perms = emp.supervisor_permissions || {};
    setCanApproveEmployees(!!perms.can_approve_employees);
    setCanExceedEditLimit(!!perms.can_exceed_edit_limit);
    setCanCloseMonth(!!perms.can_close_month);

    // Fetch supervisor's assigned branches
    try {
      const { data: supBrs } = await supabase
        .from("branch_supervisors")
        .select("branch_id")
        .eq("supervisor_id", emp.id);
      setSupervisorBranches((supBrs || []).map((b) => b.branch_id));
    } catch {
      setSupervisorBranches([]);
    }

    setSubmittingEdit(false);
  };

  const toggleSupervisorBranch = (branchId: string) => {
    if (supervisorBranches.includes(branchId)) {
      setSupervisorBranches(supervisorBranches.filter((id) => id !== branchId));
    } else {
      setSupervisorBranches([...supervisorBranches, branchId]);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !company?.id) return;
    setSubmittingEdit(true);

    try {
      const supervisorPermissions =
        editRole === "branch_supervisor"
          ? {
              can_approve_employees: canApproveEmployees,
              can_exceed_edit_limit: canExceedEditLimit,
              can_close_month: canCloseMonth,
            }
          : editingEmp.supervisor_permissions || {};

      // 1. Update profiles table
      const { error: profErr } = await supabase
        .from("profiles")
        .update({
          branch_id: editBranchId || null,
          shift_template_id: editShiftId || null,
          role: editRole,
          job_title: editJobTitle.trim() || null,
          supervisor_permissions: supervisorPermissions,
        })
        .eq("id", editingEmp.id)
        .eq("company_id", company.id);

      if (profErr) throw profErr;

      // 2. If branch_supervisor, synchronize public.branch_supervisors
      if (editRole === "branch_supervisor") {
        // Delete previous associations
        await supabase
          .from("branch_supervisors")
          .delete()
          .eq("supervisor_id", editingEmp.id);

        // Insert new selected branches
        if (supervisorBranches.length > 0) {
          const rowsToInsert = supervisorBranches.map((bId) => ({
            branch_id: bId,
            supervisor_id: editingEmp.id,
          }));
          const { error: brSupErr } = await supabase
            .from("branch_supervisors")
            .insert(rowsToInsert);
          if (brSupErr) console.warn("Supervisor branches update notice:", brSupErr);
        }
      }

      setEditingEmp(null);
      setActionMsg({ type: "success", text: "تم حفظ التعديلات وتعيين الصلاحيات والفروع بنجاح." });
      await fetchData();
    } catch (err: any) {
      setActionMsg({ type: "error", text: err.message || "Failed to update employee details." });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const matchesTab = activeTab === "all" || emp.status === activeTab;
    const matchesSearch =
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone?.includes(searchQuery) ||
      emp.national_id?.includes(searchQuery);
    return matchesTab && matchesSearch;
  });

  const pendingCount = employees.filter((e) => e.status === "pending").length;

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("employees_title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("employees_subtitle")}
          </p>
        </div>

        {/* Quota Counter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm">
            {t("stat_total_employees")}: <strong className="text-indigo-600 dark:text-indigo-400">{currentCount}</strong> / {maxEmployees}
          </span>
        </div>
      </div>

      {/* Limit Notice if Reached */}
      {isLimitReached && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div>
            <p className="font-bold">{t("employee_limit_reached")}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              باقتك الحالية ({company?.plan}) تدعم حتى {maxEmployees} موظفاً. {t("upgrade_prompt")}
            </p>
          </div>
        </div>
      )}

      {/* Action Notification */}
      {actionMsg && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between ${
            actionMsg.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-800 dark:text-red-200"
          }`}
        >
          <span>{actionMsg.text}</span>
          <button onClick={() => setActionMsg(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 w-fit">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t("tab_all")} ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab("active")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "active"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t("tab_active")} ({employees.filter((e) => e.status === "active").length})
          </button>
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "pending"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <span>{t("tab_pending")}</span>
            {pendingCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("suspended")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "suspended"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t("tab_suspended")} ({employees.filter((e) => e.status === "suspended").length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف أو الهوية..."
            className="w-full px-3 py-2 ps-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute start-3 top-2.5" />
        </div>
      </div>

      {/* Employees Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("no_employees_found")}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
          <table className="w-full text-xs text-start">
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="py-3 px-4 text-start">{t("emp_name")}</th>
                <th className="py-3 px-4 text-start">{t("emp_branch")}</th>
                <th className="py-3 px-4 text-start">{t("emp_shift")}</th>
                <th className="py-3 px-4 text-start">{t("emp_role")}</th>
                <th className="py-3 px-4 text-start">{t("emp_device")}</th>
                <th className="py-3 px-4 text-start">{t("emp_status")}</th>
                <th className="py-3 px-4 text-end">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredEmployees.map((emp) => {
                const branchName = branches.find((b) => b.id === emp.branch_id)?.name || t("unassigned");
                const shiftName = shifts.find((s) => s.id === emp.shift_template_id)?.name || t("unassigned");

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    {/* Name & Contact */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-200 dark:border-indigo-800">
                          {emp.full_name?.charAt(0) || "U"}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block text-sm">
                            {emp.full_name}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {emp.job_title || "موظف"} &bull; {emp.phone || "بدون هاتف"}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                            {emp.email || "—"}
                          </span>
                          {emp.national_id && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              هوية: {emp.national_id}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{branchName}</span>
                      </div>
                    </td>

                    {/* Shift */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-500" />
                        <span>{shiftName}</span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                          emp.role === "branch_supervisor"
                            ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <ShieldCheck className="w-3 h-3" />
                        <span>{emp.role === "branch_supervisor" ? t("role_supervisor") : t("role_employee")}</span>
                      </span>
                    </td>

                    {/* Device Binding */}
                    <td className="py-3 px-4">
                      {emp.device_id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                            <Smartphone className="w-3 h-3 text-emerald-600" />
                            <span>{t("device_bound")}</span>
                          </span>
                          <button
                            onClick={() => handleResetDevice(emp.id)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                            title={t("reset_device")}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{t("device_unbound")}</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {emp.status === "active" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                          {t("active")}
                        </span>
                      )}
                      {emp.status === "pending" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                          {t("pending")}
                        </span>
                      )}
                      {emp.status === "suspended" && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
                          {t("suspended")}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-end">
                      <div className="inline-flex items-center gap-1.5">
                        {/* View HR File Link */}
                        <Link
                          href={`/dashboard/employees/${emp.id}`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                          title={t("view_hr_file")}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </Link>

                        {emp.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleApprove(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition"
                              title={t("approve_employee")}
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>{t("approve_employee")}</span>
                            </button>
                            <button
                              onClick={() => handleReject(emp.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                              title={t("reject_employee")}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditModal(emp)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                              title={t("edit_employee")}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(emp.id, emp.status)}
                              className={`p-1.5 rounded-lg transition ${
                                emp.status === "suspended"
                                  ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                  : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                              }`}
                              title={emp.status === "suspended" ? t("activate_employee") : t("suspend_employee")}
                            >
                              {emp.status === "suspended" ? (
                                <UserCheck className="w-3.5 h-3.5" />
                              ) : (
                                <UserX className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleSendPasswordReset(emp.email)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                              title={language === "ar" ? "إرسال رابط استعادة كلمة المرور" : "Send password reset link"}
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Assign Modal */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t("edit_employee")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingEmp.full_name}
                </p>
              </div>
              <button
                onClick={() => setEditingEmp(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4 text-xs">
              {/* Job Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("emp_job")}
                </label>
                <input
                  type="text"
                  value={editJobTitle}
                  onChange={(e) => setEditJobTitle(e.target.value)}
                  placeholder="مثال: مهندس موقع، كاشير..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Assign Branch */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("emp_branch")} (الفرع الأساسي)
                </label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t("assign_branch_placeholder")}</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assign Shift */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("emp_shift")}
                </label>
                <select
                  value={editShiftId}
                  onChange={(e) => setEditShiftId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t("assign_shift_placeholder")}</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("emp_role")}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      editRole === "employee"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="employee"
                      checked={editRole === "employee"}
                      onChange={() => setEditRole("employee")}
                      className="text-indigo-600"
                    />
                    <span className="text-xs font-bold">{t("role_employee")}</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      editRole === "branch_supervisor"
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value="branch_supervisor"
                      checked={editRole === "branch_supervisor"}
                      onChange={() => setEditRole("branch_supervisor")}
                      className="text-indigo-600"
                    />
                    <span className="text-xs font-bold">{t("role_supervisor")}</span>
                  </label>
                </div>
              </div>

              {/* Specific Supervisor Options: Assigned Branches & Permissions */}
              {editRole === "branch_supervisor" && (
                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20 space-y-3 animate-fadeIn">
                  <span className="font-bold text-purple-900 dark:text-purple-300 block">
                    إعدادات مشرف الفرع (Supervisor Settings)
                  </span>

                  {/* Branches to Supervise */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      الفروع المسندة للإشراف (يمكن اختيار أكثر من فرع):
                    </label>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {branches.map((b) => {
                        const isChecked = supervisorBranches.includes(b.id);
                        return (
                          <label
                            key={b.id}
                            onClick={() => toggleSupervisorBranch(b.id)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 cursor-pointer text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="rounded text-purple-600"
                            />
                            <span>{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Permissions JSONB Flags */}
                  <div className="pt-2 border-t border-purple-200 dark:border-purple-900/60 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canApproveEmployees}
                        onChange={(e) => setCanApproveEmployees(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      <span>{t("supervisor_perm_approve")}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canExceedEditLimit}
                        onChange={(e) => setCanExceedEditLimit(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      <span>{t("supervisor_perm_edit_limit")}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={canCloseMonth}
                        onChange={(e) => setCanCloseMonth(e.target.checked)}
                        className="rounded text-purple-600"
                      />
                      <span>{t("supervisor_perm_close_month")}</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingEmp(null)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
                >
                  {submittingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
