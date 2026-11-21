"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Bell,
  Users,
  FileCheck2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface NotificationsBellProps {
  companyId?: string;
  lang?: "ar" | "en";
}

export function NotificationsBell({ companyId, lang = "ar" }: NotificationsBellProps) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [pendingEmployees, setPendingEmployees] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [pendingOvertime, setPendingOvertime] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotificationCounts = async () => {
    if (!companyId) return;
    try {
      // 1. Pending Employees
      const { count: empCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "pending");

      setPendingEmployees(empCount || 0);

      // 2. Pending Requests
      const { count: reqCount } = await supabase
        .from("requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("direction", "outgoing")
        .eq("status", "pending");

      setPendingRequests(reqCount || 0);

      // 3. Pending Overtime Logs
      const { count: otCount } = await supabase
        .from("attendance_logs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gt("overtime_minutes", 0)
        .eq("overtime_approved", false);

      setPendingOvertime(otCount || 0);
    } catch (err) {
      console.error("Notifications fetch error:", err);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();
    // Poll every 30 seconds for live updates
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, [companyId]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalCount = pendingEmployees + pendingRequests + pendingOvertime;
  const Chevron = lang === "ar" ? ChevronLeft : ChevronRight;

  return (
    <div className="relative inline-block" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        title={lang === "ar" ? "التنبيهات والإشعارات" : "Notifications"}
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {totalCount > 0 && (
          <span className="absolute top-1 right-1 rtl:right-auto rtl:left-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full shadow-sm animate-pulse">
            {totalCount > 9 ? "9+" : totalCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {open && (
        <div
          className={`absolute top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 overflow-hidden font-cairo ${
            lang === "ar" ? "left-0 sm:left-0" : "right-0 sm:right-0"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === "ar" ? "التنبيهات والإجراءات المعلقة" : "Actionable Alerts"}
              </span>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {totalCount} {lang === "ar" ? "جديد" : "new"}
                </span>
              )}
            </div>
          </div>

          {/* Alert List */}
          <div className="p-2 divide-y divide-slate-100 dark:divide-slate-700/60 max-h-80 overflow-y-auto">
            {totalCount === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {lang === "ar" ? "كل شيء مكتمل!" : "All caught up!"}
                </p>
                <p className="text-[11px]">
                  {lang === "ar"
                    ? "لا توجد طلبات معلقة أو ساعات إضافية بحاجة للاعتماد حالياً."
                    : "No pending staff requests or unapproved overtime logs."}
                </p>
              </div>
            ) : (
              <>
                {/* 1. Pending Employees */}
                {pendingEmployees > 0 && (
                  <Link
                    href="/dashboard/employees"
                    onClick={() => setOpen(false)}
                    className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition">
                          {lang === "ar" ? "طلبات انضمام موظفين" : "Pending Staff Approvals"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lang === "ar"
                            ? `${pendingEmployees} موظف جديد بانتظار الاعتماد والتعيين`
                            : `${pendingEmployees} new employees awaiting approval`}
                        </div>
                      </div>
                    </div>
                    <Chevron className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition" />
                  </Link>
                )}

                {/* 2. Pending Requests */}
                {pendingRequests > 0 && (
                  <Link
                    href="/dashboard/requests"
                    onClick={() => setOpen(false)}
                    className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                        <FileCheck2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition">
                          {lang === "ar" ? "طلبات إجازات وتعديلات" : "Pending Staff Requests"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lang === "ar"
                            ? `${pendingRequests} طلب بانتظار المراجعة والاعتماد`
                            : `${pendingRequests} requests awaiting management review`}
                        </div>
                      </div>
                    </div>
                    <Chevron className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition" />
                  </Link>
                )}

                {/* 3. Pending Overtime */}
                {pendingOvertime > 0 && (
                  <Link
                    href="/dashboard/requests"
                    onClick={() => setOpen(false)}
                    className="p-3 rounded-xl flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/40 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 transition">
                          {lang === "ar" ? "ساعات عمل إضافية" : "Overtime Approvals"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {lang === "ar"
                            ? `${pendingOvertime} سجل إضافي بحاجة للاعتماد`
                            : `${pendingOvertime} overtime logs waiting for approval`}
                        </div>
                      </div>
                    </div>
                    <Chevron className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5 transition" />
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
