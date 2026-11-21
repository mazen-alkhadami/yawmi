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

  const fetchSessionAndCompany = async () => {
    try {
      // 1. Check local session first for fast load
      const { data: sessionData } = await supabase.auth.getSession();
      let userId = sessionData?.session?.user?.id;

      if (!userId) {
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id;
      }

      if (!userId) {
        router.push("/login");
        return;
      }

      // 2. Fetch profile & company in ONE single join query
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select(`
          id, full_name, role, company_id, status,
          companies:company_id (
            id, name, invite_code, plan, max_branches, max_employees, status, subscription_ends_at, primary_color
          )
        `)
        .eq("id", userId)
        .maybeSingle();

      if (profErr || !prof) {
        router.push("/login");
        return;
      }

      setProfile(prof);
      const compData = (prof as any).companies || null;
      setCompany(compData);
    } catch (err) {
      console.error("Dashboard layout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateCompanyLocally = (data: Partial<NonNullable<CompanyContextData["company"]>>) => {
    setCompany((prev: any) => (prev ? { ...prev, ...data } : null));
  };

  useEffect(() => {
    fetchSessionAndCompany();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { href: "/dashboard", label: t("nav_overview"), icon: LayoutDashboard },
    { href: "/dashboard/branches", label: t("nav_branches"), icon: MapPin },
    { href: "/dashboard/shifts", label: t("nav_shifts"), icon: CalendarClock },
    { href: "/dashboard/employees", label: t("nav_employees"), icon: Users },
    { href: "/dashboard/requests", label: t("nav_requests"), icon: FileCheck2 },
    { href: "/dashboard/reports", label: t("nav_reports"), icon: FileBarChart2 },
    { href: "/dashboard/settings", label: t("nav_settings"), icon: Settings },
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
            <NotificationsBell companyId={company?.id} lang={language} />
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

            {/* User Info Card in Sidebar Bottom */}
            {profile && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700/60 px-2">
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
              </div>
            )}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto">{children}</div>
          </main>
        </div>
      </div>
    </CompanyDashboardContext.Provider>
  );
}
