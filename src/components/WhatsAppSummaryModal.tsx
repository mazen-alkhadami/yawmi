"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";

export interface SummaryStatsBlock {
  dateLabel: string;
  totalEmployees: number;
  presentCount: number;
  onTimeCount: number;
  graceCount: number;
  lateCount: number;
  absentCount: number;
  punctualityPct: number;
  topBranchName?: string;
  lateNames: string[];
  absentNames: string[];
}

interface WhatsAppSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: "ar" | "en";
  companyName?: string;
  branchName?: string;
  dailyStats: SummaryStatsBlock;
  weeklyStats: SummaryStatsBlock;
}

export function WhatsAppSummaryModal({
  isOpen,
  onClose,
  language = "ar",
  companyName = "",
  branchName,
  dailyStats,
  weeklyStats,
}: WhatsAppSummaryModalProps) {
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const [includeNames, setIncludeNames] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const activeStats = period === "daily" ? dailyStats : weeklyStats;

  const formattedText = useMemo(() => {
    const scopeTitle = branchName
      ? `${companyName ? `${companyName} - ` : ""}${branchName}`
      : companyName || (language === "ar" ? "المنشأة" : "Company");
    const periodTitle =
      period === "daily"
        ? language === "ar"
          ? "ملخص الحضور اليومي"
          : "Daily Attendance Summary"
        : language === "ar"
        ? "ملخص الحضور الأسبوعي"
        : "Weekly Attendance Summary";

    const lines: string[] = [
      `📊 *${periodTitle}*`,
      `🏢 ${scopeTitle}`,
      `📅 ${activeStats.dateLabel}`,
      ``,
      `✅ ${language === "ar" ? "الحضور" : "Present"}: ${activeStats.presentCount} / ${activeStats.totalEmployees}`,
      `🟢 ${language === "ar" ? "في الموعد" : "On Time"}: ${activeStats.onTimeCount}`,
      `🟡 ${language === "ar" ? "فترة السماح" : "Grace Period"}: ${activeStats.graceCount}`,
      `🟠 ${language === "ar" ? "المتأخرون" : "Late"}: ${activeStats.lateCount}`,
      `🔴 ${language === "ar" ? "الغياب" : "Absent"}: ${activeStats.absentCount}`,
      `🎯 ${language === "ar" ? "نسبة الالتزام" : "Punctuality"}: ${activeStats.punctualityPct}%`,
    ];

    if (activeStats.topBranchName) {
      lines.push(
        `🏆 ${language === "ar" ? "أفضل فرع التزاماً" : "Top Branch"}: ${activeStats.topBranchName}`
      );
    }

    if (includeNames) {
      if (activeStats.lateNames.length > 0) {
        lines.push(``);
        lines.push(
          `⏰ *${language === "ar" ? "المتأخرون" : "Late Employees"}:* ${activeStats.lateNames.join("، ")}`
        );
      }
      if (activeStats.absentNames.length > 0) {
        lines.push(
          `❌ *${language === "ar" ? "الغائبون" : "Absent Employees"}:* ${activeStats.absentNames.join("، ")}`
        );
      }
    }

    return lines.join("\n");
  }, [activeStats, branchName, companyName, includeNames, language, period]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 font-cairo"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-emerald-50/60 dark:bg-emerald-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {language === "ar" ? "مولّد ملخص الواتساب" : "WhatsApp Summary Generator"}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === "ar" ? "انسخ أو شارك ملخص الحضور بضغطة زر" : "Copy or share attendance report instantly"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Period Toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPeriod("daily")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                  period === "daily"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {language === "ar" ? "ملخص يومي" : "Daily"}
              </button>
              <button
                type="button"
                onClick={() => setPeriod("weekly")}
                className={`px-3.5 py-1.5 rounded-lg font-bold transition ${
                  period === "weekly"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {language === "ar" ? "ملخص أسبوعي" : "Weekly"}
              </button>
            </div>

            {/* Include Names Toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {language === "ar" ? "إظهار أسماء المتأخرين والغائبين" : "Include Late/Absent Names"}
              </span>
              <input
                type="checkbox"
                checked={includeNames}
                onChange={(e) => setIncludeNames(e.target.checked)}
                className="sr-only peer"
              />
              <div className="relative w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
            </label>
          </div>

          {/* Live Text Preview */}
          <pre className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-cairo whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 text-xs max-h-64 overflow-y-auto">
            {formattedText}
          </pre>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-900/90">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? (language === "ar" ? "تم النسخ ✓" : "Copied ✓") : (language === "ar" ? "نسخ الملخص" : "Copy Summary")}</span>
          </button>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(formattedText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "مشاركة عبر واتساب" : "Share on WhatsApp"}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
