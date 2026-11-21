"use client";

import React, { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { CompanyDashboardContext } from "./layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
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
} from "lucide-react";

export default function DashboardOverviewPage() {
  const { company, profile, loading: contextLoading } = useContext(CompanyDashboardContext);
  const { t, dir } = useLanguage();
  const supabase = createClient();

  const [branchesCount, setBranchesCount] = useState<number>(0);
  const [employeesCount, setEmployeesCount] = useState<number>(0);
  const [shiftsCount, setShiftsCount] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  useEffect(() => {
    async function loadStats() {
      if (!company?.id) return;
      try {
        // Run count queries in parallel for instant load
        const [bRes, eRes, sRes] = await Promise.all([
          supabase
            .from("branches")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
          supabase
            .from("shift_templates")
            .select("*", { count: "exact", head: true })
            .eq("company_id", company.id),
        ]);

        setBranchesCount(bRes.count || 0);
        setEmployeesCount(Math.max(0, (eRes.count || 1) - 1));
        setShiftsCount(sRes.count || 0);
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
    </div>
  );
}
