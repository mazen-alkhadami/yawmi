"use client";

import React from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck, ArrowRight, ArrowLeft, Lock, CheckCircle2, MapPin, Smartphone, Camera } from "lucide-react";

export default function PrivacyPolicyPage() {
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-cairo">
      {/* Header */}
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center mx-auto mb-3 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "سياسة الخصوصية وحماية البيانات" : "Privacy Policy"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === "ar"
              ? "متوافقة تماماً مع نظام حماية البيانات الشخصية السعودي (PDPL)"
              : "Fully Compliant with the Saudi Personal Data Protection Law (PDPL)"}
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6 text-sm leading-relaxed">
          {language === "ar" ? (
            <>
              <section className="space-y-2">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. التزامنا بحماية الخصوصية (نظام PDPL)</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  تلتزم منصة <strong>يَومي (Yawmi)</strong> بحماية خصوصية وأمان البيانات الشخصية لجميع منسوبي الشركات المشتركة، وفقاً لأحكام <strong>نظام حماية البيانات الشخصية (PDPL)</strong> الصادر بالمرسوم الملكي رقم (م/19) ولائحته التنفيذية في المملكة العربية السعودية. لا نقوم ببيع أو تأجير أي بيانات شخصية لأي طرف ثالث على الإطلاق.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. البيانات التي نقوم بمعالجتها وأسباب جمعها</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                      <MapPin className="w-4 h-4" />
                      <span>بيانات الموقع الجغرافي (GPS)</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      تُعالج إحداثيات الموقع حصرياً ولحظياً أثناء الضغط على زر الحضور أو الانصراف للتحقق من تواجد الموظف داخل النطاق الجغرافي المعتمد للفرع. <strong>المنصة لا تقوم بأي تتبع مستمر لموقع الموظف خارج لحظة تسجيل الحضور.</strong>
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                      <Smartphone className="w-4 h-4" />
                      <span>معرّف الجهاز (Device ID)</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      يتم توليد معرف رقمي مشفر وفريد لجهاز الموظف الذكي لربط حسابه بجهازه الشخصي المعتمد ومنع تسجيل الحضور بالنيابة من أجهزة غير مصرح لها.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs">
                      <Camera className="w-4 h-4" />
                      <span>التحقق البصري (Selfie)</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      في الفروع التي تشترط التقاط صورة سيلفي لحظية، تُحفظ الصورة مشفرة ضمن سجل الحضور لتمكين مدير المنشأة من التحقق اليدوي عند الحاجة.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. حقوق صاحب البيانات الشخصية</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  بموجب نظام حماية البيانات الشخصية السعودي، يتمتع الموظفون بالحقوق التالية:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 ps-2">
                  <li>الحق في العلم بالمسوغ النظامي والغرض من جمع البيانات الشخصية.</li>
                  <li>الحق في الوصول إلى سجلات الحضور والتقارير الخاصة به عبر تطبيق الموظف (/app).</li>
                  <li>الحق في تصحيح وتحديث البيانات الشخصية غير الدقيقة بالتنسيق مع إدارة المنشأة.</li>
                  <li>الحق في إتلاف البيانات بعد انتهاء الغرض من جمعها وفق الضوابط النظامية لحفظ السجلات العمالية.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4. أمن البيانات والتشفير</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  تُخزن جميع البيانات في بيئات سحابية مؤمنة بأحدث معايير التشفير أثناء النقل (TLS 1.3) وأثناء التخزين (AES-256)، مع تفعيل سياسات الأمان على مستوى الصفوف (Row Level Security) لمنع أي وصول غير مصرح به.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Saudi PDPL Compliance</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  <strong>Yawmi (يَومي)</strong> is dedicated to safeguarding personal data in strict compliance with the <strong>Saudi Personal Data Protection Law (PDPL)</strong> enacted by Royal Decree No. (M/19). We never sell, lease, or share personal data with third-party marketers.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. Data Categories & Purpose of Processing</span>
                </h2>
                <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 ps-2">
                  <li>
                    <strong>GPS Coordinates:</strong> Processed instantaneously and strictly at the moment of Check-in/Check-out to confirm proximity to the authorized workplace geofence. Yawmi does NOT continuously track location outside these actions.
                  </li>
                  <li>
                    <strong>Device Identifier (UUID):</strong> Used to enforce single-device pairing and eliminate proxy attendance.
                  </li>
                  <li>
                    <strong>Verification Selfies:</strong> Optionally captured where required by company branch settings, encrypted and accessible solely to authorized company managers.
                  </li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. Security & Row Level Isolation</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  All communications and stored databases are secured using industry-standard TLS 1.3 and AES-256 encryption with PostgreSQL Row Level Security (RLS) guaranteeing strict multi-tenant boundary isolation.
                </p>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        يَومي | Yawmi &bull; {language === "ar" ? "جميع الحقوق محفوظة © 2026" : "All Rights Reserved © 2026"}
      </footer>
    </div>
  );
}
