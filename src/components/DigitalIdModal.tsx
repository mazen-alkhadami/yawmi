"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { YawmiLogo } from "@/components/yawmi-logo";
import { useLanguage } from "@/contexts/LanguageContext";
import { Printer, X, MapPin, Briefcase, BadgeCheck } from "lucide-react";

interface DigitalIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: {
    id: string;
    full_name: string;
    job_title?: string | null;
    national_id?: string | null;
    phone?: string | null;
    status?: string;
  };
  companyName?: string | null;
  branchName?: string | null;
}

export function DigitalIdModal({
  isOpen,
  onClose,
  employee,
  companyName,
  branchName,
}: DigitalIdModalProps) {
  const { dir, language } = useLanguage();

  if (!isOpen || !employee) return null;

  const employeeCode = `YWM-${employee.id.slice(0, 8).toUpperCase()}`;
  const qrValue = `YAWMI:EMP:${employee.id}`;

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 font-cairo"
      dir={dir}
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden print:shadow-none print:border print:border-slate-300">
        {/* Modal Header (hidden on print) */}
        <div className="no-print print:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
            <BadgeCheck className="w-4 h-4 text-indigo-600" />
            <span>{language === "ar" ? "بطاقة الموظف الذكية" : "Smart Employee Digital ID"}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable ID Card Body */}
        <div className="p-5">
          <div className="rounded-2xl overflow-hidden border border-indigo-200 dark:border-indigo-800/80 bg-gradient-to-b from-indigo-700 via-indigo-800 to-slate-900 text-white shadow-lg print:shadow-none">
            {/* Top Brand Strip */}
            <div className="px-4 py-3 bg-white/10 backdrop-blur-sm flex items-center justify-between border-b border-white/15">
              <div className="flex items-center gap-2">
                <YawmiLogo size="sm" showText={false} />
                <span className="text-xs font-extrabold tracking-wide truncate max-w-[160px]">
                  {companyName || "يَومي | Yawmi"}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                {language === "ar" ? "موظف معتمد" : "VERIFIED"}
              </span>
            </div>

            {/* Avatar + Name + Details */}
            <div className="p-5 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-white/15 border-2 border-white/30 mx-auto flex items-center justify-center text-2xl font-black shadow-inner">
                {employee.full_name?.charAt(0) || "U"}
              </div>

              <div>
                <h3 className="text-lg font-extrabold leading-snug">{employee.full_name}</h3>
                <p className="text-xs text-indigo-200 flex items-center justify-center gap-1 mt-0.5">
                  <Briefcase className="w-3 h-3" />
                  <span>{employee.job_title || (language === "ar" ? "موظف" : "Employee")}</span>
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-indigo-100">
                <MapPin className="w-3 h-3 text-emerald-300" />
                <span>{branchName || (language === "ar" ? "الفرع الرئيسي" : "Main Branch")}</span>
              </div>

              {/* Scannable Employee QR Code */}
              <div className="pt-2 flex flex-col items-center">
                <div className="p-2.5 bg-white rounded-2xl shadow-md">
                  <QRCodeSVG value={qrValue} size={116} level="M" includeMargin={false} />
                </div>
                <span className="mt-2 font-mono text-[11px] tracking-widest text-indigo-200 font-bold">
                  {employeeCode}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Print Action (hidden on print) */}
        <div className="no-print print:hidden px-5 pb-5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center justify-center gap-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>{language === "ar" ? "طباعة البطاقة (PDF)" : "Print ID Card"}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {language === "ar" ? "إغلاق" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}
