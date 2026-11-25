"use client";

import React, { useContext, useEffect, useState } from "react";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/instantCache";
import {
  Activity,
  MapPin,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Users,
  RefreshCw,
} from "lucide-react";

interface LiveEmployeeRow {
  employeeId: string;
  fullName: string;
  jobTitle: string | null;
  branchId: string | null;
  branchName: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  graceUsed: boolean;
  status: "on_time" | "grace" | "late" | "absent";
}

export default function LiveAttendancePage() {
  const { company } = useContext(CompanyDashboardContext);
  const { dir, language } = useLanguage();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);

  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "on_time" | "grace" | "late" | "absent">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const loadLiveData = async (silent = false) => {
    if (!company?.id) return;
    const cacheKey = `live_attendance_${company.id}`;
    if (!silent) {
      const cached = getCachedData<{ branches: any[]; employees: any[]; todayLogs: any[] }>(cacheKey);
      if (cached) {
        setBranches(cached.branches || []);
        setEmployees(cached.employees || []);
        setTodayLogs(cached.todayLogs || []);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const [brRes, empRes, logRes] = await Promise.all([
        supabase
          .from("branches")
          .select("id, name")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .order("name", { ascending: true }),
        supabase
          .from("profiles")
          .select("id, full_name, job_title, branch_id, status")
          .eq("company_id", company.id)
          .in("role", ["employee", "branch_supervisor"])
          .eq("status", "active")
          .order("full_name", { ascending: true }),
        supabase
          .from("attendance_logs")
          .select("*")
          .eq("company_id", company.id)
          .eq("shift_date", todayStr)
          .order("created_at", { ascending: false }),
      ]);

      const nextBranches = brRes.data || [];
      const nextEmployees = empRes.data || [];
      const nextLogs = logRes.data || [];

      setBranches(nextBranches);
      setEmployees(nextEmployees);
      setTodayLogs(nextLogs);
      setLastUpdated(new Date().toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setCachedData(cacheKey, {
        branches: nextBranches,
        employees: nextEmployees,
        todayLogs: nextLogs,
      });
    } catch (err) {
      console.error("Error loading live attendance:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!company?.id) return;
    loadLiveData();

    const channel = supabase
      .channel(`live_attendance_${company.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "attendance_logs",
          filter: `company_id=eq.${company.id}`,
        },
        () => {
          loadLiveData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [company?.id]);

  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  const rows: LiveEmployeeRow[] = employees.map((emp) => {
    const log = todayLogs.find((l) => l.employee_id === emp.id);
    let status: LiveEmployeeRow["status"] = "absent";
    if (log?.check_in_at) {
      if ((log.late_minutes || 0) > 0) status = "late";
      else if (log.grace_used) status = "grace";
      else status = "on_time";
    }

    return {
      employeeId: emp.id,
      fullName: emp.full_name,
      jobTitle: emp.job_title,
      branchId: emp.branch_id,
      branchName: (emp.branch_id && branchMap.get(emp.branch_id)) || (language === "ar" ? "غير معين" : "Unassigned"),
      checkInAt: log?.check_in_at || null,
      checkOutAt: log?.check_out_at || null,
      lateMinutes: log?.late_minutes || 0,
      graceUsed: !!log?.grace_used,
      status,
    };
  });

  const branchFiltered = branchFilter === "all" ? rows : rows.filter((r) => r.branchId === branchFilter);
  const onTimeCount = branchFiltered.filter((r) => r.status === "on_time").length;
  const graceCount = branchFiltered.filter((r) => r.status === "grace").length;
  const lateCount = branchFiltered.filter((r) => r.status === "late").length;
  const absentCount = branchFiltered.filter((r) => r.status === "absent").length;

  const filteredRows = branchFiltered.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.fullName.toLowerCase().includes(q) ||
        (r.jobTitle || "").toLowerCase().includes(q) ||
        r.branchName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-cairo" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span>{language === "ar" ? "الحضور المباشر الآن" : "Live Attendance Now"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "متابعة لحظية فورية لحضور وانصراف الموظفين اليوم عبر جميع الفروع."
              : "Real-time monitoring of today's check-ins and check-outs across all branches."}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {lastUpdated && (
            <span className="text-[11px] font-mono text-slate-400">
              {language === "ar" ? "آخر تحديث:" : "Updated:"} {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              loadLiveData(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>{language === "ar" ? "تحديث" : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "on_time" ? "all" : "on_time")}
          className={`p-4 rounded-2xl border text-start transition shadow-sm ${
            statusFilter === "on_time"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-400"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{language === "ar" ? "حاضر بالموعد" : "On Time"}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
            {onTimeCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "grace" ? "all" : "grace")}
          className={`p-4 rounded-2xl border text-start transition shadow-sm ${
            statusFilter === "grace"
              ? "bg-amber-50 dark:bg-amber-950/50 border-amber-400"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{language === "ar" ? "فترة سماح" : "Grace Period"}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
            {graceCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "late" ? "all" : "late")}
          className={`p-4 rounded-2xl border text-start transition shadow-sm ${
            statusFilter === "late"
              ? "bg-rose-50 dark:bg-rose-950/50 border-rose-400"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{language === "ar" ? "متأخر" : "Late"}</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
            {lateCount}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "absent" ? "all" : "absent")}
          className={`p-4 rounded-2xl border text-start transition shadow-sm ${
            statusFilter === "absent"
              ? "bg-slate-100 dark:bg-slate-700 border-slate-400"
              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{language === "ar" ? "لم يسجل بعد" : "Not Checked In"}</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-700 dark:text-slate-200 mt-1">
            {absentCount}
          </div>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === "ar" ? "ابحث باسم الموظف أو الفرع..." : "Search employee or branch..."}
            className="w-full ps-10 pe-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{language === "ar" ? "جميع الفروع" : "All Branches"}</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{language === "ar" ? "جميع الحالات" : "All Statuses"}</option>
          <option value="on_time">{language === "ar" ? "حاضر بالموعد" : "On Time"}</option>
          <option value="grace">{language === "ar" ? "فترة سماح" : "Grace Period"}</option>
          <option value="late">{language === "ar" ? "متأخر" : "Late"}</option>
          <option value="absent">{language === "ar" ? "لم يسجل بعد" : "Not Checked In"}</option>
        </select>
      </div>

      {/* Live Attendance Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs text-slate-400">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <span>{language === "ar" ? "لا توجد نتائج مطابقة." : "No matching records."}</span>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "الموظف" : "Employee"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "الفرع" : "Branch"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "وقت الحضور" : "Check-In"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "وقت الانصراف" : "Check-Out"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "الحالة" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredRows.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{row.fullName}</div>
                      <div className="text-[11px] text-slate-400">{row.jobTitle || "--"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{row.branchName}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {row.checkInAt
                        ? new Date(row.checkInAt).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {row.checkOutAt
                        ? new Date(row.checkOutAt).toLocaleTimeString(language === "ar" ? "ar-SA" : "en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--:--"}
                    </td>
                    <td className="py-3 px-4">
                      {row.status === "on_time" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          {language === "ar" ? "حاضر بالموعد" : "On Time"}
                        </span>
                      )}
                      {row.status === "grace" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          {language === "ar" ? "فترة سماح" : "Grace Period"}
                        </span>
                      )}
                      {row.status === "late" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          {language === "ar" ? `متأخر (${row.lateMinutes} د)` : `Late (${row.lateMinutes}m)`}
                        </span>
                      )}
                      {row.status === "absent" && (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
                          {language === "ar" ? "لم يسجل بعد" : "Not Checked In"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
