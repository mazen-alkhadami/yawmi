"use client";

import React from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck, ArrowRight, ArrowLeft, FileText, CheckCircle2 } from "lucide-react";

export default function TermsOfServicePage() {
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-cairo">
      {/* Header */}
      <PublicHeader />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto mb-3 border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "شروط الاستخدام والخدمة" : "Terms of Service"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {language === "ar"
              ? "آخر تحديث: نوفمبر 2026 | وثيقة ملزمة قانونياً لمنصة يومي"
              : "Last Updated: November 2026 | Legally Binding Terms for Yawmi Platform"}
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6 text-sm leading-relaxed">
          {language === "ar" ? (
            <>
              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. مقدمة وقبول الشروط</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  مرحباً بكم في منصة <strong>يَومي (Yawmi)</strong>، نظام إدارة الحضور والانصراف السحابي الذكي للشركات والمؤسسات. بتسجيلك لحساب شركة أو انضمامك كموظف، فإنك تقر بموافقتك الكاملة وغير المشروطة على الالتزام بهذه الشروط وبسياسة الخصوصية التابعة لنا.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. طبيعة الخدمة والاشتراكات السحابية (SaaS)</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  تقدم منصة يومي حلولاً رقمية لإثبات الحضور والانصراف بالاعتماد على التحقق من النطاق الجغرافي المعتمد للفرع (GPS Geofencing)، ومسح رمز الـ QR المتغير ديناميكياً كل 60 ثانية، وربط الأجهزة الذكية المعتمدة للموظف. تتوفر المنصة وفق باقات اشتراك متعددة (Starter المجانية، Pro، Business)، وتلتزم المنشأة بعدم تجاوز الحدود المعتمدة لسعة الفروع وعدد الموظفين ما لم يتم ترقية الاشتراك وسداده رسمياً.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. أمان الحسابات وعزل البيانات (Multi-Tenancy)</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  تعتمد المنصة تقنيات العزل الصارم لمستأجري النظام (Multi-Tenant Row Level Security)، بحيث تنحصر رؤية وإدارة سجلات الحضور والموظفين والتقارير المالية داخل نطاق المنشأة المالكة فقط، ولا يمكن لأي منشأة أخرى الاطلاع على بيانات المنشآت الزميلة. تقع على عاتق مدير المنشأة والمستخدمين مسؤولية الحفاظ على سرية بيانات تسجيل الدخول.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4. التزامات تسجيل الحضور ومكافحة التلاعب</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  يُحظر تماماً محاولة تزييف الإحداثيات الجغرافية (Mock GPS)، أو تصوير شاشات الأكواد ومشاركتها خارج مقر العمل، أو مشاركة الحسابات بين الموظفين. يمتلك النظام خوارزميات رصد تلقائية تلغي تسجيلات الحضور غير النظامية وتُشعر مشرف الفرع ومدير المنشأة فوراً.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>5. سداد الاشتراكات وسياسة الاسترجاع</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  تتم ترقية الاشتراكات عبر التحويل البنكي المعتمد لحساب المنصة الرسمي في المملكة العربية السعودية. يتم تفعيل الباقات فور مراجعة وتأكيد الحوالة البنكية. نظراً للطبيعة الفورية لتقديم الخدمات الرقمية، لا تخضع الاشتراكات المفعلة للاسترجاع النقدي إلا في حال ثبوت وجود خلل تقني جوهري مستمر حال دون استخدام المنصة لأكثر من 7 أيام عمل متواصلة.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>6. القانون الواجب التطبيق والاختصاص القضائي</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  تخضع هذه الشروط وتُفسر وفقاً للأنظمة واللوائح والقرارات السارية في <strong>المملكة العربية السعودية</strong>، وتختص المحاكم السعودية في مدينة الرياض بالنظر في أي نزاع قد ينشأ عن تنفيذ أو تفسير هذه الاتفاقية.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Introduction & Acceptance of Terms</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  Welcome to <strong>Yawmi (يَومي)</strong>, the smart multi-tenant cloud attendance management SaaS platform. By creating a company account or joining as an employee, you irrevocably agree to be bound by these Terms of Service and our Privacy Policy.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>2. Cloud SaaS Service & Subscription Tiers</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  Yawmi provides verifiable attendance tracking using GPS geofencing, anti-screenshot dynamic QR codes refreshing every 60 seconds, and strict single-device binding. Subscriptions are billed per tenant based on branch and employee quotas (Starter, Pro, Business).
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>3. Multi-Tenant Data Isolation & Security</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  All organizational records are strictly segregated via PostgreSQL Row Level Security (RLS). No organization can access or view another tenant&apos;s staff, shifts, or attendance records. Users are responsible for safeguarding their login credentials.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4. Prohibited Fraudulent Conduct</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  Attempting to spoof GPS coordinates, distribute QR screenshots off-site, or share credentials to register attendance remotely is strictly forbidden and constitutes breach of contract.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>5. Governing Law & Jurisdiction</span>
                </h2>
                <p className="text-slate-600 dark:text-slate-300">
                  These Terms shall be governed by and construed in accordance with the laws and regulations of the <strong>Kingdom of Saudi Arabia</strong>. Any disputes shall be submitted to the competent courts of Riyadh.
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
