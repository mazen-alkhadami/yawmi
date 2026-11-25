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
} from "lucide-react";

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
  loading: boolean;
  refreshData: () => Promise<void>;
  updateCompanyLocally: (data: Partial<NonNullable<CompanyContextData["company"]>>) => void;
}

export const CompanyDashboardContext = React.createContext<CompanyContextData>({
  company: null,
  profile: null,
  loading: true,
  refreshData: async () => {},
  updateCompanyLocally: () => {},
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
  const [adminTourOpen, setAdminTourOpen] = useState(false);

  const fetchSessionAndCompany = async () => {
    const cached = getCachedData<{ profile: any; company: any }>("dashboard_layout");
    if (cached?.profile) {
      setProfile(cached.profile);
      setCompany(cached.company || null);
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

      // 2. Fetch profile & company in ONE single join query
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select(`
          id, full_name, role, company_id, status, has_completed_tour,
          companies:company_id (
            id, name, invite_code, plan, max_branches, max_employees, status, subscription_ends_at, primary_color
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (profErr || !prof) {
        clearUserCache();
        router.push("/login");
        return;
      }

      setProfile(prof);
      const compData = (prof as any).companies || null;
      setCompany(compData);
      setCachedData("dashboard_layout", { profile: prof, company: compData });

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
      setCachedData("dashboard_layout", { profile, company: next });
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
    { href: "/dashboard/branches", label: t("nav_branches"), icon: MapPin, tourId: "tour-nav-branches" },
    { href: "/dashboard/shifts", label: t("nav_shifts"), icon: CalendarClock, tourId: "tour-nav-shifts" },
    { href: "/dashboard/employees", label: t("nav_employees"), icon: Users, tourId: "tour-nav-employees" },
    { href: "/dashboard/requests", label: t("nav_requests"), icon: FileCheck2, tourId: "tour-nav-requests" },
    { href: "/dashboard/reports", label: t("nav_reports"), icon: FileBarChart2, tourId: "tour-nav-reports" },
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

  return (
    <CompanyDashboardContext.Provider
      value={{
        company,
        profile,
        loading,
        refreshData: fetchSessionAndCompany,
        updateCompanyLocally,
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
    </CompanyDashboardContext.Provider>
  );
}
