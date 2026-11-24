"use client";

import React, { useState } from "react";
import Link from "next/link";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  QrCode,
  MapPin,
  Smartphone,
  CalendarClock,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  LogIn,
  UserPlus,
  Sparkles,
  Lock,
  Clock,
  Mail,
  Check,
  Award,
  FileText,
  Download,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";

/**
 * Custom Animated Cartoon Mascot for Yawmi
 * Shows a friendly employee holding a smartphone scanning a glowing QR code with floating checkmark
 */
function YawmiMascot({ lang }: { lang: "ar" | "en" }) {
  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Background Soft Glow */}
      <div className="absolute w-56 h-56 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Mascot Animated Character */}
      <div className="relative animate-mascot-float w-64 h-64 sm:w-72 sm:h-72">
        <svg
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xl"
        >
          {/* Base Platform Shadow */}
          <ellipse cx="150" cy="275" rx="90" ry="14" fill="#000000" fillOpacity="0.08" />

          {/* Character Body / Torso */}
          <path
            d="M95 270 C95 210, 115 190, 150 190 C185 190, 205 210, 205 270 Z"
            fill="url(#shirtGrad)"
          />

          {/* Shirt Collar & Buttons */}
          <path
            d="M135 190 L150 215 L165 190 Z"
            fill="#FFFFFF"
            fillOpacity="0.9"
          />
          <circle cx="150" cy="230" r="3" fill="#FFFFFF" fillOpacity="0.8" />
          <circle cx="150" cy="246" r="3" fill="#FFFFFF" fillOpacity="0.8" />

          {/* Neck */}
          <rect x="138" y="165" width="24" height="28" rx="6" fill="#F8CBA6" />

          {/* Head & Face */}
          <ellipse cx="150" cy="135" rx="36" ry="40" fill="#FCD5B5" />

          {/* Friendly Hair */}
          <path
            d="M114 130 C112 95, 130 85, 150 85 C172 85, 188 95, 186 130 C180 105, 165 98, 150 100 C135 98, 120 105, 114 130 Z"
            fill="#2D3748"
          />

          {/* Cheerful Eyes */}
          <ellipse cx="138" cy="132" rx="4.5" ry="5.5" fill="#1A202C" />
          <circle cx="136" cy="130" r="1.5" fill="#FFFFFF" />
          <ellipse cx="162" cy="132" rx="4.5" ry="5.5" fill="#1A202C" />
          <circle cx="160" cy="130" r="1.5" fill="#FFFFFF" />

          {/* Eyebrows */}
          <path d="M132 122 C135 120, 142 121, 144 123" stroke="#2D3748" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M156 123 C158 121, 165 120, 168 122" stroke="#2D3748" strokeWidth="2.5" strokeLinecap="round" />

          {/* Warm Smile */}
          <path
            d="M141 150 Q150 160 159 150"
            stroke="#C53030"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Cheeks Glow */}
          <circle cx="130" cy="142" r="5" fill="#FEB2B2" fillOpacity="0.5" />
          <circle cx="170" cy="142" r="5" fill="#FEB2B2" fillOpacity="0.5" />

          {/* Right Arm & Hand Holding Phone */}
          <path
            d="M185 220 Q215 210 210 180"
            stroke="url(#shirtGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
          />

          {/* Hand holding phone */}
          <circle cx="210" cy="178" r="11" fill="#F8CBA6" />

          {/* Smartphone */}
          <rect
            x="195"
            y="135"
            width="34"
            height="62"
            rx="8"
            fill="#1E293B"
            stroke="#475569"
            strokeWidth="2"
            transform="rotate(-8 212 166)"
          />
          {/* Phone Screen with glowing attendance app */}
          <rect
            x="199"
            y="141"
            width="26"
            height="50"
            rx="5"
            fill="#0F172A"
            transform="rotate(-8 212 166)"
          />
          <circle cx="212" cy="160" r="6" fill="#10B981" />
          <rect x="206" y="172" width="12" height="3" rx="1.5" fill="#4F46E5" />

          {/* Light Scan Beam emanating from phone */}
          <path
            d="M205 155 L65 100 L85 170 Z"
            fill="url(#scanBeamGrad)"
            className="animate-scan-beam"
          />

          {/* Floating 3D QR Code */}
          <g transform="translate(42, 95)">
            <rect
              width="58"
              height="58"
              rx="12"
              fill="#FFFFFF"
              stroke="#6366F1"
              strokeWidth="3"
              filter="drop-shadow(0px 8px 16px rgba(99, 102, 241, 0.3))"
            />
            {/* QR Pattern Representation */}
            <rect x="8" y="8" width="16" height="16" rx="3" fill="#1E1B4B" />
            <rect x="12" y="12" width="8" height="8" rx="1" fill="#FFFFFF" />
            <rect x="34" y="8" width="16" height="16" rx="3" fill="#1E1B4B" />
            <rect x="38" y="12" width="8" height="8" rx="1" fill="#FFFFFF" />
            <rect x="8" y="34" width="16" height="16" rx="3" fill="#1E1B4B" />
            <rect x="12" y="38" width="8" height="8" rx="1" fill="#FFFFFF" />
            <circle cx="38" cy="38" r="3.5" fill="#4F46E5" />
            <rect x="44" y="44" width="6" height="6" rx="1" fill="#10B981" />
          </g>

          {/* Floating Success Checkmark Bubble */}
          <g className="animate-check-float" transform="translate(50, 48)">
            <circle cx="20" cy="20" r="18" fill="#10B981" filter="drop-shadow(0px 4px 10px rgba(16, 185, 129, 0.4))" />
            <path
              d="M13 20 L18 25 L27 15"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* Gradients */}
          <defs>
            <linearGradient id="shirtGrad" x1="95" y1="190" x2="205" y2="270" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4F46E5" />
              <stop offset="1" stopColor="#312E81" />
            </linearGradient>
            <linearGradient id="scanBeamGrad" x1="205" y1="155" x2="70" y2="135" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34D399" stopOpacity="0.45" />
              <stop offset="1" stopColor="#34D399" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Mascot Caption */}
      <div className="mt-2 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>{lang === "ar" ? "تسجيل حضور فوري خلال ثانيتين!" : "Instant Check-In in 2 Seconds!"}</span>
        </span>
      </div>
    </div>
  );
}

export default function MarketingLandingPage() {
  const { t, dir, language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const features = [
    {
      icon: QrCode,
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
      titleAr: "كشك باركود حي يتجدد كل 60 ثانية",
      titleEn: "Dynamic 60s QR Kiosk Display",
      descAr: "شاشة باركود مشفرة تتجدد تلقائياً كل دقيقة على شاشة الفرع أو الجهاز اللوحي، لمنع تصوير الشاشة وتناقلها بين الموظفين نهائياً.",
      descEn: "Live encrypted QR code auto-refreshes every 60 seconds on the kiosk tablet, completely preventing screenshot sharing and remote fraud.",
    },
    {
      icon: MapPin,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
      titleAr: "سياج جغرافي فائق الدقة (GPS)",
      titleEn: "Precision GPS Geofencing",
      descAr: "تحقق لحظي من تواجد الموظف داخل محيط الفرع دون تتبع مستمر خارج أوقات التسجيل، متوافق 100% مع نظام حماية البيانات الشخصية السعودي.",
      descEn: "Instant ephemeral location check ensuring the employee is within branch radius without continuous tracking, fully compliant with Saudi PDPL.",
    },
    {
      icon: Smartphone,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
      titleAr: "ربط الجهاز الحصري ورقم PIN سريع",
      titleEn: "Device Binding & Quick PIN",
      descAr: "ربط حساب الموظف بجهازه الشخصي فقط لمنع تسجيل الحضور بالنيابة، مع دعم تسجيل الدخول السريع برقم سري أو القياسات الحيوية.",
      descEn: "Binds each employee to their single registered device to eliminate buddy punching, featuring fast biometric or 4-digit PIN authentication.",
    },
    {
      icon: CalendarClock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
      titleAr: "ورديات مرنة، سماح أسبوعي، وحساب إضافي",
      titleEn: "Flexible Shifts & Auto Overtime",
      descAr: "فترات عمل صباحية ومسائية، رصيد أسبوعي لدقائق السماح قبل احتساب التأخير، واحتساب ساعات العمل الإضافي المعتمدة بدقة متناهية.",
      descEn: "Support for single & split shifts, weekly grace minute bank before late penalties, and automated approved overtime calculations.",
    },
    {
      icon: Users,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
      titleAr: "سير عمل الطلبات وبوابة مشرفي الفروع",
      titleEn: "Requests Engine & Supervisor Portal",
      descAr: "تقديم واعتماد طلبات الإجازات والاستئذان والتعديل اليدوي، مع صلاحيات مخصصة لكل مشرف فرع لمتابعة فريقه فورياً.",
      descEn: "Complete workflow for leave, permission, manual log adjustments, and salary confirmations with tailored supervisor branch permissions.",
    },
    {
      icon: FileSpreadsheet,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800",
      titleAr: "تقارير شهرية وإغلاق مالي بنقرة زر",
      titleEn: "1-Click Monthly Reports & Month Closing",
      descAr: "تصدير فوري لكشوفات الحضور بصيغة Excel (UTF-8 مع دعم العربية) وPDF للطباعة، مع ميزة قفل الشهر لحماية السجلات من التغيير.",
      descEn: "Instant export of attendance sheets to Excel CSV with native UTF-8 Arabic support and printable PDF, with audit month-closing lock.",
    },
  ];

  const pricingPlans = [
    {
      id: "starter",
      nameAr: "الباقة الأساسية",
      nameEn: "Starter Plan",
      badgeAr: "مجانية للأبد",
      badgeEn: "Free Forever",
      priceMonthly: 0,
      priceYearly: 0,
      descAr: "مثالية للمتاجر الناشئة والفرق الصغيرة لتجربة نظام الحضور بدون أي تكاليف.",
      descEn: "Perfect for startups and small boutique shops starting with smart attendance.",
      featuresAr: [
        "فرع واحد رئيسي",
        "حتى 5 موظفين",
        "كشك الباركود الحي المتجدد (60 ثانية)",
        "التحقق الجغرافي الذكي (GPS)",
        "تطبيق ويب PWA لجميع الهواتف",
        "سجلات الحضور الفورية",
        "دعم فني عبر البريد الإلكتروني",
      ],
      featuresEn: [
        "1 Branch",
        "Up to 5 Employees",
        "Dynamic 60s QR Kiosk",
        "Precision GPS Geofencing",
        "Mobile PWA for All Phones",
        "Real-time Attendance Logs",
        "Standard Email Support",
      ],
      buttonAr: "ابدأ مجاناً الآن",
      buttonEn: "Start Free Now",
      popular: false,
    },
    {
      id: "pro",
      nameAr: "الباقة المتقدمة",
      nameEn: "Pro Business",
      badgeAr: "الأكثر طلباً وملاءمة",
      badgeEn: "Most Popular",
      priceMonthly: 149,
      priceYearly: 1490,
      descAr: "الخيار الأمثل للشركات والمؤسسات المتوسطة التي تدير عدة فروع ومجموعات عمل.",
      descEn: "The premier solution for growing companies managing multi-branch operations.",
      featuresAr: [
        "حتى 5 فروع تشغيلية",
        "حتى 50 موظفاً",
        "جميع ميزات الباقة الأساسية",
        "نظام الورديات المتعددة ودقائق السماح",
        "بوابة مستقلة لمشرفي الفروع",
        "سير عمل الطلبات والاستئذان والإجازات",
        "تصدير تقارير إكسل (UTF-8) وPDF",
        "دعم فني سريع وأولوية عالية",
      ],
      featuresEn: [
        "Up to 5 Branches",
        "Up to 50 Employees",
        "Everything in Starter Plan",
        "Flexible Shifts & Weekly Grace",
        "Dedicated Branch Supervisor Portal",
        "Requests, Leave & Manual Edits",
        "Excel (UTF-8) & PDF Exports",
        "Priority Fast-Response Support",
      ],
      buttonAr: "اشترك في الباقة المتقدمة",
      buttonEn: "Get Pro Plan",
      popular: true,
    },
    {
      id: "business",
      nameAr: "باقة المنشآت الكبرى",
      nameEn: "Enterprise",
      badgeAr: "سعة غير محدودة",
      badgeEn: "Unlimited Scale",
      priceMonthly: 399,
      priceYearly: 3990,
      descAr: "حل مؤسسي شامل لسلاسل المتاجر، المصانع، والشركات ذات الفروع الواسعة.",
      descEn: "End-to-end corporate solution for retail chains, factories, and nationwide enterprises.",
      featuresAr: [
        "فروع تشغيلية غير محدودة",
        "سعة موظفين مفتوحة (حتى 999+)",
        "جميع ميزات باقة Pro",
        "ميزة إغلاق وقفل الشهور المالي",
        "تخصيص الهوية والشعار المؤسسي",
        "ربط جهاز الموظف مع سجل تدقيق متقدم",
        "مدير حساب مخصص واتفاقية مستوى خدمة 99.9%",
        "استشارات تهيئة وتدريب الفريق",
      ],
      featuresEn: [
        "Unlimited Operating Branches",
        "Unlimited Staff (up to 999+)",
        "Everything in Pro Plan",
        "Month-End Closing & Audit Lock",
        "Custom Corporate Branding",
        "Advanced Audit Logs & Device Binding",
        "Dedicated Account Manager & 99.9% SLA",
        "Onboarding & Team Setup Guidance",
      ],
      buttonAr: "اختر باقة المنشآت",
      buttonEn: "Choose Enterprise",
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white font-cairo">
      {/* 1. Header / Navbar */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="transition hover:opacity-95 flex items-center gap-2">
            <YawmiLogo size="md" showText={true} />
          </Link>

          {/* Desktop Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "المميزات" : "Features"}
            </a>
            <a href="#mockup" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "كيف يعمل؟" : "How it Works"}
            </a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "الأسعار" : "Pricing"}
            </a>
            <Link href="/guide" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "دليل الاستخدام (PDF)" : "User Guide (PDF)"}
            </Link>
            <a href="#contact" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "تواصل معنا" : "Contact"}
            </a>
          </nav>

          {/* Desktop Controls & CTAs */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />

            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t("login_button")}</span>
            </Link>

            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "ابدأ مجاناً" : "Start Free"}</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Open mobile menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Slide-out Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer Panel */}
            <div
              className={`fixed inset-y-0 ${
                dir === "rtl" ? "right-0" : "left-0"
              } w-[85%] max-w-sm bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto shadow-2xl z-10 transition-transform`}
            >
              {/* Header: Logo & Close */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <YawmiLogo size="md" showText={true} />
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Section 1: Navigation Links */}
              <div className="space-y-1.5 shrink-0">
                <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === "ar" ? "أقسام المنصة" : "Navigation"}
                </div>
                <nav className="flex flex-col space-y-1 font-semibold text-sm">
                  <a
                    href="#features"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <span>{language === "ar" ? "المميزات الذكية" : "Features"}</span>
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                  </a>
                  <a
                    href="#mockup"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <span>{language === "ar" ? "كيف يعمل النظام؟" : "How it Works"}</span>
                    <QrCode className="w-4 h-4 text-emerald-500" />
                  </a>
                  <a
                    href="#pricing"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <span>{language === "ar" ? "باقات الأسعار" : "Pricing Plans"}</span>
                    <Award className="w-4 h-4 text-amber-500" />
                  </a>
                  <Link
                    href="/guide"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <span>{language === "ar" ? "دليل الاستخدام (PDF)" : "User Guide (PDF)"}</span>
                    <FileText className="w-4 h-4 text-teal-500" />
                  </Link>
                  <a
                    href="#contact"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <span>{language === "ar" ? "طلب استشارة للمنشآت" : "Contact Sales"}</span>
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                  </a>
                </nav>
              </div>

              {/* Section 2: Preferences (Language & Theme) */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === "ar" ? "تخصيص العرض واللغة" : "Preferences"}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {language === "ar" ? "اللغة والمظهر" : "Language & Theme"}
                  </span>
                  <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                </div>
              </div>

              {/* Section 3: Auth & Portal Access */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === "ar" ? "تسجيل الدخول والبدء" : "Account & Onboarding"}
                </div>

                <Link
                  href="/register"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md text-sm transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{language === "ar" ? "تسجيل شركة جديدة مجاناً" : "Start Free Company"}</span>
                </Link>

                <Link
                  href="/login"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm transition"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{t("login_button")}</span>
                </Link>

                <Link
                  href="/join"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs transition"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "انضمام موظف بكود الشركة" : "Join by Company Code"}</span>
                </Link>

                {/* Direct WhatsApp Contact in Drawer */}
                <a
                  href="https://wa.me/967779628873"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-10 flex items-center justify-center gap-2 rounded-xl font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "تواصل مع الدعم عبر واتساب" : "WhatsApp Support"}</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-indigo-50/40 via-transparent to-transparent dark:from-indigo-950/20 animate-fade-in-up">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
          {/* Trust Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 mb-6 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              {language === "ar"
                ? "النظام السحابي الأذكى لإدارة حضور الموظفين للشركات والمتاجر العربية | خالي من التلاعب بنسبة 100%"
                : "The Smartest Employee Attendance SaaS for Arab Enterprises | 100% Zero-Fraud"}
            </span>
          </div>

          {/* Main Headline with generous Arabic line-height */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl leading-relaxed sm:leading-[1.4] mb-6">
            {language === "ar" ? (
              <>
                إدارة حضور وانصراف ذكية ودقيقة
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500">
                  بدون أجهزة بصمة معقدة أو تكاليف صيانة
                </span>
              </>
            ) : (
              <>
                Accurate, Fraud-Proof Attendance
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-teal-500">
                  Zero Hardware Hassle. Pure Cloud Simplicity.
                </span>
              </>
            )}
          </h1>

          {/* Subheadline with generous line-height */}
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mb-8 leading-relaxed">
            {language === "ar"
              ? "تحقق ثلاثي متكامل يجمع بين كشك الباركود الحي المتجدد كل 60 ثانية، السياج الجغرافي GPS، وربط الجهاز الحصري. مصمم خصيصاً ليتوافق مع أنظمة العمل وحماية البيانات في المملكة العربية السعودية واليمن وكافة الدول العربية."
              : "Triple-layer fraud protection combining a 60-second dynamic QR kiosk, GPS geofencing, and unique device binding. Fully compliant with modern labor regulations and PDPL privacy standards."}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12">
            <Link
              href="/register"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/35 transition text-sm sm:text-base group"
            >
              <Building2 className="w-4 h-4" />
              <span>{language === "ar" ? "ابدأ مجاناً - سجّل شركتك" : "Start Free - Register Company"}</span>
              <ArrowIcon className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/join"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 shadow-sm transition text-sm sm:text-base"
            >
              <UserPlus className="w-4 h-4 text-indigo-500" />
              <span>{language === "ar" ? "انضمام موظف بكود الشركة" : "Join as Employee by Code"}</span>
            </Link>

            <Link
              href="/guide"
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl font-bold bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition text-sm sm:text-base"
            >
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>{language === "ar" ? "تحميل دليل الاستخدام (PDF)" : "User Guide (PDF)"}</span>
            </Link>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl w-full">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">99.9%</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {language === "ar" ? "دقة تسجيل الحضور" : "Attendance Precision"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">0%</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {language === "ar" ? "نسبة التلاعب والتحايل" : "Proxy Check-in Rate"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">60s</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {language === "ar" ? "تحديث تلقائي للرمز" : "Live QR Refresh"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
              <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">100%</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                {language === "ar" ? "سحابي بدون أجهزة" : "Pure Cloud SaaS"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive UI Visual Mockup & Cartoon Mascot Section */}
      <section id="mockup" className="py-16 sm:py-24 bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-3 leading-relaxed">
              {language === "ar" ? "كيف يعمل النظام؟ تجربة سلسة للموظف والمدير" : "How it Works: Dual Seamless Experience"}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              {language === "ar"
                ? "شاهد كيف تتناغم شاشة الكشك التفاعلية في الفرع مع تطبيق الموظف الخفيف لتسجيل الحضور في ثوانٍ معدودة."
                : "See how the dynamic branch kiosk display interacts seamlessly with the lightweight mobile employee application."}
            </p>
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>{language === "ar" ? "تحميل دليل الاستخدام التفصيلي (PDF)" : "Download Detailed PDF Guide"}</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Kiosk Display Mockup (Left 7 cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden p-6 sm:p-8 relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700/80 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {language === "ar" ? "كشك الحضور - فرع المركز الرئيسي" : "Attendance Kiosk - Main Branch"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {language === "ar" ? "كود الفرع: BR-01 | سياج 50 متراً" : "Branch Code: BR-01 | 50m Geofence"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{language === "ar" ? "متصل ونشط" : "Live Kiosk"}</span>
                </div>
              </div>

              {/* QR Mockup Center */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
                <div className="p-4 bg-white rounded-2xl border-2 border-indigo-500 shadow-lg relative flex flex-col items-center">
                  {/* Pseudo QR code representation */}
                  <div className="w-36 h-36 bg-slate-900 rounded-lg p-2.5 flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-9 h-9 border-4 border-white bg-slate-900 flex items-center justify-center">
                        <div className="w-3.5 h-3.5 bg-white" />
                      </div>
                      <div className="w-9 h-9 border-4 border-white bg-slate-900 flex items-center justify-center">
                        <div className="w-3.5 h-3.5 bg-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="px-2 py-0.5 rounded bg-indigo-500 text-[8px] font-bold text-white tracking-widest font-mono">
                        YAWMI
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-9 h-9 border-4 border-white bg-slate-900 flex items-center justify-center">
                        <div className="w-3.5 h-3.5 bg-white" />
                      </div>
                      <div className="w-7 h-7 grid grid-cols-2 gap-1 p-0.5">
                        <div className="bg-white rounded-sm" />
                        <div className="bg-indigo-400 rounded-sm" />
                        <div className="bg-white rounded-sm" />
                        <div className="bg-white rounded-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-600">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {language === "ar" ? "يتجدد الرمز خلال 45 ثانية" : "Refreshes in 45s"}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-start max-w-xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
                      1
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {language === "ar"
                        ? "يفتح الموظف تطبيق يومي على هاتفه المعتمد."
                        : "Employee opens Yawmi mobile app on their phone."}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
                      2
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {language === "ar"
                        ? "يتحقق النظام فورياً من تطابق الموقع الجغرافي (GPS)."
                        : "System instantly validates GPS coordinates."}
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold">
                      3
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {language === "ar"
                        ? "مسح الكود الحي وتسجيل الحضور فوراً في ثانيتين."
                        : "Scan dynamic QR and log attendance in 2 seconds."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mascot + Mobile App Card (Right 5 cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center gap-6">
              {/* Mascot Animated Character */}
              <YawmiMascot lang={language} />

              {/* Mobile App Quick Preview Badge */}
              <div className="w-full max-w-sm bg-gradient-to-b from-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-2xl border-4 border-slate-800">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-indigo-800/60">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-slate-300">تطبيق الموظف | Mobile PWA</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">08:58 AM</span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 text-xs font-semibold mb-3">
                  <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {language === "ar"
                      ? "أنت داخل نطاق الفرع (المسافة: 12 متراً)"
                      : "Within branch perimeter (12 meters)"}
                  </span>
                </div>

                <div className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-center text-xs shadow-md flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{language === "ar" ? "مسح الكود وتسجيل الحضور" : "Scan & Check-In"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="py-16 sm:py-24 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mb-3 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "مميزات مصممة للشركات العربية" : "Engineered for Modern Arab Workplaces"}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4 leading-relaxed">
              {language === "ar"
                ? "كل ما تحتاجه لإدارة الحضور والانصراف بدقة وموثوقية"
                : "Everything You Need for Effortless Workforce Attendance"}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              {language === "ar"
                ? "تخلص من الطوابير الصباحية أمام جهاز البصمة، وتكاليف الصيانة الدورية، ومشاكل تسجيل الحضور بالنيابة عن الزملاء."
                : "Eliminate morning queues at biometric machines, hardware maintenance bills, and proxy check-ins forever."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 shadow-sm hover:shadow-md transition-all group"
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.bgColor} ${feature.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-105 border`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 leading-relaxed">
                    {language === "ar" ? feature.titleAr : feature.titleEn}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {language === "ar" ? feature.descAr : feature.descEn}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Pricing Section */}
      <section id="pricing" className="py-16 sm:py-24 bg-slate-100/60 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 leading-relaxed">
              {language === "ar" ? "باقات اشتراك واضحة ومرنة" : "Transparent, Scalable Pricing"}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {language === "ar"
                ? "ابدأ مجاناً وقم بالترقية مع نمو فريقك. بدون أي عقود طويلة الأجل أو رسوم تأسيس خفية."
                : "Start free and scale seamlessly as your team expands. No setup fees, no lock-in contracts."}
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center p-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  billingCycle === "monthly"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {language === "ar" ? "اشتراك شهري" : "Monthly Billing"}
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${
                  billingCycle === "yearly"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>{language === "ar" ? "اشتراك سنوي" : "Yearly Billing"}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold">
                  {language === "ar" ? "خصم شهرين" : "2 Mos Free"}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {pricingPlans.map((plan) => {
              const price = billingCycle === "yearly" ? plan.priceYearly : plan.priceMonthly;
              const periodLabel =
                billingCycle === "yearly"
                  ? language === "ar"
                    ? "ريال / سنوياً"
                    : "SAR / year"
                  : language === "ar"
                  ? "ريال / شهرياً"
                  : "SAR / month";

              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl p-7 flex flex-col justify-between transition-all relative ${
                    plan.popular
                      ? "bg-white dark:bg-slate-800 border-2 border-indigo-600 dark:border-indigo-500 shadow-xl scale-[1.02] z-10"
                      : "bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-600 to-teal-500 text-white text-xs font-bold shadow-md">
                      {language === "ar" ? plan.badgeAr : plan.badgeEn}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                        {language === "ar" ? plan.nameAr : plan.nameEn}
                      </h3>
                      {!plan.popular && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          {language === "ar" ? plan.badgeAr : plan.badgeEn}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                      {language === "ar" ? plan.descAr : plan.descEn}
                    </p>

                    {/* Price Header */}
                    <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-700/80">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-mono">
                          {price === 0 ? (language === "ar" ? "مجاناً" : "Free") : price}
                        </span>
                        {price > 0 && (
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            {periodLabel}
                          </span>
                        )}
                      </div>
                      {billingCycle === "yearly" && price > 0 && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                          {language === "ar"
                            ? "توفير ما يعادل شهرين مجاناً عند الدفع السنوي"
                            : "Equivalent to 2 free months with annual billing"}
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <ul className="space-y-3 mb-8">
                      {(language === "ar" ? plan.featuresAr : plan.featuresEn).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/register"
                    className={`w-full py-3 rounded-xl font-bold text-center text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                      plan.popular
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25"
                        : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white"
                    }`}
                  >
                    <span>{language === "ar" ? plan.buttonAr : plan.buttonEn}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Contact / Enterprise Banner */}
      <section id="contact" className="py-16 sm:py-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-start">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold backdrop-blur-sm">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === "ar" ? "خدمات مخصصة لكبرى المنشآت" : "Enterprise Solutions & SLA"}</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-relaxed">
                {language === "ar" ? "هل تحتاج إلى استشارة لربط فروع شركتك؟" : "Need Custom Enterprise Onboarding?"}
              </h3>
              <p className="text-sm text-indigo-200 max-w-xl leading-relaxed">
                {language === "ar"
                  ? "فريقنا المتخصص مستعد لتقديم عرض توضيحي مباشر وتصميم خطة تهيئة مخصصة تلائم حجم منشأتك وسلاسل فروعك."
                  : "Our team is ready to schedule a live product demo and build a tailored deployment roadmap for your organisation."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
              <a
                href="https://wa.me/967779628873"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-[220px] h-12 flex items-center justify-center gap-2.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition text-sm shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === "ar" ? "استشارة عبر واتساب" : "Chat on WhatsApp"}</span>
              </a>
              <Link
                href="/register"
                className="w-full sm:w-[220px] h-12 flex items-center justify-center gap-2 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition text-sm border border-indigo-400/40 shadow-md"
              >
                <span>{language === "ar" ? "ابدأ الآن" : "Start Now"}</span>
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Clean Regional Trust Footer */}
      <footer className="bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 text-xs border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Main Footer Links */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3 md:col-span-1">
              <YawmiLogo size="md" showText={true} />
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "ar"
                  ? "منصة يَومي (Yawmi) - حلول الحضور والانصراف السحابية الذكية للشركات والمؤسسات في المملكة العربية السعودية، اليمن، ودول الخليج العربي."
                  : "Yawmi - Smart Cloud Attendance Management for enterprises across Saudi Arabia, Yemen, and the GCC region."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">
                {language === "ar" ? "روابط سريعة" : "Quick Links"}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "مميزات النظام" : "Features"}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "باقات الأسعار" : "Pricing Plans"}
                  </a>
                </li>
                <li>
                  <Link href="/guide" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "دليل الاستخدام (PDF)" : "User Guide (PDF)"}
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "تسجيل الدخول" : "Login Portal"}
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "تسجيل شركة جديدة" : "Register Company"}
                  </Link>
                </li>
                <li>
                  <Link href="/join" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "انضمام موظف جديد" : "Employee Join"}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">
                {language === "ar" ? "الامتثال والوثائق القانونية" : "Legal & Compliance"}
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "شروط الاستخدام والخدمة" : "Terms of Service"}
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                    {language === "ar" ? "سياسة الخصوصية وحماية البيانات (PDPL)" : "Privacy Policy (Saudi PDPL)"}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Regional Trust Highlights */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">
                {language === "ar" ? "أمان وموثوقية المنصة" : "Trust & Reliability"}
              </h4>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                  {language === "ar" ? "سحابي 100% • بدون أجهزة أو صيانة" : "100% Cloud SaaS • Zero Hardware"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-500 shrink-0" />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                  {language === "ar" ? "تشفير كامل وأمان مصرفي للبيانات" : "Bank-Grade Encryption & Security"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold">
                  {language === "ar" ? "مصمم للشركات في السعودية واليمن والخليج" : "Engineered for Saudi, Yemen & GCC"}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start text-[11px] text-slate-500 dark:text-slate-400">
            <p>
              © {new Date().getFullYear()} يَومي | Yawmi.{" "}
              {language === "ar"
                ? "جميع الحقوق محفوظة. المنصة الذكية لإدارة الحضور والانصراف السحابي للشركات العربية."
                : "All rights reserved. The Smart Cloud Workforce Attendance Platform."}
            </p>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                Yawmi v1.0.1
              </span>
              <span>•</span>
              <Link href="/terms" className="hover:underline">
                {language === "ar" ? "الشروط" : "Terms"}
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:underline">
                {language === "ar" ? "الخصوصية" : "Privacy"}
              </Link>
              <span>•</span>
              <Link href="/guide" className="hover:underline">
                {language === "ar" ? "دليل الاستخدام" : "Guide"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
