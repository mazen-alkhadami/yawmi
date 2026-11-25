"use client";

import React, { useContext, useEffect, useState } from "react";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/instantCache";
import {
  FileCheck2,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Calendar,
  User,
  Users,
  Search,
  Check,
  X,
  Loader2,
  Filter,
  DollarSign,
  Building2,
  ChevronDown,
} from "lucide-react";

interface RequestRecord {
  id: string;
  company_id: string;
  branch_id: string | null;
  employee_id: string;
  type: "manual_edit" | "leave" | "permission" | "shift_change" | "device_reset" | "salary_confirmation";
  direction: "outgoing" | "incoming";
  status: "pending" | "approved" | "rejected" | "confirmed";
  payload: any;
  attachment_url: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  employee?: {
    id: string;
    full_name: string;
    job_title: string | null;
    phone: string | null;
  };
  branch?: {
    id: string;
    name: string;
  };
}

interface OvertimeLog {
  id: string;
  company_id: string;
  branch_id: string | null;
  employee_id: string;
  shift_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  overtime_minutes: number;
  overtime_approved: boolean;
  employee?: {
    id: string;
    full_name: string;
    job_title: string | null;
  };
}

export default function RequestsCenterPage() {
  const { company, profile: managerProfile } = useContext(CompanyDashboardContext);
  const { t } = useLanguage();
  const supabase = createClient();

  const [activeMainTab, setActiveMainTab] = useState<"requests" | "overtime" | "salary">("requests");
  const [loading, setLoading] = useState(true);

  // Tab 1: Requests
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Tab 2: Overtime Approvals
  const [overtimeLogs, setOvertimeLogs] = useState<OvertimeLog[]>([]);
  const [approvingOvertimeId, setApprovingOvertimeId] = useState<string | null>(null);

  // Tab 3: Salary Confirmations
  const [salaryRequests, setSalaryRequests] = useState<RequestRecord[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [salaryMonth, setSalaryMonth] = useState<number>(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState<number>(new Date().getFullYear());
  const [targetEmployeeId, setTargetEmployeeId] = useState<string>("all");
  const [salaryAmount, setSalaryAmount] = useState<string>("");
  const [salaryNote, setSalaryNote] = useState<string>("");
  const [sendingSalary, setSendingSalary] = useState(false);

  // Action feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchAllData = async () => {
    if (!company?.id) return;
    const cacheKey = `requests_center_${company.id}`;
    const cached = getCachedData<{
      requests: RequestRecord[];
      overtimeLogs: OvertimeLog[];
      salaryRequests: RequestRecord[];
      employeesList: any[];
    }>(cacheKey);

    if (cached) {
      setRequests(cached.requests || []);
      setOvertimeLogs(cached.overtimeLogs || []);
      setSalaryRequests(cached.salaryRequests || []);
      setEmployeesList(cached.employeesList || []);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      // Run all 5 independent queries in parallel
      const [reqRes, otRes, salRes, empsRes, brsRes] = await Promise.all([
        supabase
          .from("requests")
          .select("*")
          .eq("company_id", company.id)
          .eq("direction", "outgoing")
          .order("created_at", { ascending: false }),
        supabase
          .from("attendance_logs")
          .select("*")
          .eq("company_id", company.id)
          .gt("overtime_minutes", 0)
          .eq("overtime_approved", false)
          .order("shift_date", { ascending: false }),
        supabase
          .from("requests")
          .select("*")
          .eq("company_id", company.id)
          .eq("type", "salary_confirmation")
          .eq("direction", "incoming")
          .order("created_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("id, full_name, job_title, phone")
          .eq("company_id", company.id),
        supabase
          .from("branches")
          .select("id, name")
          .eq("company_id", company.id),
      ]);

      if (reqRes.error) throw reqRes.error;

      const emps = empsRes.data || [];
      const empMap = new Map(emps.map((e) => [e.id, e]));
      setEmployeesList(emps);

      const brMap = new Map((brsRes.data || []).map((b) => [b.id, b]));

      const enhancedReqs = (reqRes.data || []).map((r) => ({
        ...r,
        employee: empMap.get(r.employee_id),
        branch: r.branch_id ? brMap.get(r.branch_id) : undefined,
      }));
      setRequests(enhancedReqs);

      const enhancedOts = (otRes.data || []).map((o) => ({
        ...o,
        employee: empMap.get(o.employee_id),
      }));
      setOvertimeLogs(enhancedOts);

      const enhancedSals = (salRes.data || []).map((s) => ({
        ...s,
        employee: empMap.get(s.employee_id),
      }));
      setSalaryRequests(enhancedSals);

      setCachedData(cacheKey, {
        requests: enhancedReqs,
        overtimeLogs: enhancedOts,
        salaryRequests: enhancedSals,
        employeesList: emps,
      });
    } catch (err: any) {
      console.error("Requests center fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      fetchAllData();
    }
  }, [company?.id]);

  // Open review modal
  const openReview = (req: RequestRecord, action: "approve" | "reject") => {
    setSelectedRequest(req);
    setReviewAction(action);
    setReviewNote("");
    setReviewModalOpen(true);
  };

  // Submit Review (with auto-actions for device_reset and manual_edit)
  const handleSubmitReview = async () => {
    if (!selectedRequest || !company?.id || !managerProfile?.id) return;
    setSubmittingReview(true);
    setFeedback(null);

    try {
      const isApproved = reviewAction === "approve";
      const newStatus = isApproved ? "approved" : "rejected";

      // 1. Auto-Action on device_reset Approval: set profiles.device_id = null
      if (isApproved && selectedRequest.type === "device_reset") {
        await supabase
          .from("profiles")
          .update({ device_id: null })
          .eq("id", selectedRequest.employee_id)
          .eq("company_id", company.id);
      }

      // 2. Auto-Action on manual_edit Approval: update or insert attendance_logs record
      if (isApproved && selectedRequest.type === "manual_edit") {
        const payload = selectedRequest.payload || {};
        const editDate = payload.date;

        if (editDate) {
          // Check if an attendance log exists for that day
          const { data: existingLog } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("employee_id", selectedRequest.employee_id)
            .eq("shift_date", editDate)
            .maybeSingle();

          const checkInIso = payload.check_in_time
            ? `${editDate}T${payload.check_in_time}:00`
            : null;
          const checkOutIso = payload.check_out_time
            ? `${editDate}T${payload.check_out_time}:00`
            : null;

          if (existingLog) {
            await supabase
              .from("attendance_logs")
              .update({
                check_in_at: checkInIso,
                check_out_at: checkOutIso,
                is_manual_edit: true,
                edit_reason: payload.reason || "تم التعديل بواسطة الإدارة",
                edited_by: managerProfile.id,
              })
              .eq("id", existingLog.id);
          } else {
            await supabase.from("attendance_logs").insert([
              {
                company_id: company.id,
                branch_id: selectedRequest.branch_id || null,
                employee_id: selectedRequest.employee_id,
                shift_date: editDate,
                check_in_at: checkInIso,
                check_out_at: checkOutIso,
                is_manual_edit: true,
                edit_reason: payload.reason || "تم التعديل بواسطة الإدارة",
                edited_by: managerProfile.id,
              },
            ]);
          }
        }
      }

      // 2b. Auto-Action on leave Approval: deduct requested days from profiles.annual_leave_balance (>= 0)
      if (isApproved && selectedRequest.type === "leave") {
        const payload = selectedRequest.payload || {};
        const startStr = payload.start_date;
        const endStr = payload.end_date || startStr;
        let daysToDeduct = 1;

        if (startStr && endStr) {
          const startMs = new Date(startStr).getTime();
          const endMs = new Date(endStr).getTime();
          if (!isNaN(startMs) && !isNaN(endMs) && endMs >= startMs) {
            daysToDeduct = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1);
          }
        }

        const { data: empProf } = await supabase
          .from("profiles")
          .select("annual_leave_balance")
          .eq("id", selectedRequest.employee_id)
          .maybeSingle();

        const currentBal =
          typeof empProf?.annual_leave_balance === "number" ? empProf.annual_leave_balance : 21;
        const nextBal = Math.max(0, currentBal - daysToDeduct);

        await supabase
          .from("profiles")
          .update({ annual_leave_balance: nextBal })
          .eq("id", selectedRequest.employee_id)
          .eq("company_id", company.id);
      }

      // 3. Update the request status
      const { error: reqUpdateErr } = await supabase
        .from("requests")
        .update({
          status: newStatus,
          review_note: reviewNote.trim() || null,
          reviewed_by: managerProfile.id,
        })
        .eq("id", selectedRequest.id)
        .eq("company_id", company.id);

      if (reqUpdateErr) throw reqUpdateErr;

      setFeedback({
        type: "success",
        text: isApproved ? "تمت الموافقة على الطلب وتنفيذ الإجراءات المرتبطة بنجاح." : "تم رفض الطلب.",
      });

      setReviewModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      console.error("Review request error:", err);
      setFeedback({ type: "error", text: err.message || "فشل تحديث حالة الطلب." });
    } finally {
      setSubmittingReview(false);
    }
  };

  // 1-Click Approve Overtime
  const handleApproveOvertime = async (logId: string) => {
    setApprovingOvertimeId(logId);
    setFeedback(null);
    try {
      const { error } = await supabase
        .from("attendance_logs")
        .update({ overtime_approved: true })
        .eq("id", logId)
        .eq("company_id", company!.id);

      if (error) throw error;

      setFeedback({ type: "success", text: t("overtime_approved_success") });
      await fetchAllData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to approve overtime." });
    } finally {
      setApprovingOvertimeId(null);
    }
  };

  // Dispatch Salary Confirmation Requests
  const handleSendSalaryConfirmations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setSendingSalary(true);
    setFeedback(null);

    try {
      const targetEmployees =
        targetEmployeeId === "all"
          ? employeesList.filter((e) => e.status !== "suspended")
          : employeesList.filter((e) => e.id === targetEmployeeId);

      if (targetEmployees.length === 0) {
        throw new Error("لا يوجد موظفون مستهدفون.");
      }

      const rowsToInsert = targetEmployees.map((emp) => ({
        company_id: company.id,
        employee_id: emp.id,
        type: "salary_confirmation" as const,
        direction: "incoming" as const,
        status: "pending" as const,
        payload: {
          month: Number(salaryMonth),
          year: Number(salaryYear),
          amount: salaryAmount.trim() || null,
          note: salaryNote.trim() || null,
        },
      }));

      const { error } = await supabase.from("requests").insert(rowsToInsert);
      if (error) throw error;

      setFeedback({
        type: "success",
        text: `تم إرسال إشعارات تأكيد الراتب بنجاح إلى (${rowsToInsert.length}) موظفاً!`,
      });
      setSalaryAmount("");
      setSalaryNote("");
      await fetchAllData();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "فشل إرسال إشعارات الرواتب." });
    } finally {
      setSendingSalary(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "manual_edit":
        return t("req_type_manual_edit");
      case "leave":
        return t("req_type_leave");
      case "permission":
        return t("req_type_permission");
      case "shift_change":
        return t("req_type_shift_change");
      case "device_reset":
        return t("req_type_device_reset");
      case "salary_confirmation":
        return t("req_type_salary_confirmation");
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "confirmed":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            {status === "confirmed" ? t("req_status_confirmed") : t("req_status_approved")}
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
            {t("req_status_rejected")}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
            {t("req_status_pending")}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t("requests_center_title")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("requests_center_subtitle")}
          </p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center justify-between ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-800 dark:text-red-200"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-fit text-xs font-bold">
        <button
          onClick={() => setActiveMainTab("requests")}
          className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
            activeMainTab === "requests"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>{t("tab_employee_requests")}</span>
          {requests.filter((r) => r.status === "pending").length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
              {requests.filter((r) => r.status === "pending").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab("overtime")}
          className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
            activeMainTab === "overtime"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t("tab_overtime_approvals")}</span>
          {overtimeLogs.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-bold">
              {overtimeLogs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveMainTab("salary")}
          className={`px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 ${
            activeMainTab === "salary"
              ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>{t("tab_salary_confirmations")}</span>
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: EMPLOYEE REQUESTS */}
      {/* ============================================================ */}
      {activeMainTab === "requests" && (
        <div className="space-y-4">
          {/* Status Filter Sub-bar */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-2.5 py-1 rounded-lg border transition ${
                statusFilter === "pending"
                  ? "bg-amber-50 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-300 font-bold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              {t("req_status_pending")} ({requests.filter((r) => r.status === "pending").length})
            </button>
            <button
              onClick={() => setStatusFilter("approved")}
              className={`px-2.5 py-1 rounded-lg border transition ${
                statusFilter === "approved"
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300 font-bold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              {t("req_status_approved")} ({requests.filter((r) => r.status === "approved").length})
            </button>
            <button
              onClick={() => setStatusFilter("rejected")}
              className={`px-2.5 py-1 rounded-lg border transition ${
                statusFilter === "rejected"
                  ? "bg-rose-50 dark:bg-rose-950 border-rose-300 text-rose-700 dark:text-rose-300 font-bold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              {t("req_status_rejected")} ({requests.filter((r) => r.status === "rejected").length})
            </button>
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1 rounded-lg border transition ${
                statusFilter === "all"
                  ? "bg-indigo-50 dark:bg-indigo-950 border-indigo-300 text-indigo-700 dark:text-indigo-300 font-bold"
                  : "border-slate-200 dark:border-slate-800 text-slate-500"
              }`}
            >
              {t("tab_all")} ({requests.length})
            </button>
          </div>

          {/* Requests Grid */}
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs text-slate-400">
              {t("no_requests_found")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm space-y-3 text-xs flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Employee & Type */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-sm">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{req.employee?.full_name || "موظف"}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">
                          {req.employee?.job_title || "موظف"} &bull; {req.branch?.name || "بدون فرع"}
                        </span>
                      </div>
                      {getStatusBadge(req.status)}
                    </div>

                    {/* Request Type Badge */}
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] mb-2 border border-indigo-200 dark:border-indigo-800">
                      <span>{getRequestTypeLabel(req.type)}</span>
                    </div>

                    {/* Request Payload Details */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-slate-600 dark:text-slate-300 space-y-1 text-xs">
                      {req.type === "leave" && (
                        <p>
                          <strong>الفترة:</strong> من {req.payload?.start_date} إلى {req.payload?.end_date}
                        </p>
                      )}
                      {req.type === "permission" && (
                        <p>
                          <strong>التاريخ:</strong> {req.payload?.date} &bull; <strong>الوقت:</strong> {req.payload?.time_from} - {req.payload?.time_to}
                        </p>
                      )}
                      {req.type === "manual_edit" && (
                        <p>
                          <strong>التاريخ:</strong> {req.payload?.date} &bull; <strong>حضور:</strong> {req.payload?.check_in_time} &bull; <strong>انصراف:</strong> {req.payload?.check_out_time}
                        </p>
                      )}
                      {req.type === "shift_change" && (
                        <p>
                          <strong>الشفت المطلوب:</strong> {req.payload?.target_shift_name || "غير محدد"}
                        </p>
                      )}
                      {req.type === "device_reset" && (
                        <p className="text-amber-600 dark:text-amber-400 font-semibold">
                          طلب فك ربط الجهاز المسجل للسماح بالدخول من هاتف جديد.
                        </p>
                      )}
                      {req.payload?.reason && (
                        <p>
                          <strong>السبب:</strong> {req.payload.reason}
                        </p>
                      )}
                    </div>

                    {/* Review Note if exists */}
                    {req.review_note && (
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-400 p-2 rounded bg-slate-100 dark:bg-slate-800/80">
                        <strong>{t("manager_review_note")}:</strong> {req.review_note}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(req.created_at).toLocaleDateString("ar-SA", {
                        month: "numeric",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {req.status === "pending" && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openReview(req, "reject")}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 transition"
                        >
                          {t("reject_employee")}
                        </button>
                        <button
                          onClick={() => openReview(req, "approve")}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
                        >
                          {t("approve_employee")}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: OVERTIME APPROVALS */}
      {/* ============================================================ */}
      {activeMainTab === "overtime" && (
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          ) : overtimeLogs.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs text-slate-400">
              {t("no_overtime_found")}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
              <table className="w-full text-xs text-start">
                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                  <tr>
                    <th className="py-3 px-4 text-start">{t("emp_name")}</th>
                    <th className="py-3 px-4 text-start">{t("req_date_label")}</th>
                    <th className="py-3 px-4 text-start">وقت الانصراف</th>
                    <th className="py-3 px-4 text-start">الدقائق الإضافية</th>
                    <th className="py-3 px-4 text-end">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overtimeLogs.map((ot) => (
                    <tr key={ot.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {ot.employee?.full_name || "موظف"}
                      </td>
                      <td className="py-3 px-4 font-mono">{ot.shift_date}</td>
                      <td className="py-3 px-4 font-mono">
                        {ot.check_out_at
                          ? new Date(ot.check_out_at).toLocaleTimeString("ar-SA", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "--"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">
                          +{ot.overtime_minutes} دقيقة ({Math.round(ot.overtime_minutes / 6) / 10} ساعة)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end">
                        <button
                          onClick={() => handleApproveOvertime(ot.id)}
                          disabled={approvingOvertimeId === ot.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                        >
                          {approvingOvertimeId === ot.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>{t("approve_overtime_btn")}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: SALARY CONFIRMATIONS */}
      {/* ============================================================ */}
      {activeMainTab === "salary" && (
        <div className="space-y-6">
          {/* Dispatch Box */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t("send_salary_confirmation_btn")}
                </h2>
                <p className="text-xs text-slate-500">
                  إرسال إشعار استلام الراتب لتأكيده من قبل الموظفين عبر تطبيق يومي.
                </p>
              </div>
            </div>

            <form onSubmit={handleSendSalaryConfirmations} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                {/* Month */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("salary_month")}
                  </label>
                  <select
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                      <option key={m} value={m}>
                        شهر {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("salary_year")}
                  </label>
                  <input
                    type="number"
                    value={salaryYear}
                    onChange={(e) => setSalaryYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                {/* Target Employee */}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t("target_employee")}
                  </label>
                  <select
                    value={targetEmployeeId}
                    onChange={(e) => setTargetEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                  >
                    <option value="all">{t("select_all_employees")}</option>
                    {employeesList.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.job_title || "موظف"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    مبلغ الراتب (اختياري)
                  </label>
                  <input
                    type="text"
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder="مثال: 5500"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات المسير (اختياري)
                  </label>
                  <input
                    type="text"
                    value={salaryNote}
                    onChange={(e) => setSalaryNote(e.target.value)}
                    placeholder="مثال: تحويل بنكي على مصرف الراجحي"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sendingSalary}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition disabled:opacity-50"
              >
                {sendingSalary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>إرسال إشعارات التأكيد الآن</span>
              </button>
            </form>
          </div>

          {/* Past Salary Confirmations List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              سجل إشعارات الرواتب وحالة التأكيد
            </h3>

            {salaryRequests.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 text-xs text-slate-400">
                لم يتم إرسال أي إشعارات رواتب بعد.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 shadow-sm">
                <table className="w-full text-xs text-start">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
                    <tr>
                      <th className="py-3 px-4 text-start">{t("emp_name")}</th>
                      <th className="py-3 px-4 text-start">المسير</th>
                      <th className="py-3 px-4 text-start">المبلغ</th>
                      <th className="py-3 px-4 text-start">تاريخ الإرسال</th>
                      <th className="py-3 px-4 text-end">حالة تأكيد الموظف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salaryRequests.map((sal) => (
                      <tr key={sal.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {sal.employee?.full_name || "موظف"}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">
                          شهر {sal.payload?.month} / {sal.payload?.year}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          {sal.payload?.amount ? `${sal.payload.amount} ر.س` : "--"}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(sal.created_at).toLocaleDateString("ar-SA", {
                            month: "numeric",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-end">
                          {sal.status === "confirmed" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{t("req_status_confirmed")}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>بانتظار تأكيد الموظف</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {reviewAction === "approve" ? "اعتماد الطلب" : "رفض الطلب"}
              </h3>
              <button onClick={() => setReviewModalOpen(false)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs space-y-1">
              <p>
                <strong>الموظف:</strong> {selectedRequest.employee?.full_name}
              </p>
              <p>
                <strong>نوع الطلب:</strong> {getRequestTypeLabel(selectedRequest.type)}
              </p>
              {selectedRequest.type === "device_reset" && reviewAction === "approve" && (
                <p className="text-amber-600 dark:text-amber-400 font-bold mt-1">
                  &bull; سيتم فك ربط جهاز الموظف تلقائياً عند الاعتماد.
                </p>
              )}
              {selectedRequest.type === "manual_edit" && reviewAction === "approve" && (
                <p className="text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                  &bull; سيتم تحديث سجل حضور الموظف تلقائياً بالأوقات المطلوبة.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("review_note_label")}
              </label>
              <textarea
                rows={2}
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="اكتب ملاحظة أو توجيه للموظف..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5 ${
                  reviewAction === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {submittingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{reviewAction === "approve" ? "تأكيد الاعتماد" : "تأكيد الرفض"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
