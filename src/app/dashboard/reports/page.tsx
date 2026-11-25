"use client";

import React, { useContext, useEffect, useState } from "react";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/instantCache";
import { WhatsAppSummaryModal, SummaryStatsBlock } from "@/components/WhatsAppSummaryModal";
import {
  FileBarChart2,
  Calendar,
  Building2,
  Download,
  Printer,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Loader2,
  Check,
  X,
  FileSpreadsheet,
  ShieldCheck,
  RotateCcw,
  MessageCircle,
  RefreshCw,
  BarChart3,
} from "lucide-react";

interface EmployeeReportRow {
  employeeId: string;
  fullName: string;
  jobTitle: string;
  branchName: string;
  presentDays: number;
  absentDays: number;
  totalLateMinutes: number;
  graceUses: number;
  approvedOvertimeMinutes: number;
  manualEditsCount: number;
}

interface MonthlyReportStatus {
  id?: string;
  status: "open" | "submitted" | "approved" | "closed";
  closed_at?: string;
  closed_by_name?: string;
  is_exceptional_close?: boolean;
  close_note?: string;
}

export default function MonthlyReportsPage() {
  const { company, profile } = useContext(CompanyDashboardContext);
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [reportRows, setReportRows] = useState<EmployeeReportRow[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [employeesDataList, setEmployeesDataList] = useState<any[]>([]);
  const [monthStatus, setMonthStatus] = useState<MonthlyReportStatus>({ status: "open" });
  const [loading, setLoading] = useState(true);
  const [syncingAbsences, setSyncingAbsences] = useState(false);
  const [absenceSyncMsg, setAbsenceSyncMsg] = useState<string | null>(null);
  const [whatsappSummaryOpen, setWhatsappSummaryOpen] = useState(false);

  // Close Month Modal
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [isExceptional, setIsExceptional] = useState(false);
  const [closeNote, setCloseNote] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);

  // Supervisor permissions check
  const isSupervisor = profile?.role === "branch_supervisor";
  const canSupervisorClose = !!(profile as any)?.supervisor_permissions?.can_close_month;
  const canClose = profile?.role === "company_manager" || profile?.role === "super_admin" || (isSupervisor && canSupervisorClose);

  useEffect(() => {
    if (company?.id) {
      loadBranches();
    }
  }, [company?.id]);

  useEffect(() => {
    if (company?.id) {
      loadReportData();
    }
  }, [company?.id, selectedMonth, selectedYear, selectedBranchId]);

  const loadBranches = async () => {
    const cacheKey = `reports_branches_${company!.id}`;
    const cached = getCachedData<any[]>(cacheKey);
    if (cached) setBranches(cached);

    try {
      const { data } = await supabase
        .from("branches")
        .select("id, name")
        .eq("company_id", company!.id)
        .eq("is_active", true)
        .order("name", { ascending: true });
      const list = data || [];
      setBranches(list);
      setCachedData(cacheKey, list);
    } catch (err) {
      console.error("Error loading branches:", err);
    }
  };

  const loadReportData = async () => {
    const cacheKey = `reports_${company!.id}_${selectedBranchId}_${selectedYear}_${selectedMonth}`;
    const cached = getCachedData<{ monthStatus: MonthlyReportStatus; reportRows: EmployeeReportRow[] }>(cacheKey);
    if (cached) {
      setMonthStatus(cached.monthStatus);
      setReportRows(cached.reportRows || []);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      let statusQuery = supabase
        .from("monthly_reports")
        .select("id, status, closed_at, is_exceptional_close, close_note, closer:closed_by(full_name)")
        .eq("company_id", company!.id)
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (selectedBranchId !== "all") {
        statusQuery = statusQuery.eq("branch_id", selectedBranchId);
      } else {
        statusQuery = statusQuery.is("branch_id", null);
      }

      let empQuery = supabase
        .from("profiles")
        .select("id, full_name, job_title, branch_id, branch:branch_id(name)")
        .eq("company_id", company!.id)
        .in("role", ["employee", "branch_supervisor"]);

      if (selectedBranchId !== "all") {
        empQuery = empQuery.eq("branch_id", selectedBranchId);
      }

      const startDayStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
      const nextMonth = selectedMonth === 12 ? 1 : selectedMonth + 1;
      const nextYear = selectedMonth === 12 ? selectedYear + 1 : selectedYear;
      const endDayStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      let attQuery = supabase
        .from("attendance_logs")
        .select("id, employee_id, branch_id, shift_date, status, check_in_at, late_minutes, grace_used, overtime_minutes, overtime_approved, is_manual_edit")
        .eq("company_id", company!.id)
        .gte("shift_date", startDayStr)
        .lt("shift_date", endDayStr);

      if (selectedBranchId !== "all") {
        attQuery = attQuery.eq("branch_id", selectedBranchId);
      }

      // Safely auto-sync yesterday's absences when viewing past days
      const nowLocal = new Date();
      const yesterday = new Date(nowLocal);
      yesterday.setDate(nowLocal.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const autoSyncKey = `yawmi_abs_synced_${company!.id}_${yesterdayStr}`;
      if (typeof window !== "undefined" && !sessionStorage.getItem(autoSyncKey)) {
        sessionStorage.setItem(autoSyncKey, "1");
        supabase
          .rpc("mark_daily_absences", { p_company_id: company!.id, p_target_date: yesterdayStr })
          .then(() => {});
      }

      // Run all 3 queries in parallel
      const [statusRes, empRes, attRes] = await Promise.all([
        statusQuery.maybeSingle(),
        empQuery.order("full_name", { ascending: true }),
        attQuery,
      ]);

      const reportStatusData = statusRes.data;
      const nextMonthStatus: MonthlyReportStatus = reportStatusData
        ? {
            id: reportStatusData.id,
            status: reportStatusData.status as any,
            closed_at: reportStatusData.closed_at,
            closed_by_name: (reportStatusData.closer as any)?.full_name,
            is_exceptional_close: reportStatusData.is_exceptional_close,
            close_note: reportStatusData.close_note,
          }
        : { status: "open" };
      setMonthStatus(nextMonthStatus);

      const employeesData = empRes.data;
      setEmployeesDataList(employeesData || []);
      if (!employeesData || employeesData.length === 0) {
        setReportRows([]);
        setRawLogs([]);
        setCachedData(cacheKey, { monthStatus: nextMonthStatus, reportRows: [] });
        return;
      }

      const logs = attRes.data || [];
      setRawLogs(logs);

      // 4. Aggregate logs per employee
      const aggregated: EmployeeReportRow[] = employeesData.map((emp: any) => {
        const empLogs = logs.filter((l) => l.employee_id === emp.id);
        const absentDays = empLogs.filter((l: any) => l.status === "absent").length;
        const presentDays = empLogs.filter((l: any) => l.status !== "absent" && l.check_in_at).length;
        const totalLate = empLogs.reduce((sum, l) => sum + (l.late_minutes || 0), 0);
        const graceUses = empLogs.filter((l) => l.grace_used).length;
        const approvedOt = empLogs
          .filter((l) => l.overtime_approved)
          .reduce((sum, l) => sum + (l.overtime_minutes || 0), 0);
        const manualEdits = empLogs.filter((l) => l.is_manual_edit).length;

        return {
          employeeId: emp.id,
          fullName: emp.full_name,
          jobTitle: emp.job_title || "--",
          branchName: emp.branch?.name || "--",
          presentDays,
          absentDays,
          totalLateMinutes: totalLate,
          graceUses,
          approvedOvertimeMinutes: approvedOt,
          manualEditsCount: manualEdits,
        };
      });

      setReportRows(aggregated);
      setCachedData(cacheKey, { monthStatus: nextMonthStatus, reportRows: aggregated });
    } catch (err) {
      console.error("Error loading report data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Close Month Action
  const handleCloseMonth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id || !profile?.id) return;
    setCloseLoading(true);

    try {
      const branchIdParam = selectedBranchId === "all" ? null : selectedBranchId;

      if (monthStatus.id) {
        // Update existing record
        const { error } = await supabase
          .from("monthly_reports")
          .update({
            status: "closed",
            closed_by: profile.id,
            closed_at: new Date().toISOString(),
            is_exceptional_close: isExceptional,
            close_note: isExceptional ? closeNote.trim() : null,
          })
          .eq("id", monthStatus.id);

        if (error) throw error;
      } else {
        // Insert new closed record
        const { error } = await supabase.from("monthly_reports").insert({
          company_id: company.id,
          branch_id: branchIdParam,
          month: selectedMonth,
          year: selectedYear,
          status: "closed",
          closed_by: profile.id,
          closed_at: new Date().toISOString(),
          is_exceptional_close: isExceptional,
          close_note: isExceptional ? closeNote.trim() : null,
        });

        if (error) throw error;
      }

      setCloseModalOpen(false);
      setCloseNote("");
      setIsExceptional(false);
      await loadReportData();
    } catch (err: any) {
      alert("Error closing month: " + (err.message || err));
    } finally {
      setCloseLoading(false);
    }
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (reportRows.length === 0) return;

    const headers = [
      "اسم الموظف",
      "المسمى الوظيفي",
      "الفرع",
      "أيام الحضور",
      "دقائق التأخير",
      "استخدام السماح",
      "الإضافي المعتمد (دقيقة)",
      "التعديلات اليدوية",
    ];

    const csvContent = reportRows.map((row) => [
      `"${row.fullName}"`,
      `"${row.jobTitle}"`,
      `"${row.branchName}"`,
      row.presentDays,
      row.totalLateMinutes,
      row.graceUses,
      row.approvedOvertimeMinutes,
      row.manualEditsCount,
    ].join(","));

    // \uFEFF ensures Excel properly decodes Arabic characters as UTF-8
    const fullCsv = "\uFEFF" + [headers.join(","), ...csvContent].join("\n");
    const blob = new Blob([fullCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `yawmi-report-${selectedYear}-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print / PDF layout
  const handlePrint = () => {
    window.print();
  };

  const months = [
    { num: 1, name: "يناير (January)" },
    { num: 2, name: "فبراير (February)" },
    { num: 3, name: "مارس (March)" },
    { num: 4, name: "أبريل (April)" },
    { num: 5, name: "مايو (May)" },
    { num: 6, name: "يونيو (June)" },
    { num: 7, name: "يوليو (July)" },
    { num: 8, name: "أغسطس (August)" },
    { num: 9, name: "سبتمبر (September)" },
    { num: 10, name: "أكتوبر (October)" },
    { num: 11, name: "نوفمبر (November)" },
    { num: 12, name: "ديسمبر (December)" },
  ];

  const years = [2024, 2025, 2026, 2027];

  return (
    <div className="space-y-6 font-cairo">
      {/* Print-Only Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">{company?.name}</h1>
        <p className="text-sm text-slate-600">
          تقرير مسير الحضور لشهر {selectedMonth} / {selectedYear}
        </p>
      </div>

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileBarChart2 className="w-5 h-5 text-indigo-600" />
            <span>{t("reports_title")}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("reports_subtitle")}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={syncingAbsences}
            onClick={async () => {
              if (!company?.id) return;
              setSyncingAbsences(true);
              setAbsenceSyncMsg(null);
              try {
                const todayStr = new Date().toISOString().split("T")[0];
                const { data, error } = await supabase.rpc("mark_daily_absences", {
                  p_company_id: company.id,
                  p_target_date: todayStr,
                });
                if (error) throw error;
                const count = Number(data || 0);
                setAbsenceSyncMsg(
                  language === "ar"
                    ? `تم تحديث الغياب التلقائي: ${count} سجل غياب جديد.`
                    : `Absences synced: ${count} new absent record(s).`
                );
                await loadReportData();
              } catch (err: any) {
                setAbsenceSyncMsg(err?.message || "Sync failed");
              } finally {
                setSyncingAbsences(false);
              }
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition text-amber-800 dark:text-amber-300 disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingAbsences ? "animate-spin" : ""}`} />
            <span>{language === "ar" ? "تحديث الغياب التلقائي" : "Sync Absences"}</span>
          </button>

          <button
            type="button"
            onClick={() => setWhatsappSummaryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "ملخص الواتساب" : "WhatsApp Summary"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={reportRows.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition text-slate-700 dark:text-slate-200 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("export_csv_btn")}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 transition text-slate-700 dark:text-slate-200 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t("print_report_btn")}</span>
          </button>

          {canClose && monthStatus.status !== "closed" && (
            <button
              onClick={() => setCloseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t("close_month_btn")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Closed & Locked Banner */}
      {monthStatus.status === "closed" && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3 shadow-sm print:hidden">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span>{t("month_closed_locked_banner")}</span>
              {monthStatus.is_exceptional_close && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  إغلاق استثنائي
                </span>
              )}
            </div>
            <p className="text-[11px] opacity-80">
              تم الإغلاق بواسطة {monthStatus.closed_by_name || "إدارة المنشأة"} بتاريخ{" "}
              {monthStatus.closed_at ? new Date(monthStatus.closed_at).toLocaleString() : "--"}
            </p>
            {monthStatus.close_note && (
              <p className="text-[11px] bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-emerald-200/60 mt-1">
                <strong>ملاحظة الإغلاق:</strong> {monthStatus.close_note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Month Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("month_label")}:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {t("year_label")}:
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
              الفرع:
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="h-9 px-3 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">{t("all_branches")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">حالة المسير:</span>
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
              monthStatus.status === "closed"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {monthStatus.status === "closed" ? (
              <Lock className="w-3.5 h-3.5" />
            ) : (
              <Unlock className="w-3.5 h-3.5" />
            )}
            <span>
              {monthStatus.status === "closed"
                ? t("month_status_closed")
                : t("month_status_open")}
            </span>
          </span>
        </div>
      </div>

      {/* Absence Sync Feedback */}
      {absenceSyncMsg && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-bold text-amber-800 dark:text-amber-200 flex items-center justify-between print:hidden">
          <span>{absenceSyncMsg}</span>
          <button type="button" onClick={() => setAbsenceSyncMsg(null)} className="text-amber-600 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attendance Commitment Charts (Pure SVG / Tailwind) */}
      {!loading && rawLogs.length > 0 && (() => {
        const absentCount = rawLogs.filter((l) => l.status === "absent").length;
        const presentLogs = rawLogs.filter((l) => l.status !== "absent");
        const lateCount = presentLogs.filter((l) => (l.late_minutes || 0) > 0).length;
        const graceCount = presentLogs.filter((l) => l.grace_used && (l.late_minutes || 0) === 0).length;
        const onTimeCount = presentLogs.filter((l) => !l.grace_used && (l.late_minutes || 0) === 0).length;
        const total = Math.max(1, onTimeCount + graceCount + lateCount + absentCount);

        const radius = 38;
        const circumference = 2 * Math.PI * radius;
        const segments = [
          { label: language === "ar" ? "في الموعد" : "On Time", count: onTimeCount, color: "#10B981" },
          { label: language === "ar" ? "فترة السماح" : "Grace", count: graceCount, color: "#F59E0B" },
          { label: language === "ar" ? "متأخر" : "Late", count: lateCount, color: "#F97316" },
          { label: language === "ar" ? "غائب" : "Absent", count: absentCount, color: "#EF4444" },
        ];

        let cumulativeOffset = 0;
        const branchStats = branches.map((br) => {
          const bLogs = rawLogs.filter((l) => l.branch_id === br.id);
          const bTotal = bLogs.length;
          const bOnTime = bLogs.filter((l) => l.status !== "absent" && (l.late_minutes || 0) === 0).length;
          const pct = bTotal > 0 ? Math.round((bOnTime / bTotal) * 100) : 0;
          return { id: br.id, name: br.name, pct, total: bTotal };
        });

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
            {/* Donut Breakdown */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-100 dark:text-slate-700" />
                  {segments.map((seg) => {
                    const dash = (seg.count / total) * circumference;
                    const offset = cumulativeOffset;
                    cumulativeOffset += dash;
                    if (seg.count === 0) return null;
                    return (
                      <circle
                        key={seg.label}
                        cx="50"
                        cy="50"
                        r={radius}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="12"
                        strokeDasharray={`${dash} ${circumference}`}
                        strokeDashoffset={-offset}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-black text-slate-900 dark:text-white">
                    {Math.round(((onTimeCount + graceCount) / total) * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {language === "ar" ? "الالتزام" : "On-Time"}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  <span>{language === "ar" ? "توزيع حالات الحضور" : "Attendance Breakdown"}</span>
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {segments.map((seg) => (
                    <div key={seg.label} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                        {seg.label}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{seg.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Branch Punctuality Comparison */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>{language === "ar" ? "مقارنة التزام الفروع" : "Branch Punctuality Comparison"}</span>
              </h3>
              {branchStats.length === 0 ? (
                <p className="text-xs text-slate-400">{language === "ar" ? "لا توجد فروع" : "No branches"}</p>
              ) : (
                <div className="space-y-2.5 max-h-36 overflow-y-auto pe-1">
                  {branchStats.map((br) => (
                    <div key={br.id} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-700 dark:text-slate-200 truncate">{br.name}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">{br.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-600 transition-all"
                          style={{ width: `${br.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Employee Attendance Summary Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-2">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-xs">{t("loading")}</p>
          </div>
        ) : reportRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs">لا يوجد موظفون مسجلون أو سجلات حضور لهذا الشهر.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">اسم الموظف</th>
                  <th className="p-3.5">الفرع</th>
                  <th className="p-3.5 text-center">{t("present_days")}</th>
                  <th className="p-3.5 text-center">{t("late_mins")}</th>
                  <th className="p-3.5 text-center">{t("grace_uses")}</th>
                  <th className="p-3.5 text-center">{t("approved_ot")}</th>
                  <th className="p-3.5 text-center">{t("manual_edits")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {reportRows.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {row.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400">{row.jobTitle}</div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {row.branchName}
                    </td>
                    <td className="p-3.5 text-center font-bold text-emerald-600 font-mono">
                      {row.presentDays}
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono">
                      {row.totalLateMinutes > 0 ? (
                        <span className="text-amber-600">{row.totalLateMinutes} د</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {row.graceUses > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                          {row.graceUses}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {row.approvedOvertimeMinutes > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                          {row.approvedOvertimeMinutes} د
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {row.manualEditsCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400">
                          {row.manualEditsCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Close Month Modal */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>إغلاق واعتماد مسير الشهر</span>
              </h3>
              <button
                onClick={() => setCloseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              أنت على وشك إغلاق الفترة الشهرية ({selectedMonth} / {selectedYear}).
              بمجرد الإغلاق، سيتم قفل سجلات الحضور والانصراف ولا يمكن للموظفين أو المشرفين تقديم طلبات تعديل لهذا الشهر.
            </p>

            <form onSubmit={handleCloseMonth} className="space-y-4 text-xs">
              {/* Exceptional Close Toggle */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isExceptional}
                    onChange={(e) => setIsExceptional(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {t("exceptional_close_btn")}
                  </span>
                </label>
                <p className="text-[11px] text-slate-400">
                  فعل هذا الخيار في حال رغبتك بإغلاق الشهر قبل اكتماله أو تجاوز النواقص وسجلات الغياب المتبقية.
                </p>
              </div>

              {/* Close Note */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("close_note_label")} {isExceptional && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  required={isExceptional}
                  rows={3}
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  placeholder="أدخل مبرر الإغلاق أو أي ملاحظات للمسير..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={closeLoading}
                  className="flex-1 py-2 px-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {closeLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>تأكيد الإغلاق والاعتماد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  className="py-2 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(() => {
        const todayStr = new Date().toISOString().split("T")[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 6);
        const weekStartStr = weekAgo.toISOString().split("T")[0];
        const empMap = new Map(employeesDataList.map((e: any) => [e.id, e.full_name]));
        const branchNameById = new Map(branches.map((b) => [b.id, b.name]));

        const buildStats = (logs: any[], dateLabel: string): SummaryStatsBlock => {
          const absentRows = logs.filter((l) => l.status === "absent");
          const presentRows = logs.filter((l) => l.status !== "absent");
          const lateRows = presentRows.filter((l) => (l.late_minutes || 0) > 0);
          const graceRows = presentRows.filter((l) => l.grace_used && (l.late_minutes || 0) === 0);
          const onTimeRows = presentRows.filter((l) => !l.grace_used && (l.late_minutes || 0) === 0);
          const total = presentRows.length + absentRows.length;
          const punctualityPct = total > 0 ? Math.round(((onTimeRows.length + graceRows.length) / total) * 100) : 100;

          let topBranchName: string | undefined;
          let bestPct = -1;
          for (const br of branches) {
            const bLogs = logs.filter((l) => l.branch_id === br.id);
            if (bLogs.length === 0) continue;
            const bOnTime = bLogs.filter((l) => l.status !== "absent" && (l.late_minutes || 0) === 0).length;
            const bPct = Math.round((bOnTime / bLogs.length) * 100);
            if (bPct > bestPct) {
              bestPct = bPct;
              topBranchName = `${br.name} (${bPct}%)`;
            }
          }

          return {
            dateLabel,
            totalEmployees: employeesDataList.length || total,
            presentCount: presentRows.length,
            onTimeCount: onTimeRows.length,
            graceCount: graceRows.length,
            lateCount: lateRows.length,
            absentCount: absentRows.length,
            punctualityPct,
            topBranchName,
            lateNames: Array.from(new Set(lateRows.map((l) => empMap.get(l.employee_id)).filter(Boolean) as string[])),
            absentNames: Array.from(new Set(absentRows.map((l) => empMap.get(l.employee_id)).filter(Boolean) as string[])),
          };
        };

        const dailyLogs = rawLogs.filter((l) => l.shift_date === todayStr);
        const weeklyLogs = rawLogs.filter((l) => l.shift_date >= weekStartStr && l.shift_date <= todayStr);

        return (
          <WhatsAppSummaryModal
            isOpen={whatsappSummaryOpen}
            onClose={() => setWhatsappSummaryOpen(false)}
            language={language}
            companyName={company?.name}
            branchName={selectedBranchId !== "all" ? branchNameById.get(selectedBranchId) : undefined}
            dailyStats={buildStats(dailyLogs, todayStr)}
            weeklyStats={buildStats(weeklyLogs, `${weekStartStr} → ${todayStr}`)}
          />
        );
      })()}
    </div>
  );
}
