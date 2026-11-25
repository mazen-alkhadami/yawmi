"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import { ProductTour, TourStep } from "@/components/ProductTour";
import { getCachedData, setCachedData, clearUserCache } from "@/lib/instantCache";
import { applyDynamicThemeColor } from "@/lib/themeColor";
import {
  LayoutDashboard,
  MapPin,
  CalendarClock,
  Users,
  FileCheck2,
  FileBarChart2,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  HelpCircle,
  Activity,
  ShieldCheck,
  Sparkles,
  MessageCircle,
  Mail,
  Landmark,
  Check,
  Copy,
} from "lucide-react";

export interface PlatformContactSettings {
  support_whatsapp?: string | null;
  support_email?: string | null;
  bank_transfer_details?: {
    bank_name?: string;
    account_name?: string;
    iban?: string;
    account_number?: string;
  } | null;
}

export interface CompanyContextData {
  company: {
    id: string;
    name: string;
    invite_code: string;
    plan: string;
    max_branches: number;
    max_employees: number;
    status: string;
    subscription_ends_at?: string | null;
    primary_color?: string | null;
    logo_url?: string | null;
    phone?: string | null;
    email?: string | null;
    commercial_register?: string | null;
    address?: string | null;
  } | null;
  profile: {
    id: string;
    full_name: string;
    role: string;
    company_id: string;
    supervisor_permissions?: {
      can_approve_employees?: boolean;
      can_exceed_edit_limit?: boolean;
      can_close_month?: boolean;
    };
  } | null;
  platformSettings: PlatformContactSettings | null;
  loading: boolean;
  refreshData: () => Promise<void>;
  updateCompanyLocally: (data: Partial<NonNullable<CompanyContextData["company"]>>) => void;
  openUpgradeModal: () => void;
}

export const CompanyDashboardContext = React.createContext<CompanyContextData>({
  company: null,
  profile: null,
  platformSettings: null,
  loading: true,
  refreshData: async () => {},
  updateCompanyLocally: () => {},
  openUpgradeModal: () => {},
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [platformSettings, setPlatformSettings] = useState<PlatformContactSettings | null>(null);
  const [adminTourOpen, setAdminTourOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<"pro" | "business">("pro");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [copiedBankField, setCopiedBankField] = useState<string | null>(null);

  useEffect(() => {
    if (!upgradeModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setUpgradeModalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [upgradeModalOpen]);

  const fetchSessionAndCompany = async () => {
    const cached = getCachedData<{ profile: any; company: any; platformSettings?: PlatformContactSettings | null }>("dashboard_layout");
    if (cached?.profile) {
      setProfile(cached.profile);
      setCompany(cached.company || null);
      if (cached.platformSettings) setPlatformSettings(cached.platformSettings);
      applyDynamicThemeColor(cached.company?.primary_color);
      setLoading(false);
    }

    try {
      // 1. Check local session first for fast load
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData?.session?.user?.id;

      if (!userId) {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id;
      }

      if (!userId) {
        clearUserCache();
        router.push("/login");
        return;
      }

      // 2. Fetch profile & company + platform_settings in parallel
      const [profRes, platRes] = await Promise.all([
        supabase
          .from("profiles")
          .select(`
            id, full_name, role, company_id, status, has_completed_tour,
            companies:company_id (
              id, name, invite_code, plan, max_branches, max_employees, status, subscription_ends_at,
              primary_color, logo_url, phone, email, commercial_register, address
            )
          `)
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("platform_settings")
          .select("support_whatsapp, support_email, bank_transfer_details")
          .eq("id", 1)
          .maybeSingle(),
      ]);

      const { data: prof, error: profErr } = profRes;

      if (profErr || !prof) {
        clearUserCache();
        router.push("/login");
        return;
      }

      setProfile(prof);
      const compData = (prof as any).companies || null;
      setCompany(compData);
      applyDynamicThemeColor(compData?.primary_color);

      const platData = (platRes.data as PlatformContactSettings | null) || null;
      setPlatformSettings(platData);
      setCachedData("dashboard_layout", { profile: prof, company: compData, platformSettings: platData });

      if (
        !prof.has_completed_tour &&
        typeof window !== "undefined" &&
        !localStorage.getItem(`yawmi_admin_tour_done_${prof.id}`)
      ) {
        setAdminTourOpen(true);
      }
    } catch (err) {
      console.error("Dashboard layout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyLocally = (data: Partial<NonNullable<CompanyContextData["company"]>>) => {
    setCompany((prev: any) => {
      const next = prev ? { ...prev, ...data } : null;
      if (data.primary_color !== undefined) {
        applyDynamicThemeColor(data.primary_color);
      }
      setCachedData("dashboard_layout", { profile, company: next, platformSettings });
      return next;
    });
  };

  useEffect(() => {
    fetchSessionAndCompany();
  }, []);

  const handleLogout = async () => {
    clearUserCache();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handleCompleteAdminTour = async () => {
    setAdminTourOpen(false);
    setSidebarOpen(false);
    if (profile?.id) {
      if (typeof window !== "undefined") {
        localStorage.setItem(`yawmi_admin_tour_done_${profile.id}`, "1");
      }
      try {
        await supabase
          .from("profiles")
          .update({ has_completed_tour: true })
          .eq("id", profile.id);
        setProfile((prev: any) => (prev ? { ...prev, has_completed_tour: true } : prev));
      } catch (err) {
        console.error("Error updating admin tour status:", err);
      }
    }
  };

  const navItems = [
    { href: "/dashboard", label: t("nav_overview"), icon: LayoutDashboard, tourId: "tour-nav-overview" },
    { href: "/dashboard/live", label: language === "ar" ? "الحضور المباشر" : "Live Now", icon: Activity, tourId: "tour-nav-live" },
    { href: "/dashboard/branches", label: t("nav_branches"), icon: MapPin, tourId: "tour-nav-branches" },
    { href: "/dashboard/shifts", label: t("nav_shifts"), icon: CalendarClock, tourId: "tour-nav-shifts" },
    { href: "/dashboard/employees", label: t("nav_employees"), icon: Users, tourId: "tour-nav-employees" },
    { href: "/dashboard/requests", label: t("nav_requests"), icon: FileCheck2, tourId: "tour-nav-requests" },
    { href: "/dashboard/reports", label: t("nav_reports"), icon: FileBarChart2, tourId: "tour-nav-reports" },
    { href: "/dashboard/audit-log", label: language === "ar" ? "سجل الإدارة" : "Audit Log", icon: ShieldCheck, tourId: "tour-nav-audit" },
    { href: "/dashboard/settings", label: t("nav_settings"), icon: Settings, tourId: "tour-nav-settings" },
  ];

  const adminTourSteps: TourStep[] = [
    {
      id: "admin-overview",
      targetId: pathname === "/dashboard" ? "tour-admin-overview" : undefined,
      titleAr: "لوحة المؤشرات العامة والتعميمات",
      titleEn: "Overview KPIs & Announcements",
      descAr: "تابع أعداد الفروع والموظفين والورديات وكود دعوة الشركة، وانشر التعميمات الفورية لتصل إلى تطبيقات جميع الموظفين.",
      descEn: "Monitor branches, employees, shifts, company invite code, and publish instant announcements to all staff.",
      icon: <LayoutDashboard className="w-5 h-5" />,
      onEnter: () => setSidebarOpen(false),
    },
    {
      id: "admin-branches",
      targetId: "tour-nav-branches",
      titleAr: "الفروع والباركود المزدوج والسيلفي",
      titleEn: "Branches, Dual QR & Selfie",
      descAr: "أضف فروعك وحدد السياج الجغرافي (GPS)، واختر بين الكشك الحي المتجدد كل 60 ثانية أو الباركود الثابت للطباعة، مع خيار السيلفي الإلزامي.",
      descEn: "Set branch GPS geofences, choose between 60s Dynamic Kiosk or Static Printable QR, and toggle mandatory selfie.",
      icon: <MapPin className="w-5 h-5" />,
      onEnter: () => setSidebarOpen(true),
      onLeave: () => setSidebarOpen(false),
    },
    {
      id: "admin-employees",
      targetId: "tour-nav-employees",
      titleAr: "إدارة الموظفين واستعادة كلمة المرور",
      titleEn: "Employees & Password Reset",
      descAr: "اعتمد الموظفين الجدد، عيّن الفروع والورديات والصلاحيات، وأرسل روابط استعادة كلمة المرور أو فك ربط الجهاز بنقرة واحدة.",
      descEn: "Approve new hires, assign branches and shifts, and trigger password reset links or device resets in one click.",
      icon: <Users className="w-5 h-5" />,
      onEnter: () => setSidebarOpen(true),
      onLeave: () => setSidebarOpen(false),
    },
    {
      id: "admin-requests",
      targetId: "tour-nav-requests",
      titleAr: "الطلبات وخصم رصيد الإجازات",
      titleEn: "Requests & Leave Balance Deduction",
      descAr: "راجع طلبات الإجازات والاستئذان والتعديلات اليدوية؛ وعند قبول الإجازة يتم خصم أيامها تلقائياً من رصيد الموظف السنوي.",
      descEn: "Review leave, permission, and manual edits; approving annual leave automatically deducts days from the employee balance.",
      icon: <FileCheck2 className="w-5 h-5" />,
      onEnter: () => setSidebarOpen(true),
      onLeave: () => setSidebarOpen(false),
    },
    {
      id: "admin-reports",
      targetId: "tour-nav-reports",
      titleAr: "التقارير الشهرية وإغلاق الشهر",
      titleEn: "Monthly Reports & Closing",
      descAr: "صدّر كشوف الحضور والتأخير والإضافي بصيغة Excel (UTF-8) وPDF، وأغلق الشهر لحماية السجلات من أي تعديل.",
      descEn: "Export attendance, late minutes, and overtime to Excel (UTF-8) or PDF, and lock the month for payroll audit.",
      icon: <FileBarChart2 className="w-5 h-5" />,
      onEnter: () => setSidebarOpen(true),
      onLeave: () => setSidebarOpen(false),
    },
  ];

  const brandColor = company?.primary_color || "#4F46E5";

  const isUpgradeEligible =
    !company?.plan || ["starter", "free", "basic"].includes(company.plan.toLowerCase());

  const whatsappClean = platformSettings?.support_whatsapp?.replace(/[^\d]/g, "") || "";
  const selectedPlanLabelAr = selectedUpgradePlan === "pro" ? "الباقة الاحترافية (Pro)" : "باقة المؤسسات (Enterprise)";
  const selectedPlanLabelEn = selectedUpgradePlan === "pro" ? "Pro Plan" : "Enterprise Plan";
  const selectedCycleLabelAr = selectedBillingCycle === "yearly" ? "سنوي" : "شهري";
  const selectedCycleLabelEn = selectedBillingCycle === "yearly" ? "Annual" : "Monthly";
  const selectedPriceSar =
    selectedUpgradePlan === "pro"
      ? selectedBillingCycle === "yearly"
        ? "1,990"
        : "199"
      : selectedBillingCycle === "yearly"
      ? "4,990"
      : "499";

  const upgradeMessageAr = `مرحباً، أرغب في ترقية اشتراك شركة "${company?.name || ""}" (كود: ${company?.invite_code || ""}) إلى ${selectedPlanLabelAr} — الاشتراك: ${selectedCycleLabelAr} (${selectedPriceSar} ريال).`;
  const upgradeMessageEn = `Hello, I would like to upgrade "${company?.name || ""}" (Code: ${company?.invite_code || ""}) to the ${selectedPlanLabelEn} — ${selectedCycleLabelEn} (${selectedPriceSar} SAR).`;

  const whatsappUrl = whatsappClean
    ? `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
        language === "ar" ? upgradeMessageAr : upgradeMessageEn
      )}`
    : "";
  const supportEmail = platformSettings?.support_email?.trim() || "";
  const emailOrderUrl = supportEmail
    ? `mailto:${supportEmail}?subject=${encodeURIComponent(
        language === "ar"
          ? `طلب ترقية باقة - ${company?.name || ""}`
          : `Plan Upgrade Request - ${company?.name || ""}`
      )}&body=${encodeURIComponent(language === "ar" ? upgradeMessageAr : upgradeMessageEn)}`
    : "";
  const bankDetails = platformSettings?.bank_transfer_details;
  const hasBankDetails = Boolean(
    bankDetails &&
      (bankDetails.bank_name?.trim() ||
        bankDetails.account_name?.trim() ||
        bankDetails.iban?.trim() ||
        bankDetails.account_number?.trim())
  );

  const handleCopyBank = (field: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedBankField(field);
    setTimeout(() => setCopiedBankField(null), 1800);
  };

  return (
    <CompanyDashboardContext.Provider
      value={{
        company,
        profile,
        platformSettings,
        loading,
        refreshData: fetchSessionAndCompany,
        updateCompanyLocally,
        openUpgradeModal: () => setUpgradeModalOpen(true),
      }}
    >
      <div
        className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-cairo"
        style={{ "--brand-primary": brandColor } as React.CSSProperties}
      >
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Navigation"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link href="/dashboard" className="transition hover:opacity-90">
              <YawmiLogo size="sm" showText={true} />
            </Link>

            {company && (
              <div className="hidden sm:flex items-center gap-1.5 ms-3 ps-3 border-s border-slate-200 dark:border-slate-700">
                <Building2 className="w-4 h-4 text-[var(--brand-primary)]" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {company.name}
                </span>
                <span
                  className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md border"
                  style={{
                    backgroundColor: `${brandColor}15`,
                    borderColor: `${brandColor}40`,
                    color: brandColor,
                  }}
                >
                  {company.plan}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Tour Replay Button */}
            <button
              type="button"
              onClick={() => setAdminTourOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              title={language === "ar" ? "جولة تعريفية بلوحة الإدارة" : "Admin Dashboard Tour"}
              aria-label={language === "ar" ? "جولة تعريفية بلوحة الإدارة" : "Admin Dashboard Tour"}
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <NotificationsBell companyId={company?.id} lang={language} />
            <div className="hidden lg:flex items-center gap-2">
              {isUpgradeEligible && (
                <button
                  type="button"
                  onClick={() => setUpgradeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{language === "ar" ? "ترقية الباقة" : "Upgrade Plan"}</span>
                </button>
              )}
              <LanguageToggle />
              <ThemeToggle />

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-sm"
                title={t("logout")}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{t("logout")}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Shell with Sidebar */}
        <div className="flex-1 flex overflow-hidden">
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Collapsible Sidebar */}
          <aside
            className={`
              fixed lg:static top-16 bottom-0 z-30
              w-64 bg-white dark:bg-slate-800/90 border-e border-slate-200 dark:border-slate-800
              flex flex-col justify-between py-5 px-3.5
              transition-transform duration-300 ease-in-out
              ${sidebarOpen ? "translate-x-0" : dir === "rtl" ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}
          >
            {/* Nav Links */}
            <nav className="space-y-1">
              <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("portal_company_manager")}
              </div>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    id={item.tourId}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    style={
                      isActive
                        ? {
                            backgroundColor: brandColor,
                            color: "#ffffff",
                            boxShadow: `0 4px 14px 0 ${brandColor}40`,
                          }
                        : {}
                    }
                    className={`
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all
                      ${
                        isActive
                          ? "text-white shadow-md font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-white"
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Info Card & Mobile Controls in Sidebar Bottom */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700/60 px-2 space-y-3">
              {profile && (
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase border"
                    style={{
                      backgroundColor: `${brandColor}20`,
                      borderColor: `${brandColor}50`,
                      color: brandColor,
                    }}
                  >
                    {profile.full_name?.charAt(0) || "U"}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {profile.full_name}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {t("portal_company_manager")}
                    </span>
                  </div>
                </div>
              )}

              {/* Mobile-only quick actions */}
              <div className="lg:hidden pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
                {isUpgradeEligible && (
                  <button
                    type="button"
                    onClick={() => {
                      setSidebarOpen(false);
                      setUpgradeModalOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{language === "ar" ? "ترقية الباقة" : "Upgrade Plan"}</span>
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("logout")}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">{children}</div>
          </main>
        </div>
      </div>

      {/* Interactive Admin Product Tour */}
      <ProductTour
        isOpen={adminTourOpen}
        steps={adminTourSteps}
        onComplete={handleCompleteAdminTour}
        onSkip={handleCompleteAdminTour}
      />

      {/* Package Upgrade Modal */}
      {upgradeModalOpen && (
        <div
          onClick={() => setUpgradeModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {language === "ar" ? "ترقية باقة الاشتراك" : "Upgrade Subscription Plan"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {language === "ar"
                      ? `الباقة الحالية: ${company?.plan || "starter"} • الحد الأقصى: ${company?.max_branches || 1} فرع / ${company?.max_employees || 10} موظف`
                      : `Current plan: ${company?.plan || "starter"} • Limit: ${company?.max_branches || 1} branch / ${company?.max_employees || 10} employees`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                aria-label={language === "ar" ? "إغلاق" : "Close"}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
              {/* Billing Cycle Toggle */}
              <div className="flex items-center justify-center">
                <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle("monthly")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      selectedBillingCycle === "monthly"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    {language === "ar" ? "اشتراك شهري" : "Monthly"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingCycle("yearly")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedBillingCycle === "yearly"
                        ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    <span>{language === "ar" ? "اشتراك سنوي" : "Annual"}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                      {language === "ar" ? "وفر شهرين" : "2 Months Free"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Selectable Plans */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Pro Plan Card */}
                <button
                  type="button"
                  onClick={() => setSelectedUpgradePlan("pro")}
                  className={`text-start p-4 rounded-2xl border-2 transition relative ${
                    selectedUpgradePlan === "pro"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-300">
                      {language === "ar" ? "الباقة الاحترافية (Pro)" : "Pro Plan"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                      {language === "ar" ? "الأكثر طلباً" : "Popular"}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    {selectedBillingCycle === "yearly" ? "1,990" : "199"}{" "}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {language === "ar"
                        ? `ريال / ${selectedBillingCycle === "yearly" ? "سنوياً" : "شهرياً"}`
                        : `SAR / ${selectedBillingCycle === "yearly" ? "yr" : "mo"}`}
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{language === "ar" ? "حتى 5 فروع معتمدة و 50 موظفاً" : "Up to 5 branches & 50 employees"}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{language === "ar" ? "تقارير PDF و Excel وسجل الإدارة" : "PDF/Excel reports & Audit log"}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{language === "ar" ? "تعميمات فورية وبوابة المشرف" : "Announcements & Supervisor portal"}</span>
                    </li>
                  </ul>
                </button>

                {/* Enterprise / Business Plan Card */}
                <button
                  type="button"
                  onClick={() => setSelectedUpgradePlan("business")}
                  className={`text-start p-4 rounded-2xl border-2 transition relative ${
                    selectedUpgradePlan === "business"
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-md"
                      : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {language === "ar" ? "باقة المؤسسات (Enterprise)" : "Enterprise Plan"}
                    </span>
                    {selectedUpgradePlan === "business" && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
                        {language === "ar" ? "محددة" : "Selected"}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    {selectedBillingCycle === "yearly" ? "4,990" : "499"}{" "}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {language === "ar"
                        ? `ريال / ${selectedBillingCycle === "yearly" ? "سنوياً" : "شهرياً"}`
                        : `SAR / ${selectedBillingCycle === "yearly" ? "yr" : "mo"}`}
                    </span>
                  </div>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{language === "ar" ? "فروع وموظفون غير محدودين" : "Unlimited branches & employees"}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{language === "ar" ? "تخصيص كامل للهوية والشعار" : "Full branding & custom logo"}</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{language === "ar" ? "دعم فني وأولوية قصوى" : "Priority dedicated support"}</span>
                    </li>
                  </ul>
                </button>
              </div>

              {/* Conditional Bank Transfer Details (only shown if Super Admin filled them) */}
              {hasBankDetails && (
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                    <Landmark className="w-4 h-4" />
                    <span>{language === "ar" ? "بيانات التحويل البنكي" : "Bank Transfer Details"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {bankDetails?.bank_name?.trim() && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="block text-[11px] text-slate-400">{language === "ar" ? "اسم البنك" : "Bank Name"}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{bankDetails.bank_name}</span>
                      </div>
                    )}
                    {bankDetails?.account_name?.trim() && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="block text-[11px] text-slate-400">{language === "ar" ? "اسم الحساب" : "Account Holder"}</span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">{bankDetails.account_name}</span>
                      </div>
                    )}
                    {bankDetails?.account_number?.trim() && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="block text-[11px] text-slate-400">{language === "ar" ? "رقم الحساب" : "Account Number"}</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 break-all">{bankDetails.account_number}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyBank("acc", bankDetails.account_number!)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0 transition"
                        >
                          {copiedBankField === "acc" ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedBankField === "acc" ? (language === "ar" ? "تم النسخ" : "Copied") : (language === "ar" ? "نسخ" : "Copy")}</span>
                        </button>
                      </div>
                    )}
                    {bankDetails?.iban?.trim() && (
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between gap-2 sm:col-span-2">
                        <div className="min-w-0">
                          <span className="block text-[11px] text-slate-400">IBAN</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-100 break-all">{bankDetails.iban}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyBank("iban", bankDetails.iban!)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 transition shadow-sm"
                        >
                          {copiedBankField === "iban" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedBankField === "iban" ? (language === "ar" ? "تم نسخ الآيبان ✓" : "Copied ✓") : (language === "ar" ? "نسخ الآيبان" : "Copy IBAN")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Dynamic Contact Actions (WhatsApp / Email) */}
              {(whatsappUrl || emailOrderUrl) && (
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {language === "ar"
                      ? `أرسل طلب الترقية (${selectedPlanLabelAr} — ${selectedCycleLabelAr}) مباشرة:`
                      : `Send your upgrade order (${selectedPlanLabelEn} — ${selectedCycleLabelEn}) directly:`}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition shadow-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>{language === "ar" ? "طلب الترقية عبر واتساب" : "Order via WhatsApp"}</span>
                      </a>
                    )}
                    {emailOrderUrl && (
                      <a
                        href={emailOrderUrl}
                        className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition shadow-sm"
                      >
                        <Mail className="w-4 h-4" />
                        <span>{language === "ar" ? "طلب الترقية عبر البريد" : "Order via Email"}</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalOpen(false);
                  router.push("/dashboard/settings?tab=subscription");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
              >
                <span>{language === "ar" ? "الذهاب لإدارة الباقات في الإعدادات" : "Go to Subscription Settings"}</span>
              </button>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                {language === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CompanyDashboardContext.Provider>
  );
}
