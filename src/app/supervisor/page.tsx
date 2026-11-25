"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCachedData, setCachedData, clearUserCache } from "@/lib/instantCache";
import { applyDynamicThemeColor, THEME_COLOR_PRESETS } from "@/lib/themeColor";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  UserCheck,
  Building2,
  Clock,
  FileCheck2,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LogOut,
  MapPin,
  Search,
  Check,
  X,
  Loader2,
  Palette,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  RotateCcw,
  Megaphone,
  Send,
  Trash2,
} from "lucide-react";

interface Branch {
  id: string;
  name: string;
  geofence_radius: number;
  latitude: number;
  longitude: number;
  is_active: boolean;
}

interface SupervisorPermissions {
  can_approve_employees: boolean;
  can_exceed_edit_limit: boolean;
  can_close_month: boolean;
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  branch_id: string | null;
  shift_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  late_minutes: number;
  overtime_minutes: number;
  is_manual_edit: boolean;
  grace_used: boolean;
  status: string;
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

interface RequestRecord {
  id: string;
  company_id: string;
  branch_id: string | null;
  employee_id: string;
  type: "manual_edit" | "leave" | "permission" | "shift_change" | "device_reset";
  direction: "outgoing";
  status: "pending" | "approved" | "rejected";
  payload: any;
  attachment_url: string | null;
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

interface PendingEmployee {
  id: string;
  full_name: string;
  national_id: string;
  nationality: string;
  job_title: string | null;
  phone: string | null;
  branch_id: string | null;
  shift_template_id: string | null;
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

export default function BranchSupervisorPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t, dir, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [companyPrimaryColor, setCompanyPrimaryColor] = useState<string>("#4F46E5");
  const [selectedThemeColor, setSelectedThemeColor] = useState<string>("#4F46E5");
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [assignedBranches, setAssignedBranches] = useState<Branch[]>([]);
  const [permissions, setPermissions] = useState<SupervisorPermissions>({
    can_approve_employees: false,
    can_exceed_edit_limit: false,
    can_close_month: false,
  });

  const [activeTab, setActiveTab] = useState<"attendance" | "requests" | "approvals" | "announcements">("attendance");

  // Data states
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [pendingEmployees, setPendingEmployees] = useState<PendingEmployee[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annBranchId, setAnnBranchId] = useState<string>("");
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [annPriority, setAnnPriority] = useState<"normal" | "urgent">("normal");
  const [publishingAnn, setPublishingAnn] = useState(false);
  const [annFeedback, setAnnFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters & search
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Review modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestRecord | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Employee action loading
  const [empActionLoading, setEmpActionLoading] = useState<string | null>(null);

  // Auto-opened Employee Assignment Modal
  const [shiftTemplates, setShiftTemplates] = useState<Array<{ id: string; name: string }>>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningEmp, setAssigningEmp] = useState<PendingEmployee | null>(null);
  const [assignBranchId, setAssignBranchId] = useState("");
  const [assignShiftId, setAssignShiftId] = useState("");
  const [assignJobTitle, setAssignJobTitle] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    loadSupervisorData();
  }, []);

  const loadSupervisorData = async () => {
    const cacheKey = "supervisor_portal";
    const cached = getCachedData<{
      profile: any;
      permissions: SupervisorPermissions;
      assignedBranches: Branch[];
      attendanceLogs: AttendanceRecord[];
      requests: RequestRecord[];
      pendingEmployees: PendingEmployee[];
      shiftTemplates: Array<{ id: string; name: string }>;
    }>(cacheKey);

    if (cached?.profile) {
      setProfile(cached.profile);
      setPermissions(cached.permissions);
      setAssignedBranches(cached.assignedBranches || []);
      setAttendanceLogs(cached.attendanceLogs || []);
      setRequests(cached.requests || []);
      setPendingEmployees(cached.pendingEmployees || []);
      setShiftTemplates(cached.shiftTemplates || []);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData?.session?.user || null;
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user || null;
      }
      if (!user) {
        clearUserCache();
        router.push("/login");
        return;
      }

      // Fetch user profile
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileErr || !profileData) {
        clearUserCache();
        router.push("/login");
        return;
      }

      // Verify authorization
      if (profileData.role !== "branch_supervisor" && profileData.role !== "company_manager" && profileData.role !== "super_admin") {
        router.push("/login");
        return;
      }

      setProfile(profileData);

      // Load company primary color fallback & apply personal or company theme color
      let compColor = "#4F46E5";
      if (profileData.company_id) {
        const { data: compRow } = await supabase
          .from("companies")
          .select("primary_color")
          .eq("id", profileData.company_id)
          .maybeSingle();
        if (compRow?.primary_color) compColor = compRow.primary_color;
      }
      setCompanyPrimaryColor(compColor);
      const activeColor =
        profileData.theme_color ||
        (typeof window !== "undefined" ? localStorage.getItem(`yawmi_theme_color_${user.id}`) : null) ||
        compColor;
      setSelectedThemeColor(activeColor);
      applyDynamicThemeColor(activeColor);

      const perms = profileData.supervisor_permissions || {};
      const parsedPermissions: SupervisorPermissions = {
        can_approve_employees: !!perms.can_approve_employees,
        can_exceed_edit_limit: !!perms.can_exceed_edit_limit,
        can_close_month: !!perms.can_close_month,
      };
      setPermissions(parsedPermissions);

      // Fetch assigned branches
      let branchList: Branch[] = [];
      if (profileData.role === "company_manager" || profileData.role === "super_admin") {
        const { data: allBranches } = await supabase
          .from("branches")
          .select("*")
          .eq("company_id", profileData.company_id)
          .eq("is_active", true)
          .order("name", { ascending: true });
        branchList = allBranches || [];
      } else {
        const { data: supBranches } = await supabase
          .from("branch_supervisors")
          .select("branch_id, branches(*)")
          .eq("supervisor_id", user.id);

        if (supBranches && supBranches.length > 0) {
          branchList = supBranches
            .map((sb: any) => sb.branches)
            .filter((b: any) => b && b.is_active);
        }
      }

      setAssignedBranches(branchList);
      if (branchList.length > 0) {
        setAnnBranchId((prev) => (prev && branchList.some((b) => b.id === prev) ? prev : branchList[0].id));
      }

      let nextAtt: AttendanceRecord[] = [];
      let nextReqs: RequestRecord[] = [];
      let nextPending: PendingEmployee[] = [];
      let nextShifts: Array<{ id: string; name: string }> = [];
      let nextAnnouncements: any[] = [];

      if (branchList.length > 0) {
        const branchIds = branchList.map((b) => b.id);
        const todayStr = new Date().toISOString().split("T")[0];
        const canApprove = parsedPermissions.can_approve_employees || profileData.role === "company_manager";

        const [attRes, reqRes, pendingRes, shiftsRes, annRes] = await Promise.all([
          supabase
            .from("attendance_logs")
            .select("*, employee:employee_id(id, full_name, job_title, phone), branch:branch_id(id, name)")
            .eq("company_id", profileData.company_id)
            .in("branch_id", branchIds)
            .eq("shift_date", todayStr)
            .order("check_in_at", { ascending: false }),
          supabase
            .from("requests")
            .select("*, employee:employee_id(id, full_name, job_title, phone), branch:branch_id(id, name)")
            .eq("company_id", profileData.company_id)
            .eq("direction", "outgoing")
            .eq("status", "pending")
            .in("branch_id", branchIds)
            .order("created_at", { ascending: false }),
          canApprove
            ? supabase
                .from("profiles")
                .select("*, branch:branch_id(id, name), shift_template:shift_template_id(id, name)")
                .eq("company_id", profileData.company_id)
                .eq("status", "pending")
                .in("branch_id", branchIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] }),
          canApprove
            ? supabase
                .from("shift_templates")
                .select("id, name")
                .eq("company_id", profileData.company_id)
                .order("name", { ascending: true })
            : Promise.resolve({ data: [] }),
          supabase
            .from("announcements")
            .select("*")
            .eq("company_id", profileData.company_id)
            .in("branch_id", branchIds)
            .order("created_at", { ascending: false })
            .limit(20),
        ]);

        nextAtt = (attRes.data as any) || [];
        nextReqs = (reqRes.data as any) || [];
        nextPending = (pendingRes.data as any) || [];
        nextShifts = (shiftsRes.data as any) || [];
        nextAnnouncements = (annRes.data as any) || [];

        setAttendanceLogs(nextAtt);
        setRequests(nextReqs);
        setPendingEmployees(nextPending);
        setShiftTemplates(nextShifts);
        setAnnouncements(nextAnnouncements);
      }

      setCachedData(cacheKey, {
        profile: profileData,
        permissions: parsedPermissions,
        assignedBranches: branchList,
        attendanceLogs: nextAtt,
        requests: nextReqs,
        pendingEmployees: nextPending,
        shiftTemplates: nextShifts,
      });
    } catch (err) {
      console.error("Error loading supervisor portal:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranchAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBranchId = annBranchId || assignedBranches[0]?.id;
    if (!profile?.company_id || !targetBranchId || !annTitle.trim() || !annBody.trim()) return;
    setPublishingAnn(true);
    setAnnFeedback(null);

    try {
      const { data, error } = await supabase
        .from("announcements")
        .insert([
          {
            company_id: profile.company_id,
            branch_id: targetBranchId,
            sender_name: profile.full_name || (language === "ar" ? "مشرف الفرع" : "Branch Supervisor"),
            sender_role: "supervisor",
            title: annTitle.trim(),
            body: annBody.trim(),
            priority: annPriority,
            created_by: profile.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      setAnnouncements((prev) => [data, ...prev]);
      setAnnTitle("");
      setAnnBody("");
      setAnnPriority("normal");
      setAnnFeedback({
        type: "success",
        text: language === "ar" ? "تم نشر تعميم الفرع لموظفي الفرع بنجاح!" : "Branch announcement published!",
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

  const handleDeleteBranchAnnouncement = async (annId: string) => {
    if (!profile?.company_id) return;
    try {
      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", annId)
        .eq("company_id", profile.company_id);
      if (error) throw error;
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
    } catch (err: any) {
      setAnnFeedback({
        type: "error",
        text: err.message || (language === "ar" ? "فشل حذف التعميم." : "Failed to delete."),
      });
    }
  };

  const handleLogout = async () => {
    clearUserCache();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Handle Review Modal submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !profile) return;
    setActionLoading(true);

    try {
      const newStatus = reviewAction === "approve" ? "approved" : "rejected";

      // 1. Update request status
      const { error: reqErr } = await supabase
        .from("requests")
        .update({
          status: newStatus,
          reviewed_by: profile.id,
          review_note: reviewNote.trim() || null,
        })
        .eq("id", selectedRequest.id);

      if (reqErr) throw reqErr;

      // 2. Auto-action if approved
      if (newStatus === "approved") {
        if (selectedRequest.type === "device_reset") {
          await supabase
            .from("profiles")
            .update({ device_id: null })
            .eq("id", selectedRequest.employee_id);
        } else if (selectedRequest.type === "manual_edit") {
          const payload = selectedRequest.payload || {};
          const editDate = payload.date || new Date().toISOString().split("T")[0];
          const checkIn = payload.check_in_at ? `${editDate}T${payload.check_in_at}:00` : null;
          const checkOut = payload.check_out_at ? `${editDate}T${payload.check_out_at}:00` : null;

          // Check if attendance log exists for this date
          const { data: existingLog } = await supabase
            .from("attendance_logs")
            .select("id")
            .eq("employee_id", selectedRequest.employee_id)
            .eq("shift_date", editDate)
            .maybeSingle();

          if (existingLog) {
            await supabase
              .from("attendance_logs")
              .update({
                check_in_at: checkIn,
                check_out_at: checkOut,
                is_manual_edit: true,
                edit_reason: payload.reason || "Approved by Branch Supervisor",
                edited_by: profile.id,
              })
              .eq("id", existingLog.id);
          } else {
            await supabase.from("attendance_logs").insert({
              company_id: profile.company_id,
              branch_id: selectedRequest.branch_id,
              employee_id: selectedRequest.employee_id,
              shift_date: editDate,
              check_in_at: checkIn,
              check_out_at: checkOut,
              is_manual_edit: true,
              edit_reason: payload.reason || "Approved by Branch Supervisor",
              edited_by: profile.id,
              status: "present",
            });
          }
        }
      }

      setReviewModalOpen(false);
      setSelectedRequest(null);
      setReviewNote("");
      // Refresh data
      loadSupervisorData();
    } catch (err: any) {
      alert("Error reviewing request: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  // Handle employee approval with auto-opened assignment modal
  const handleEmployeeApprove = async (emp: PendingEmployee) => {
    setEmpActionLoading(emp.id);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "active" })
        .eq("id", emp.id);

      if (error) throw error;
      setPendingEmployees((prev) => prev.filter((item) => item.id !== emp.id));

      // Auto-open assignment modal immediately!
      setAssigningEmp(emp);
      setAssignBranchId(emp.branch_id || (assignedBranches[0]?.id ?? ""));
      setAssignShiftId(emp.shift_template_id || (shiftTemplates[0]?.id ?? ""));
      setAssignJobTitle(emp.job_title || "");
      setAssignModalOpen(true);
    } catch (err: any) {
      alert("Error approving employee: " + (err.message || err));
    } finally {
      setEmpActionLoading(null);
    }
  };

  // Handle saving employee assignments from supervisor
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningEmp) return;
    setAssignLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          branch_id: assignBranchId || null,
          shift_template_id: assignShiftId || null,
          job_title: assignJobTitle.trim() || null,
        })
        .eq("id", assigningEmp.id);

      if (error) throw error;
      setAssignModalOpen(false);
      setAssigningEmp(null);
      loadSupervisorData();
    } catch (err: any) {
      alert("Error saving employee assignment: " + (err.message || err));
    } finally {
      setAssignLoading(false);
    }
  };

  // Handle employee rejection
  const handleEmployeeStatus = async (employeeId: string, newStatus: "active" | "suspended") => {
    setEmpActionLoading(employeeId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", employeeId);

      if (error) throw error;
      setPendingEmployees((prev) => prev.filter((emp) => emp.id !== employeeId));
    } catch (err: any) {
      alert("Error updating employee status: " + (err.message || err));
    } finally {
      setEmpActionLoading(null);
    }
  };

  // Filter attendance logs
  const filteredAttendance = attendanceLogs.filter((log) => {
    const matchesBranch = branchFilter === "all" || log.branch_id === branchFilter;
    const matchesSearch =
      !searchQuery ||
      log.employee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.employee?.job_title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesBranch = branchFilter === "all" || req.branch_id === branchFilter;
    const matchesSearch =
      !searchQuery ||
      req.employee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.employee?.job_title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBranch && matchesSearch;
  });

  // Filter pending employees
  const filteredPendingEmployees = pendingEmployees.filter((emp) => {
    const matchesBranch = branchFilter === "all" || emp.branch_id === branchFilter;
    const matchesSearch =
      !searchQuery ||
      emp.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.national_id?.includes(searchQuery);
    return matchesBranch && matchesSearch;
  });

  const formatTime = (ts: string | null) => {
    if (!ts) return "--:--";
    try {
      return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col font-cairo">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <YawmiLogo size="md" />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                {t("supervisor_portal_title")}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {profile?.full_name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemePickerOpen((prev) => !prev)}
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                title={language === "ar" ? "لون الواجهة" : "Accent Color"}
              >
                <Palette className="w-4 h-4" />
              </button>
              {themePickerOpen && (
                <div className="absolute end-0 mt-2 w-56 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-50 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-700 dark:text-slate-200">
                      {language === "ar" ? "لون الواجهة المفضل" : "Accent Color"}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        setSelectedThemeColor(companyPrimaryColor);
                        applyDynamicThemeColor(companyPrimaryColor);
                        setThemePickerOpen(false);
                        if (profile?.id) {
                          if (typeof window !== "undefined") {
                            localStorage.removeItem(`yawmi_theme_color_${profile.id}`);
                          }
                          await supabase.from("profiles").update({ theme_color: null }).eq("id", profile.id);
                        }
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {language === "ar" ? "لون الشركة" : "Company"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {THEME_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={async () => {
                          setSelectedThemeColor(preset.hex);
                          applyDynamicThemeColor(preset.hex);
                          setThemePickerOpen(false);
                          if (profile?.id) {
                            if (typeof window !== "undefined") {
                              localStorage.setItem(`yawmi_theme_color_${profile.id}`, preset.hex);
                            }
                            setProfile((prev: any) => (prev ? { ...prev, theme_color: preset.hex } : prev));
                            await supabase.from("profiles").update({ theme_color: preset.hex }).eq("id", profile.id);
                          }
                        }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          selectedThemeColor?.toLowerCase() === preset.hex.toLowerCase()
                            ? "border-slate-900 dark:border-white scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={language === "ar" ? preset.nameAr : preset.nameEn}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <LanguageToggle />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t("logout")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="space-y-4 animate-pulse py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            <div className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : assignedBranches.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center max-w-lg mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200 dark:border-amber-900/60">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold mb-2">{t("no_assigned_branches")}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              يرجى التواصل مع مدير المنشأة لإسناد فروع شركتك إلى حسابك كمشرف فرع.
            </p>
            <button
              onClick={loadSupervisorData}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              إعادة التحميل
            </button>
          </div>
        ) : (
          <>
            {/* Supervisor Overview & Assigned Branches */}
            <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    <span>{t("assigned_branches_title")}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold">
                      {assignedBranches.length}
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t("supervisor_portal_subtitle")}
                  </p>
                </div>

                {/* Supervisor Permissions Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      permissions.can_approve_employees
                        ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through opacity-60"
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {t("supervisor_perm_approve")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      permissions.can_exceed_edit_limit
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through opacity-60"
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {t("supervisor_perm_edit_limit")}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                      permissions.can_close_month
                        ? "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 line-through opacity-60"
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    {t("supervisor_perm_close_month")}
                  </span>
                </div>
              </div>

              {/* Branch Cards Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
                {assignedBranches.map((br) => (
                  <div
                    key={br.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate">{br.name}</div>
                        <div className="text-[10px] text-slate-400">
                          نطاق: {br.geofence_radius} م
                        </div>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Tabs & Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-800/80 rounded-xl overflow-x-auto whitespace-nowrap max-w-full">
                <button
                  onClick={() => setActiveTab("attendance")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    activeTab === "attendance"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t("supervisor_today_attendance")}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                    {attendanceLogs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("requests")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    activeTab === "requests"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <FileCheck2 className="w-3.5 h-3.5" />
                  <span>{t("supervisor_pending_requests")}</span>
                  {requests.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white">
                      {requests.length}
                    </span>
                  )}
                </button>

                {permissions.can_approve_employees && (
                  <button
                    onClick={() => setActiveTab("approvals")}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      activeTab === "approvals"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>اعتماد الموظفين</span>
                    {pendingEmployees.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white">
                        {pendingEmployees.length}
                      </span>
                    )}
                  </button>
                )}

                <button
                  onClick={() => setActiveTab("announcements")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                    activeTab === "announcements"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "تعميمات الفرع" : "Branch Announcements"}</span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                {assignedBranches.length > 1 && (
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="h-9 px-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">جميع الفروع المسندة</option>
                    {assignedBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="بحث بالاسم أو المسمى..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-9 pl-9 pr-3 rtl:pr-9 rtl:pl-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-60"
                  />
                </div>
              </div>
            </div>

            {/* TAB 1: Today's Live Attendance */}
            {activeTab === "attendance" && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      حضور اليوم: {new Date().toISOString().split("T")[0]}
                    </span>
                  </div>
                  <button
                    onClick={loadSupervisorData}
                    className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    title="تحديث"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {filteredAttendance.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">لا يوجد تسجيل حضور حتى الآن لهذا اليوم في الفروع المحددة.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">الموظف</th>
                          <th className="p-3">الفرع</th>
                          <th className="p-3">وقت الحضور</th>
                          <th className="p-3">وقت الانصراف</th>
                          <th className="p-3">التأخير</th>
                          <th className="p-3">الإضافي</th>
                          <th className="p-3">الحالة / الملاحظة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {filteredAttendance.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {log.employee?.full_name || "موظف"}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {log.employee?.job_title || "--"}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">
                              {log.branch?.name || "--"}
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600">
                              {formatTime(log.check_in_at)}
                            </td>
                            <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                              {formatTime(log.check_out_at)}
                            </td>
                            <td className="p-3">
                              {log.late_minutes > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">
                                  {log.late_minutes} د
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="p-3">
                              {log.overtime_minutes > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                                  {log.overtime_minutes} د
                                </span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {log.grace_used && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                    فترة سماح
                                  </span>
                                )}
                                {log.is_manual_edit && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                    تعديل يدوي
                                  </span>
                                )}
                                {!log.is_manual_edit && !log.grace_used && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    حاضر (GPS)
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Pending Requests for Assigned Branches */}
            {activeTab === "requests" && (
              <div className="space-y-3">
                {filteredRequests.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <FileCheck2 className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-xs">{t("no_requests_found")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredRequests.map((req) => (
                      <div
                        key={req.id}
                        className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {req.type === "leave" && t("req_type_leave")}
                              {req.type === "permission" && t("req_type_permission")}
                              {req.type === "manual_edit" && t("req_type_manual_edit")}
                              {req.type === "shift_change" && t("req_type_shift_change")}
                              {req.type === "device_reset" && t("req_type_device_reset")}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {new Date(req.created_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white">
                              {req.employee?.full_name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>{req.employee?.job_title || "--"}</span>
                              <span>•</span>
                              <span>{req.branch?.name}</span>
                            </div>
                          </div>

                          {/* Request Details Payload */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                            {req.type === "leave" && (
                              <p>
                                <strong>الفترة:</strong> من {req.payload?.start_date} إلى {req.payload?.end_date}
                              </p>
                            )}
                            {req.type === "permission" && (
                              <p>
                                <strong>التاريخ والوقت:</strong> {req.payload?.date} ({req.payload?.time})
                              </p>
                            )}
                            {req.type === "manual_edit" && (
                              <p>
                                <strong>التعديل:</strong> {req.payload?.date} (حضور: {req.payload?.check_in_at || "--"} / انصراف: {req.payload?.check_out_at || "--"})
                              </p>
                            )}
                            {req.type === "shift_change" && (
                              <p>
                                <strong>الشفت المطلوب:</strong> {req.payload?.requested_shift_name || "تغيير شفت"}
                              </p>
                            )}
                            {req.type === "device_reset" && (
                              <p>
                                <strong>السبب:</strong> تغيير الهاتف الذكي / إعادة ربط الجهاز
                              </p>
                            )}
                            {req.payload?.reason && (
                              <p className="text-slate-500 dark:text-slate-400">
                                <strong>المبرر:</strong> {req.payload.reason}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setReviewAction("approve");
                              setReviewModalOpen(true);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>موافقة</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setReviewAction("reject");
                              setReviewModalOpen(true);
                            }}
                            className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 hover:bg-rose-100 transition flex items-center justify-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>رفض</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Pending Employee Approvals */}
            {activeTab === "approvals" && permissions.can_approve_employees && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    الموظفون الجدد بانتظار الاعتماد لفروعك المسندة
                  </h3>
                </div>

                {filteredPendingEmployees.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">لا يوجد موظفون معلقون بانتظار الاعتماد حالياً.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3">اسم الموظف</th>
                          <th className="p-3">الهوية / الإقامة</th>
                          <th className="p-3">الفرع</th>
                          <th className="p-3">الشفت</th>
                          <th className="p-3">الجوال</th>
                          <th className="p-3 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {filteredPendingEmployees.map((emp) => (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {emp.full_name}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {emp.job_title || "--"} ({emp.nationality || "--"})
                              </div>
                            </td>
                            <td className="p-3 font-mono">{emp.national_id || "--"}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">
                              {emp.branch?.name || "--"}
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">
                              {emp.shift_template?.name || "--"}
                            </td>
                            <td className="p-3 font-mono">{emp.phone || "--"}</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEmployeeApprove(emp)}
                                  disabled={empActionLoading === emp.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  {empActionLoading === emp.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span>اعتماد وتعيين</span>
                                </button>
                                <button
                                  onClick={() => handleEmployeeStatus(emp.id, "suspended")}
                                  disabled={empActionLoading === emp.id}
                                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 hover:bg-rose-100 transition flex items-center gap-1 disabled:opacity-50"
                                >
                                  <X className="w-3 h-3" />
                                  <span>رفض</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Branch-Scoped Announcements */}
            {activeTab === "announcements" && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Megaphone className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {language === "ar" ? "تعميمات موظفي الفرع" : "Branch Staff Announcements"}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {language === "ar"
                          ? "تصل هذه التعميمات حصرياً لموظفي الفرع المسند إليك مع إظهار اسمك وصفتك."
                          : "Broadcasts sent strictly to employees in your assigned branch."}
                      </p>
                    </div>
                  </div>
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
                  <form onSubmit={handleCreateBranchAnnouncement} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === "ar" ? "الفرع المستهدف" : "Target Branch"}
                      </label>
                      <select
                        value={annBranchId || assignedBranches[0]?.id || ""}
                        onChange={(e) => setAnnBranchId(e.target.value)}
                        disabled={assignedBranches.length <= 1}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-80"
                      >
                        {assignedBranches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === "ar" ? "عنوان التعميم *" : "Title *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        placeholder={language === "ar" ? "مثال: اجتماع طاقم الفرع الصباحي" : "e.g., Morning Shift Briefing"}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {language === "ar" ? "نص التعميم *" : "Message *"}
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={annBody}
                        onChange={(e) => setAnnBody(e.target.value)}
                        placeholder={language === "ar" ? "اكتب التنبيه لموظفي الفرع..." : "Write branch announcement..."}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
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
                        {publishingAnn ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{language === "ar" ? "نشر للفرع" : "Publish to Branch"}</span>
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2.5 max-h-80 overflow-y-auto pe-1">
                    {announcements.length === 0 ? (
                      <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                        {language === "ar" ? "لا توجد تعميمات خاصة بالفرع بعد." : "No branch announcements yet."}
                      </div>
                    ) : (
                      announcements.map((ann) => {
                        const brName = assignedBranches.find((b) => b.id === ann.branch_id)?.name || "";
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
                                {brName && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    {brName}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                {ann.body}
                              </p>
                              <div className="text-[10px] text-slate-400">
                                {ann.sender_name && `${language === "ar" ? "المرسل:" : "From:"} ${ann.sender_name} • `}
                                {new Date(ann.created_at).toLocaleDateString("ar-SA", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteBranchAnnouncement(ann.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Review Modal */}
      {reviewModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                {reviewAction === "approve" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-600" />
                )}
                <span>
                  {reviewAction === "approve" ? "تأكيد اعتماد الطلب" : "تأكيد رفض الطلب"}
                </span>
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reviewAction === "approve"
                ? `أنت على وشك اعتماد طلب (${selectedRequest.type}) للموظف: ${selectedRequest.employee?.full_name}`
                : `أنت على وشك رفض طلب (${selectedRequest.type}) للموظف: ${selectedRequest.employee?.full_name}`}
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t("review_note_label")}
                </label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="أدخل أي ملاحظات ترغب في إظهارها للموظف..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-1.5 ${
                    reviewAction === "approve"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  } disabled:opacity-50`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : reviewAction === "approve" ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>{reviewAction === "approve" ? "اعتماد الطلب" : "رفض الطلب"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="py-2 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auto-Opened Employee Assignment Modal */}
      {assignModalOpen && assigningEmp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم اعتماد الموظف — إتمام التعيين</span>
              </h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              تم تنشيط حساب <strong>{assigningEmp.full_name}</strong> بنجاح. يمكنك الآن تعيين الفرع والشفت والمسمى الوظيفي مباشرة:
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الفرع المسند *
                </label>
                <select
                  required
                  value={assignBranchId}
                  onChange={(e) => setAssignBranchId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  {assignedBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  شفت الدوام
                </label>
                <select
                  value={assignShiftId}
                  onChange={(e) => setAssignShiftId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="">بدون شفت محدد</option>
                  {shiftTemplates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المسمى الوظيفي
                </label>
                <input
                  type="text"
                  value={assignJobTitle}
                  onChange={(e) => setAssignJobTitle(e.target.value)}
                  placeholder="مثال: موظف استقبال، محاسب..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="flex-1 py-2 px-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  {assignLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ التعيين والبدء</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="py-2 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  إغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
        يَومي | Yawmi Supervisor Portal
      </footer>
    </div>
  );
}
