"use client";

import React, { useContext, useEffect, useState } from "react";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import { getCachedData, setCachedData } from "@/lib/instantCache";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Filter,
} from "lucide-react";

interface AuditLogRecord {
  id: string;
  company_id: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action_type: string;
  target_summary: string | null;
  metadata: any;
  created_at: string;
}

export default function ManagementAuditLogPage() {
  const { company } = useContext(CompanyDashboardContext);
  const { dir, language } = useLanguage();
  const supabase = createClient();

  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const loadAuditLogs = async (silent = false) => {
    if (!company?.id) return;
    const cacheKey = `audit_logs_${company.id}`;
    if (!silent) {
      const cached = getCachedData<AuditLogRecord[]>(cacheKey);
      if (cached) {
        setLogs(cached);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }

    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(150);

      if (error) throw error;
      const list = (data as AuditLogRecord[]) || [];
      setLogs(list);
      setCachedData(cacheKey, list);
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (company?.id) {
      loadAuditLogs();
    }
  }, [company?.id]);

  const getActionLabel = (type: string) => {
    const map: Record<string, { ar: string; en: string; color: string }> = {
      request_approved: {
        ar: "اعتماد طلب",
        en: "Request Approved",
        color: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      },
      request_rejected: {
        ar: "رفض طلب",
        en: "Request Rejected",
        color: "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      },
      employee_transferred: {
        ar: "نقل فرع",
        en: "Branch Transfer",
        color: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
      },
      bulk_update: {
        ar: "تعديل جماعي",
        en: "Bulk Update",
        color: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      },
      employee_updated: {
        ar: "تعديل موظف",
        en: "Employee Updated",
        color: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      },
      branch_updated: {
        ar: "تحديث فرع",
        en: "Branch Updated",
        color: "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800",
      },
      announcement_sent: {
        ar: "نشر تعميم",
        en: "Announcement Sent",
        color: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      },
    };
    const item = map[type] || {
      ar: type,
      en: type,
      color: "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200",
    };
    return { label: language === "ar" ? item.ar : item.en, color: item.color };
  };

  const getRoleLabel = (role: string | null) => {
    if (role === "branch_supervisor") return language === "ar" ? "مشرف فرع" : "Supervisor";
    if (role === "super_admin") return language === "ar" ? "مالك المنصة" : "Super Admin";
    return language === "ar" ? "مدير الشركة" : "Company Admin";
  };

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== "all" && log.action_type !== actionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (log.actor_name || "").toLowerCase().includes(q) ||
        (log.target_summary || "").toLowerCase().includes(q) ||
        log.action_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 font-cairo" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>{language === "ar" ? "سجل نشاطات الإدارة (Audit Log)" : "Management Audit Log"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {language === "ar"
              ? "سجل رقابي زمني لكافة قرارات المديرين والمشرفين في المنشأة."
              : "Chronological audit trail of all admin and supervisor actions."}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setRefreshing(true);
            loadAuditLogs(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          <span>{language === "ar" ? "تحديث" : "Refresh"}</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === "ar" ? "ابحث باسم المنفذ أو المستهدف..." : "Search actor or target..."}
            className="w-full ps-10 pe-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">{language === "ar" ? "جميع الإجراءات" : "All Actions"}</option>
            <option value="request_approved">{language === "ar" ? "اعتماد طلب" : "Request Approved"}</option>
            <option value="request_rejected">{language === "ar" ? "رفض طلب" : "Request Rejected"}</option>
            <option value="employee_transferred">{language === "ar" ? "نقل فرع" : "Branch Transfer"}</option>
            <option value="bulk_update">{language === "ar" ? "تعديل جماعي" : "Bulk Update"}</option>
            <option value="employee_updated">{language === "ar" ? "تعديل موظف" : "Employee Updated"}</option>
            <option value="announcement_sent">{language === "ar" ? "نشر تعميم" : "Announcement Sent"}</option>
          </select>
        </div>
      </div>

      {/* Audit Log List */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 text-xs text-slate-400">
          {language === "ar" ? "لا توجد سجلات نشاطات مطابقة." : "No matching audit logs."}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold">
                <tr>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "المنفذ" : "Actor"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "الإجراء" : "Action"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "التفاصيل / المستهدف" : "Target"}</th>
                  <th className="py-3 px-4 text-start">{language === "ar" ? "الوقت والتاريخ" : "Timestamp"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredLogs.map((log) => {
                  const actionMeta = getActionLabel(log.action_type);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {log.actor_name || "--"}
                        </div>
                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400">
                          {getRoleLabel(log.actor_role)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${actionMeta.color}`}>
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {log.target_summary || "--"}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(log.created_at).toLocaleString(language === "ar" ? "ar-SA" : "en-US", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
