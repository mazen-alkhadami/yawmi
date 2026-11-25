"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Printer, X, MapPin, Briefcase, BadgeCheck, Building2 } from "lucide-react";

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
  companyLogoUrl?: string | null;
  branchName?: string | null;
  accentColor?: string | null;
}

export function DigitalIdModal({
  isOpen,
  onClose,
  employee,
  companyName,
  companyLogoUrl,
  branchName,
  accentColor,
}: DigitalIdModalProps) {
  const { dir, language } = useLanguage();

  if (!isOpen || !employee) return null;

  const employeeCode = `EMP-${employee.id.slice(0, 8).toUpperCase()}`;
  const qrValue = `YAWMI:EMP:${employee.id}`;
  const primary = accentColor || "#4F46E5";

  return (
    <>
      {/* Exact physical 5.6cm x 8.6cm print rules */}
      <style jsx global>{`
        @media print {
          @page {
            size: 5.6cm 8.6cm;
            margin: 0;
          }
          body * {
            visibility: hidden !important;
          }
          #smart-digital-id-card,
          #smart-digital-id-card * {
            visibility: visible !important;
          }
          #smart-digital-id-card {
            position: fixed !important;
            inset: 0 !important;
            width: 5.6cm !important;
            height: 8.6cm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[110] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 font-cairo print:bg-transparent print:p-0"
        dir={dir}
      >
        <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-transparent">
          {/* Modal Header (hidden on print) */}
          <div className="no-print print:hidden flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4" style={{ color: primary }} />
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

          {/* Printable 5.6cm x 8.6cm ID Card */}
          <div className="p-5 flex justify-center print:p-0">
            <div
              id="smart-digital-id-card"
              style={{
                width: "5.6cm",
                height: "8.6cm",
                background: `linear-gradient(160deg, ${primary} 0%, #0f172a 100%)`,
              }}
              className="rounded-2xl overflow-hidden text-white shadow-xl flex flex-col justify-between border border-white/15"
            >
              {/* Company-only Header (Zero Yawmi branding) */}
              <div className="px-3 py-2.5 bg-white/10 backdrop-blur-sm flex items-center justify-between gap-2 border-b border-white/15 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {companyLogoUrl ? (
                    <img
                      src={companyLogoUrl}
                      alt={companyName || "Company Logo"}
                      className="w-6 h-6 rounded-md object-cover bg-white shrink-0 border border-white/20"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center shrink-0">
                      <Building2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <span className="text-[11px] font-extrabold tracking-wide truncate">
                    {companyName || (language === "ar" ? "بطاقة موظف" : "Employee ID")}
                  </span>
                </div>
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 shrink-0">
                  {language === "ar" ? "معتمد" : "ACTIVE"}
                </span>
              </div>

              {/* Employee Details */}
              <div className="px-3 py-2.5 text-center flex-1 flex flex-col items-center justify-center gap-1.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center text-lg font-black shadow-inner">
                  {employee.full_name?.charAt(0) || "U"}
                </div>

                <div className="space-y-0.5 max-w-full">
                  <h3 className="text-sm font-extrabold leading-tight truncate px-1">
                    {employee.full_name}
                  </h3>
                  <p className="text-[10px] text-white/80 flex items-center justify-center gap-1 truncate">
                    <Briefcase className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">
                      {employee.job_title || (language === "ar" ? "موظف" : "Employee")}
                    </span>
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-semibold text-white/90 max-w-full">
                  <MapPin className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                  <span className="truncate">
                    {branchName || (language === "ar" ? "الفرع الرئيسي" : "Main Branch")}
                  </span>
                </div>
              </div>

              {/* Verification QR Code at Bottom */}
              <div className="pb-3 pt-1 flex flex-col items-center shrink-0">
                <div className="p-1.5 bg-white rounded-xl shadow-md">
                  <QRCodeSVG value={qrValue} size={78} level="M" includeMargin={false} />
                </div>
                <span className="mt-1.5 font-mono text-[9px] tracking-widest text-white/80 font-bold">
                  {employeeCode}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Print Action (hidden on print) */}
          <div className="no-print print:hidden px-5 pb-5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              style={{ backgroundColor: primary }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition hover:opacity-90"
            >
              <Printer className="w-4 h-4" />
              <span>{language === "ar" ? "طباعة البطاقة (5.6×8.6 سم)" : "Print ID Card"}</span>
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
    </>
  );
}
