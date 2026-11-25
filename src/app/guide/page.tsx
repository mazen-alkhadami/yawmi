"use client";

import React from "react";
import Link from "next/link";
import { YawmiLogo } from "@/components/yawmi-logo";
import { PublicHeader } from "@/components/public-header";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatformContact } from "@/lib/usePlatformContact";
import {
  Printer,
  ArrowRight,
  ArrowLeft,
  Building2,
  QrCode,
  Smartphone,
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Clock,
  Download,
  Users,
  Mail,
} from "lucide-react";

export default function UserGuidePage() {
  const { t, dir, language } = useLanguage();
  const { whatsappUrl, supportEmail } = usePlatformContact();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-cairo">
      {/* Top Header - Hidden on Print */}
      <div className="no-print">
        <PublicHeader showPrintAction={true} onPrint={handlePrint} />
      </div>

      {/* Printable Document Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
        {/* Document Header */}
        <div className="text-center pb-8 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              {language === "ar"
                ? "دليل التشغيل والاستخدام المعتمد"
                : "Official Operating & User Guide"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white leading-relaxed">
            {language === "ar"
              ? "دليل الاستخدام الشامل لمنصة يَومي (Yawmi)"
              : "Comprehensive User Guide for Yawmi Platform"}
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {language === "ar"
              ? "دليل خطوة بخطوة يوضح تهيئة حساب المنشأة، تشغيل كشك الحضور الذكي في الفروع، تسجيل الموظفين بالـ GPS والباركود الحي، واستخراج التقارير وإغلاق الأشهر."
              : "Step-by-step documentation detailing company onboarding, branch QR kiosk setup, GPS-verified employee check-ins, and month-end reporting."}
          </p>

          <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
            <span>نسخة الدليل: v1.0.4</span>
            <span>•</span>
            <span>تاريخ الإصدار: 2026</span>
            <span>•</span>
            <span>منصة سحابية معتمدة</span>
          </div>
        </div>

        {/* Step 1: Company & Branch Setup */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              1
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>
                  {language === "ar"
                    ? "الخطوة الأولى: تسجيل المنشأة وضبط الفروع والورديات"
                    : "Step 1: Company Registration, Branches & Shifts"}
                </span>
              </h2>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  {language === "ar" ? "أ. كود انضمام الشركة" : "A. Company Invite Code"}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {language === "ar"
                    ? "بمجرد إنشاء الحساب، يولد النظام كوداً فريداً خاصاً بشركتك لمشاركته مع الموظفين للانضمام السريع."
                    : "Upon registration, a unique company code is generated for your staff to seamlessly request company access."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  {language === "ar" ? "ب. إضافة الفروع وGPS" : "B. Add Branches & GPS"}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {language === "ar"
                    ? "حدد إحداثيات كل فرع جغرافياً ونصف قطر السياج المسموح به (مثال: 50 متراً) لضمان عدم التسجيل خارج المقر."
                    : "Configure branch coordinates and geofence radius (e.g., 50 meters) to enforce physical presence."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">
                  {language === "ar" ? "ج. إعداد الورديات والسماح" : "C. Shifts & Grace Limits"}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {language === "ar"
                    ? "عيّن مواعيد الدخول والخروج، رصيد دقائق السماح الأسبوعية قبل حساب التأخير، وسياسة ساعات العمل الإضافي."
                    : "Define start/end times, weekly grace minutes bank before late penalties, and approved overtime rules."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Branch Kiosk Setup */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              2
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <span>
                  {language === "ar"
                    ? "الخطوة الثانية: تشغيل كشك الحضور الذكي في الفرع"
                    : "Step 2: Launching the Branch Dynamic QR Kiosk"}
                </span>
              </h2>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === "ar"
                ? "يتم فتح شاشة الكشك عبر أي جهاز متصل بالإنترنت في مقر الفرع (جهاز لوحي iPad، شاشة مكتبية، أو كمبيوتر الاستقبال)."
                : "The kiosk screen runs in any web browser on a branch device (tablet, reception PC, or wall-mounted iPad)."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>{language === "ar" ? "تجدد تلقائي كل 60 ثانية" : "Auto-Refreshes Every 60s"}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {language === "ar"
                    ? "يحتوي الرمز على توقيع مشفر ومؤقت دقيق، مما يمنع نهائياً تصوير الشاشة وتناقلها عن بعد عبر واتساب بين الموظفين."
                    : "Each generated QR holds an encrypted cryptographic timestamp that expires in 60s, blocking screenshot sharing."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>{language === "ar" ? "وضع ملء الشاشة الآمن" : "Fullscreen Kiosk Mode"}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {language === "ar"
                    ? "زر تشغيل ملء الشاشة بنقرة واحدة لضمان بقاء الشاشة نشطة ومتاحة دائماً للموظفين عند المداخل."
                    : "One-click fullscreen lock keeping the display active and accessible at branch entry points."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Employee Onboarding & Check-in */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              3
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span>
                  {language === "ar"
                    ? "الخطوة الثالثة: انضمام الموظف وتسجيل الحضور بالـ GPS"
                    : "Step 3: Employee Onboarding & GPS Check-In"}
                </span>
              </h2>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <p>
                  {language === "ar"
                    ? "يدخل الموظف على رابط الانضمام (/join)، ويدخل كود الشركة، ورقم الجوال والبيانات الشخصية."
                    : "Employee navigates to /join, enters company code, phone number, and basic details."}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p>
                  {language === "ar"
                    ? "يقوم مدير المنشأة أو مشرف الفرع باعتماد الموظف وتعيين الفرع التابع له والوردية المناسبة."
                    : "Manager or branch supervisor approves the request and assigns branch and shift template."}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <p>
                  {language === "ar"
                    ? "يفتح الموظف تطبيق الهاتف (PWA) ويضغط على 'تسجيل الحضور': يتحقق النظام فورياً من تواجد هاتفه داخل السياج الجغرافي للفرع (GPS) ثم يقوم بمسح باركود الكشك ويتم توثيق الحضور فوراً."
                    : "Employee opens the mobile PWA, taps Check-In: system validates GPS location inside branch geofence, scans kiosk QR, and logs attendance instantly."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 4: Reports & Month Closing */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
              4
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-purple-600" />
                <span>
                  {language === "ar"
                    ? "الخطوة الرابعة: التقارير الشهرية، تصدير Excel، وقفل الشهر"
                    : "Step 4: Monthly Reports, Excel Export & Month Closing"}
                </span>
              </h2>
            </div>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? "تصدير متوافق 100% مع Microsoft Excel" : "100% Native Arabic Excel CSV"}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {language === "ar"
                    ? "تصدير التقارير بترميز UTF-8 مع تضمين علامة BOM لضمان فتح الأسماء العربية والأرقام بدون أي رموز مشوهة."
                    : "Export attendance sheets with UTF-8 BOM so Arabic names open cleanly in Excel without garbled characters."}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {language === "ar" ? "إغلاق وقفل الشهر المالي" : "Month-End Audit Lock"}
                </h3>
                <p className="text-slate-500 leading-relaxed">
                  {language === "ar"
                    ? "بعد تدقيق الكشوفات الشهرية، يمكن للمدير قفل الشهر لحماية كافة السجلات من أي تعديل رجعي مستقبلي."
                    : "Lock the month after payroll verification to prevent retroactive modifications and protect audit integrity."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Audit Stamp */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 text-center space-y-2 text-xs text-slate-500">
          <p className="font-bold text-slate-700 dark:text-slate-300">
            {language === "ar"
              ? "منصة يَومي (Yawmi) لإدارة الحضور والانصراف السحابي الذكي"
              : "Yawmi Smart Workforce Attendance Cloud Platform"}
          </p>
          <p>
            {language === "ar"
              ? "مصمم ليتوافق مع أنظمة العمل وحماية البيانات الشخصية (PDPL) بالمملكة العربية السعودية واليمن والخليج العربي."
              : "Compliant with Saudi Labor Regulations and PDPL Data Protection Standards across GCC."}
          </p>
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
            <span className="font-mono text-[11px] text-slate-400">https://yawmi.app</span>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition print:hidden"
              >
                <span>{language === "ar" ? "تواصل مع الدعم الفني عبر واتساب" : "Support on WhatsApp"}</span>
              </a>
            )}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition print:hidden"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "الدعم عبر البريد" : "Email Support"}</span>
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
