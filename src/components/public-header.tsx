"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Menu,
  X,
  LogIn,
  Sparkles,
  Building2,
  QrCode,
  Award,
  FileText,
  MessageCircle,
  Printer,
} from "lucide-react";

interface PublicHeaderProps {
  showPrintAction?: boolean;
  onPrint?: () => void;
}

export function PublicHeader({ showPrintAction, onPrint }: PublicHeaderProps) {
  const { t, dir, language } = useLanguage();
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isHome = pathname === "/";
  const featuresHref = isHome ? "#features" : "/#features";
  const mockupHref = isHome ? "#mockup" : "/#mockup";
  const pricingHref = isHome ? "#pricing" : "/#pricing";
  const contactHref = isHome ? "#contact" : "/#contact";

  return (
    <>
      {/* Sticky Main Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="transition hover:opacity-95 flex items-center gap-2 shrink-0">
            <YawmiLogo size="md" showText={true} />
          </Link>

          {/* Desktop Navigation Anchors */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href={featuresHref} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "المميزات" : "Features"}
            </a>
            <a href={mockupHref} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "كيف يعمل؟" : "How it Works"}
            </a>
            <a href={pricingHref} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "الأسعار" : "Pricing"}
            </a>
            <Link
              href="/guide"
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition ${
                pathname === "/guide" ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""
              }`}
            >
              {language === "ar" ? "دليل الاستخدام (PDF)" : "User Guide (PDF)"}
            </Link>
            <a href={contactHref} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
              {language === "ar" ? "تواصل معنا" : "Contact"}
            </a>
          </nav>

          {/* Desktop Controls & CTAs */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            {showPrintAction && onPrint && (
              <button
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition shadow-sm"
              >
                <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{language === "ar" ? "طباعة PDF" : "Print PDF"}</span>
              </button>
            )}

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

          {/* Mobile Right Controls: Only Hamburger Toggle */}
          <div className="flex md:hidden items-center gap-2">
            {showPrintAction && onPrint && (
              <button
                onClick={onPrint}
                className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition border border-indigo-200 dark:border-indigo-800"
                title={language === "ar" ? "طباعة PDF" : "Print PDF"}
              >
                <Printer className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Robust Mobile Slide-out Drawer (Rendered outside header to guarantee z-index and no clipping) */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[100] md:hidden animate-fade-in">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div
            className={`fixed inset-y-0 ${
              dir === "rtl" ? "right-0" : "left-0"
            } w-[85%] max-w-sm bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-5 overflow-y-auto shadow-2xl z-10 transition-transform`}
          >
            {/* Drawer Header: Logo + Close */}
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
                  href={featuresHref}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span>{language === "ar" ? "المميزات الذكية" : "Features"}</span>
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                </a>
                <a
                  href={mockupHref}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span>{language === "ar" ? "كيف يعمل النظام؟" : "How it Works"}</span>
                  <QrCode className="w-4 h-4 text-emerald-500" />
                </a>
                <a
                  href={pricingHref}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span>{language === "ar" ? "باقات الأسعار" : "Pricing Plans"}</span>
                  <Award className="w-4 h-4 text-amber-500" />
                </a>
                <Link
                  href="/guide"
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                    pathname === "/guide" ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold" : ""
                  }`}
                >
                  <span>{language === "ar" ? "دليل الاستخدام (PDF)" : "User Guide (PDF)"}</span>
                  <FileText className="w-4 h-4 text-teal-500" />
                </Link>
                <a
                  href={contactHref}
                  onClick={() => setMobileDrawerOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <span>{language === "ar" ? "طلب استشارة للمنشآت" : "Contact Sales"}</span>
                  <MessageCircle className="w-4 h-4 text-purple-500" />
                </a>
              </nav>
            </div>

            {/* Optional Print Button in Drawer (if on /guide) */}
            {showPrintAction && onPrint && (
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onPrint();
                }}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 hover:bg-indigo-100 transition shadow-sm"
              >
                <Printer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>{language === "ar" ? "طباعة / حفظ كملف PDF" : "Print / Save PDF"}</span>
              </button>
            )}

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

              {/* Direct WhatsApp Contact Button */}
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
    </>
  );
}
