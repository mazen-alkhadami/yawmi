"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { getCachedData, setCachedData, clearUserCache } from "@/lib/instantCache";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Settings,
  LogOut,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Edit2,
  Check,
  X,
  Loader2,
  TrendingUp,
  Landmark,
  ShieldAlert,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Smartphone,
  Download,
  MapPin,
  Menu,
  RefreshCw,
} from "lucide-react";

interface CompanyRecord {
  id: string;
  name: string;
  plan: "starter" | "pro" | "business";
  max_branches: number;
  max_employees: number;
  status: "active" | "suspended";
  subscription_ends_at: string | null;
  created_at: string;
  branches_count?: number;
  employees_count?: number;
}

interface UpgradeRequestRecord {
  id: string;
  company_id: string;
  requested_plan: "pro" | "business";
  billing_cycle: "monthly" | "yearly";
  receipt_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  company?: {
    id: string;
    name: string;
    plan: string;
  };
}

interface PlatformSettingsState {
  id?: string;
  commercial_reg_number: string;
  freelance_cert_number: string;
  sbc_verification_url: string;
  support_whatsapp: string;
  support_email: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  iban: string;
}

export default function SuperAdminHQPage() {
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "companies" | "upgrades" | "settings">("overview");

  // Overview Stats
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [activeCompanies, setActiveCompanies] = useState(0);
  const [suspendedCompanies, setSuspendedCompanies] = useState(0);
  const [totalBranches, setTotalBranches] = useState(0);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState(0);
  const [pendingUpgradesCount, setPendingUpgradesCount] = useState(0);
  const [pwaInstalls, setPwaInstalls] = useState<any[]>([]);

  // Companies List & Search
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [companySearch, setCompanySearch] = useState("");

  // Edit Company Modal
  const [editCompanyModalOpen, setEditCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyRecord | null>(null);
  const [editPlan, setEditPlan] = useState<"starter" | "pro" | "business">("starter");
  const [editMaxBranches, setEditMaxBranches] = useState(1);
  const [editMaxEmployees, setEditMaxEmployees] = useState(5);
  const [editSubscriptionEnd, setEditSubscriptionEnd] = useState("");
  const [savingCompany, setSavingCompany] = useState(false);

  // Upgrade Requests
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequestRecord[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Platform Settings
  const [settings, setSettings] = useState<PlatformSettingsState>({
    commercial_reg_number: "",
    freelance_cert_number: "",
    sbc_verification_url: "",
    support_whatsapp: "",
    support_email: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    iban: "",
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
    const cacheKey = "hq_admin_portal";
    const cached = getCachedData<{
      totalCompanies: number;
      activeCompanies: number;
      suspendedCompanies: number;
      totalBranches?: number;
      totalEmployees: number;
      todayAttendanceCount?: number;
      pendingUpgradesCount: number;
      pwaInstalls?: any[];
      companies: CompanyRecord[];
      upgradeRequests: UpgradeRequestRecord[];
      settings: PlatformSettingsState;
    }>(cacheKey);

    if (cached) {
      setTotalCompanies(cached.totalCompanies);
      setActiveCompanies(cached.activeCompanies);
      setSuspendedCompanies(cached.suspendedCompanies);
      if (cached.totalBranches !== undefined) setTotalBranches(cached.totalBranches);
      setTotalEmployees(cached.totalEmployees);
      if (cached.todayAttendanceCount !== undefined) setTodayAttendanceCount(cached.todayAttendanceCount);
      setPendingUpgradesCount(cached.pendingUpgradesCount);
      if (cached.pwaInstalls) setPwaInstalls(cached.pwaInstalls);
      setCompanies(cached.companies || []);
      setUpgradeRequests(cached.upgradeRequests || []);
      if (cached.settings) setSettings(cached.settings);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let user = sessionData?.session?.user || null;
      if (!user) {
        const { data: userData } = await supabase.auth.getUser();
        user = userData?.user || null;
      }
      if (!user) {
        clearUserCache();
        router.push("/login");
        return;
      }

      // Check role in profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "super_admin") {
        router.push("/dashboard");
        return;
      }

      const todayStr = new Date().toISOString().split("T")[0];
      const [
        compCountRes,
        actCountRes,
        suspCountRes,
        branchCountRes,
        empCountRes,
        todayAttRes,
        upCountRes,
        pwaRes,
        compsRes,
        reqsRes,
        platRes,
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "suspended"),
        supabase.from("branches").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).neq("role", "super_admin"),
        supabase.from("attendance_logs").select("id", { count: "exact", head: true }).eq("shift_date", todayStr),
        supabase.from("upgrade_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("pwa_installs").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("upgrade_requests").select("*, company:company_id(id, name, plan)").order("created_at", { ascending: false }),
        supabase.from("platform_settings").select("*").limit(1).maybeSingle(),
      ]);

      const nextTotal = compCountRes.count || 0;
      const nextActive = actCountRes.count || 0;
      const nextSusp = suspCountRes.count || 0;
      const nextBranches = branchCountRes.count || 0;
      const nextEmp = empCountRes.count || 0;
      const nextTodayAtt = todayAttRes.count || 0;
      const nextPending = upCountRes.count || 0;
      const nextPwa = pwaRes.data || [];
      const nextComps = (compsRes.data as any) || [];
      const nextReqs = (reqsRes.data as any) || [];

      setTotalCompanies(nextTotal);
      setActiveCompanies(nextActive);
      setSuspendedCompanies(nextSusp);
      setTotalBranches(nextBranches);
      setTotalEmployees(nextEmp);
      setTodayAttendanceCount(nextTodayAtt);
      setPendingUpgradesCount(nextPending);
      setPwaInstalls(nextPwa);
      setCompanies(nextComps);
      setUpgradeRequests(nextReqs);

      let nextSettings = settings;
      if (platRes.data) {
        const bank = platRes.data.bank_transfer_details || {};
        nextSettings = {
          id: platRes.data.id,
          commercial_reg_number: platRes.data.commercial_reg_number || "",
          freelance_cert_number: platRes.data.freelance_cert_number || "",
          sbc_verification_url: platRes.data.sbc_verification_url || "",
          support_whatsapp: platRes.data.support_whatsapp || "",
          support_email: platRes.data.support_email || "",
          bank_name: bank.bank_name || "",
          account_name: bank.account_name || "",
          account_number: bank.account_number || "",
          iban: bank.iban || "",
        };
        setSettings(nextSettings);
      }

      setCachedData(cacheKey, {
        totalCompanies: nextTotal,
        activeCompanies: nextActive,
        suspendedCompanies: nextSusp,
        totalBranches: nextBranches,
        totalEmployees: nextEmp,
        todayAttendanceCount: nextTodayAtt,
        pendingUpgradesCount: nextPending,
        pwaInstalls: nextPwa,
        companies: nextComps,
        upgradeRequests: nextReqs,
        settings: nextSettings,
      });
    } catch (err) {
      console.error("Super Admin check error:", err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadOverviewStats = async () => {
    try {
      // 1. Companies counts
      const { count: compCount } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });
      setTotalCompanies(compCount || 0);

      const { count: actCount } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      setActiveCompanies(actCount || 0);

      const { count: suspCount } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true })
        .eq("status", "suspended");
      setSuspendedCompanies(suspCount || 0);

      // 2. Employees count
      const { count: empCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .neq("role", "super_admin");
      setTotalEmployees(empCount || 0);

      // 3. Pending upgrades count
      const { count: upCount } = await supabase
        .from("upgrade_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingUpgradesCount(upCount || 0);
    } catch (err) {
      console.error("Overview stats error:", err);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data: comps } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      setCompanies((comps as any) || []);
    } catch (err) {
      console.error("Load companies error:", err);
    }
  };

  const loadUpgradeRequests = async () => {
    try {
      const { data: reqs } = await supabase
        .from("upgrade_requests")
        .select("*, company:company_id(id, name, plan)")
        .order("created_at", { ascending: false });

      setUpgradeRequests((reqs as any) || []);
    } catch (err) {
      console.error("Load upgrades error:", err);
    }
  };

  const loadPlatformSettings = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data) {
        const bank = data.bank_transfer_details || {};
        setSettings({
          id: data.id,
          commercial_reg_number: data.commercial_reg_number || "",
          freelance_cert_number: data.freelance_cert_number || "",
          sbc_verification_url: data.sbc_verification_url || "",
          support_whatsapp: data.support_whatsapp || "",
          support_email: data.support_email || "",
          bank_name: bank.bank_name || "",
          account_name: bank.account_name || "",
          account_number: bank.account_number || "",
          iban: bank.iban || "",
        });
      }
    } catch (err) {
      console.error("Load settings error:", err);
    }
  };

  const handleLogout = async () => {
    clearUserCache();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Toggle Company Status (Active / Suspended)
  const handleToggleCompanyStatus = async (comp: CompanyRecord) => {
    const nextStatus = comp.status === "active" ? "suspended" : "active";
    const confirmPrompt =
      nextStatus === "suspended"
        ? `هل أنت متأكد من إيقاف شركة (${comp.name})؟ لن يتمكن منسوبوها من الدخول.`
        : `هل أنت متأكد من إعادة تنشيط شركة (${comp.name})؟`;

    if (!confirm(confirmPrompt)) return;

    try {
      const { error } = await supabase
        .from("companies")
        .update({ status: nextStatus })
        .eq("id", comp.id);

      if (error) throw error;
      setCompanies((prev) =>
        prev.map((c) => (c.id === comp.id ? { ...c, status: nextStatus } : c))
      );
      loadOverviewStats();
    } catch (err: any) {
      alert("Error updating company status: " + (err.message || err));
    }
  };

  // Open Edit Company Modal
  const handleOpenEditCompany = (comp: CompanyRecord) => {
    setEditingCompany(comp);
    setEditPlan(comp.plan);
    setEditMaxBranches(comp.max_branches);
    setEditMaxEmployees(comp.max_employees);
    setEditSubscriptionEnd(
      comp.subscription_ends_at
        ? new Date(comp.subscription_ends_at).toISOString().split("T")[0]
        : ""
    );
    setEditCompanyModalOpen(true);
  };

  // Save Edit Company
  const handleSaveCompanyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setSavingCompany(true);

    try {
      const { error } = await supabase
        .from("companies")
        .update({
          plan: editPlan,
          max_branches: Number(editMaxBranches),
          max_employees: Number(editMaxEmployees),
          subscription_ends_at: editSubscriptionEnd ? `${editSubscriptionEnd}T23:59:59Z` : null,
        })
        .eq("id", editingCompany.id);

      if (error) throw error;
      setEditCompanyModalOpen(false);
      setEditingCompany(null);
      await loadCompanies();
    } catch (err: any) {
      alert("Error updating company: " + (err.message || err));
    } finally {
      setSavingCompany(false);
    }
  };

  // Approve Upgrade Request
  const handleApproveUpgrade = async (request: UpgradeRequestRecord) => {
    if (!confirm(`هل أنت متأكد من اعتماد ترقية باقة شركة (${request.company?.name}) إلى (${request.requested_plan})؟`)) {
      return;
    }
    setActionLoading(true);

    try {
      // 1. Update upgrade_requests status
      const { error: reqErr } = await supabase
        .from("upgrade_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (reqErr) throw reqErr;

      // 2. Compute expiration date (+30 days for monthly, +365 days for yearly)
      const now = new Date();
      const daysToAdd = request.billing_cycle === "yearly" ? 365 : 30;
      const expireDate = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      // Quotas
      const maxBranches = request.requested_plan === "business" ? 999 : 5;
      const maxEmployees = request.requested_plan === "business" ? 999 : 50;

      // 3. Update public.companies
      const { error: compErr } = await supabase
        .from("companies")
        .update({
          plan: request.requested_plan,
          max_branches: maxBranches,
          max_employees: maxEmployees,
          subscription_ends_at: expireDate.toISOString(),
          status: "active",
        })
        .eq("id", request.company_id);

      if (compErr) throw compErr;

      await Promise.all([loadUpgradeRequests(), loadCompanies(), loadOverviewStats()]);
    } catch (err: any) {
      alert("Error approving upgrade: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Reject Upgrade
  const handleSubmitRejectUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUpgradeId) return;
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from("upgrade_requests")
        .update({
          status: "rejected",
          admin_note: rejectNote.trim() || "تم رفض الطلب لعدم ثبوت وصول الحوالة البنكية.",
        })
        .eq("id", selectedUpgradeId);

      if (error) throw error;
      setRejectModalOpen(false);
      setSelectedUpgradeId(null);
      setRejectNote("");
      await loadUpgradeRequests();
    } catch (err: any) {
      alert("Error rejecting upgrade: " + (err.message || err));
    } finally {
      setActionLoading(false);
    }
  };

  // Save Platform Settings
  const handleSavePlatformSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSuccess(false);

    try {
      const payload = {
        commercial_reg_number: settings.commercial_reg_number.trim() || null,
        freelance_cert_number: settings.freelance_cert_number.trim() || null,
        sbc_verification_url: settings.sbc_verification_url.trim() || null,
        support_whatsapp: settings.support_whatsapp.trim() || null,
        support_email: settings.support_email.trim() || null,
        bank_transfer_details: {
          bank_name: settings.bank_name.trim(),
          account_name: settings.account_name.trim(),
          account_number: settings.account_number.trim(),
          iban: settings.iban.trim(),
        },
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        const { error } = await supabase
          .from("platform_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("platform_settings").insert(payload);
        if (error) throw error;
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving platform settings: " + (err.message || err));
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white flex flex-col font-cairo">
      {/* Super Admin Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 h-16 flex items-center">
        <div className="max-w-7xl w-full mx-auto flex items-center justify-between gap-2">
          {/* Logo + Compact HQ Badge */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <YawmiLogo size="sm" showText={true} />
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 inline-flex items-center gap-1 shrink-0">
              <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="sm:hidden">{language === "ar" ? "المقر" : "HQ"}</span>
              <span className="hidden sm:inline">المقر الرئيسي (Platform Owner HQ)</span>
            </span>
          </div>

          {/* Desktop Controls */}
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await checkAdminAndLoadData();
                setRefreshing(false);
              }}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
              title={language === "ar" ? "تحديث البيانات" : "Refresh"}
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <LanguageToggle />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("logout")}</span>
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer for Secondary Controls */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-[100] md:hidden font-cairo">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div
            className={`fixed inset-y-0 ${
              dir === "rtl" ? "right-0" : "left-0"
            } w-[80%] max-w-xs bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-800 p-5 flex flex-col justify-between gap-5 overflow-y-auto shadow-2xl z-10`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <YawmiLogo size="sm" showText={true} />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {language === "ar" ? "تخصيص العرض واللغة" : "Preferences"}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {language === "ar" ? "اللغة والمظهر" : "Language & Theme"}
                  </span>
                  <div className="flex items-center gap-2">
                    <LanguageToggle />
                    <ThemeToggle />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setRefreshing(true);
                  await checkAdminAndLoadData();
                  setRefreshing(false);
                  setMobileDrawerOpen(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 hover:bg-indigo-100 transition"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span>{language === "ar" ? "تحديث بيانات المنصة" : "Refresh Platform Data"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-2 hover:bg-rose-100 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("logout")}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {loading ? (
          <div className="space-y-6 animate-pulse py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              ))}
            </div>
            <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : (
          <>
            {/* Title & Tab Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <span>{t("hq_title")}</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("hq_subtitle")}
                </p>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-1.5 bg-slate-200/80 dark:bg-slate-800 rounded-xl overflow-x-auto whitespace-nowrap max-w-full">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "overview"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{t("hq_tab_overview")}</span>
                </button>

                <button
                  onClick={() => setActiveTab("companies")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "companies"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{t("hq_tab_companies")}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-700">
                    {companies.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("upgrades")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "upgrades"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>{t("hq_tab_upgrades")}</span>
                  {pendingUpgradesCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-bold">
                      {pendingUpgradesCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                    activeTab === "settings"
                      ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{t("hq_tab_settings")}</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Overview & KPIs */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                    <span className="text-xs text-slate-400 block">{t("total_companies")}</span>
                    <span className="text-2xl font-black font-mono text-indigo-600">
                      {totalCompanies}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {activeCompanies} مفعلة &bull; {suspendedCompanies} موقوفة
                    </span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-purple-500" />
                      <span>{language === "ar" ? "إجمالي الفروع" : "Total Branches"}</span>
                    </span>
                    <span className="text-2xl font-black font-mono text-purple-600">
                      {totalBranches}
                    </span>
                    <span className="text-[11px] text-slate-500 block">فرع مسجل بالمنصة</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                    <span className="text-xs text-slate-400 block">{t("total_employees")}</span>
                    <span className="text-2xl font-black font-mono text-emerald-600">
                      {totalEmployees}
                    </span>
                    <span className="text-[11px] text-slate-500 block">موظف مسجل بالمنصة</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-teal-500" />
                      <span>{language === "ar" ? "سجلات حضور اليوم" : "Today's Attendance"}</span>
                    </span>
                    <span className="text-2xl font-black font-mono text-teal-600">
                      {todayAttendanceCount}
                    </span>
                    <span className="text-[11px] text-slate-500 block">عملية تسجيل اليوم</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-1 col-span-2 sm:col-span-1">
                    <span className="text-xs text-slate-400 block">{t("pending_upgrades")}</span>
                    <span className="text-2xl font-black font-mono text-amber-500">
                      {pendingUpgradesCount}
                    </span>
                    <span className="text-[11px] text-slate-500 block">حوالات تنتظر المراجعة</span>
                  </div>
                </div>

                {/* PWA Installation Analytics Card */}
                {(() => {
                  const totalInstalls = pwaInstalls.length;
                  const androidCount = pwaInstalls.filter((i) =>
                    (i.platform || "").toLowerCase().includes("android")
                  ).length;
                  const iosCount = pwaInstalls.filter((i) =>
                    (i.platform || "").toLowerCase().includes("ios")
                  ).length;
                  const otherCount = Math.max(0, totalInstalls - androidCount - iosCount);

                  const empInstalls = pwaInstalls.filter((i) => i.role === "employee").length;
                  const adminInstalls = pwaInstalls.filter((i) => i.role === "company_manager").length;
                  const supInstalls = pwaInstalls.filter((i) => i.role === "branch_supervisor").length;

                  const pct = (count: number) =>
                    totalInstalls > 0 ? Math.round((count / totalInstalls) * 100) : 0;

                  return (
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Download className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {language === "ar" ? "تحليلات تثبيت تطبيق الجوال (PWA)" : "PWA App Install Analytics"}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {language === "ar"
                                ? "إحصائيات تثبيت التطبيق على الشاشة الرئيسية حسب نوع الجهاز والدور الوظيفي."
                                : "Home-screen install metrics broken down by device platform and user role."}
                            </p>
                          </div>
                        </div>

                        <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 self-start sm:self-center">
                          <Smartphone className="w-4 h-4 text-emerald-600" />
                          <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
                            {totalInstalls}
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {language === "ar" ? "إجمالي التثبيتات" : "Total Installs"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Column 1: Platform Breakdown */}
                        <div className="space-y-3 text-xs">
                          <h4 className="font-bold text-slate-700 dark:text-slate-300">
                            {language === "ar" ? "توزيع الأجهزة (Platform)" : "By Platform / Device"}
                          </h4>
                          {[
                            { label: "Android / Chrome", count: androidCount, color: "bg-emerald-500" },
                            { label: "iOS Safari", count: iosCount, color: "bg-indigo-500" },
                            { label: language === "ar" ? "سطح المكتب / أخرى" : "Desktop / Other", count: otherCount, color: "bg-slate-400" },
                          ].map((row) => (
                            <div key={row.label} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">{row.label}</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {row.count} ({pct(row.count)}%)
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${row.color}`}
                                  style={{ width: `${pct(row.count)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Column 2: Role Breakdown */}
                        <div className="space-y-3 text-xs">
                          <h4 className="font-bold text-slate-700 dark:text-slate-300">
                            {language === "ar" ? "توزيع الأدوار (User Role)" : "By User Role"}
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span className="font-semibold">{language === "ar" ? "الموظفون" : "Employees"}</span>
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                {empInstalls}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span className="font-semibold">{language === "ar" ? "مديرو الشركات" : "Company Admins"}</span>
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                {adminInstalls}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                              <span className="font-semibold">{language === "ar" ? "مشرفو الفروع" : "Supervisors"}</span>
                              <span className="px-2 py-0.5 rounded-md font-mono font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                                {supInstalls}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Column 3: Recent Installs Feed */}
                        <div className="space-y-2.5 text-xs">
                          <h4 className="font-bold text-slate-700 dark:text-slate-300">
                            {language === "ar" ? "أحدث عمليات التثبيت" : "Recent Installs"}
                          </h4>
                          {pwaInstalls.length === 0 ? (
                            <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-slate-400">
                              {language === "ar" ? "لا توجد تثبيتات مسجلة بعد." : "No installs recorded yet."}
                            </div>
                          ) : (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pe-1">
                              {pwaInstalls.slice(0, 5).map((inst) => (
                                <div
                                  key={inst.id}
                                  className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                                >
                                  <span className="font-mono font-semibold text-[11px] truncate">
                                    {inst.platform || "unknown"} • {inst.role || "employee"}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    {new Date(inst.created_at).toLocaleDateString("ar-SA", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Shortcuts */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold">إجراءات سريعة لمالك المنصة</h3>
                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() => setActiveTab("upgrades")}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
                    >
                      مراجعة طلبات الترقية والحوالات ({pendingUpgradesCount})
                    </button>
                    <button
                      onClick={() => setActiveTab("companies")}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                    >
                      إدارة وتعديل باقات الشركات
                    </button>
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                    >
                      تعديل بيانات الحساب البنكي الرسمي
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Companies Management */}
            {activeTab === "companies" && (
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="بحث عن شركة بالاسم..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rtl:pr-9 rtl:pl-3 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {filteredCompanies.length} شركة مسجلة
                  </span>
                </div>

                {/* Companies Table */}
                <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3.5">اسم المنشأة</th>
                          <th className="p-3.5">الباقة</th>
                          <th className="p-3.5">الحدود المسموحة</th>
                          <th className="p-3.5">الحالة</th>
                          <th className="p-3.5">نهاية الاشتراك</th>
                          <th className="p-3.5 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {filteredCompanies.map((comp) => (
                          <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {comp.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                ID: {comp.id.substring(0, 8)}...
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  comp.plan === "business"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                                    : comp.plan === "pro"
                                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {comp.plan}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                              {comp.max_branches} فرع &bull; {comp.max_employees} موظف
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  comp.status === "active"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                }`}
                              >
                                {comp.status === "active" ? "مفعلة" : "موقوفة"}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-500 font-mono">
                              {comp.subscription_ends_at
                                ? new Date(comp.subscription_ends_at).toLocaleDateString()
                                : "غير محدد"}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenEditCompany(comp)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition"
                                >
                                  {t("edit_limits_btn")}
                                </button>
                                <button
                                  onClick={() => handleToggleCompanyStatus(comp)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                    comp.status === "active"
                                      ? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900"
                                      : "bg-emerald-600 text-white"
                                  }`}
                                >
                                  {comp.status === "active"
                                    ? t("suspend_company_btn")
                                    : t("activate_company_btn")}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Upgrade Requests & Approvals */}
            {activeTab === "upgrades" && (
              <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    طلبات الترقية المسجلة عبر الحوالات البنكية
                  </h3>
                </div>

                {upgradeRequests.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 space-y-2">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-xs">لا توجد طلبات ترقية مسجلة حالياً.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left rtl:text-right">
                      <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="p-3.5">المنشأة</th>
                          <th className="p-3.5">الباقة المطلوبة</th>
                          <th className="p-3.5">دورة الفوترة</th>
                          <th className="p-3.5">مرجع / رابط الإيصال</th>
                          <th className="p-3.5">الحالة</th>
                          <th className="p-3.5 text-center">الإجراء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                        {upgradeRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30">
                            <td className="p-3.5">
                              <div className="font-bold text-slate-900 dark:text-white">
                                {req.company?.name || "منشأة"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                الحالية: {req.company?.plan} &bull;{" "}
                                {new Date(req.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-3.5 font-bold uppercase text-indigo-600 dark:text-indigo-400">
                              {req.requested_plan}
                            </td>
                            <td className="p-3.5">
                              {req.billing_cycle === "yearly" ? "سنوي (خصم شهرين)" : "شهري"}
                            </td>
                            <td className="p-3.5">
                              <span className="font-mono text-xs block truncate max-w-[180px]">
                                {req.receipt_url || "--"}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  req.status === "approved"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    : req.status === "rejected"
                                    ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                }`}
                              >
                                {req.status === "approved"
                                  ? "معتمد ومفعل"
                                  : req.status === "rejected"
                                  ? "مرفوض"
                                  : "بانتظار التحقق"}
                              </span>
                            </td>
                            <td className="p-3.5 text-center">
                              {req.status === "pending" ? (
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => handleApproveUpgrade(req)}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1 disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>اعتماد وتفعيل</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedUpgradeId(req.id);
                                      setRejectModalOpen(true);
                                    }}
                                    disabled={actionLoading}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 hover:bg-rose-100 transition disabled:opacity-50"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>رفض</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">تم البت بالطلب</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Platform Settings & Banking */}
            {activeTab === "settings" && (
              <div className="max-w-2xl mx-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                <h2 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-purple-600" />
                  <span>إعدادات التحقق البنكي والتراخيص الرسمية للمنصة</span>
                </h2>

                {settingsSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ إعدادات المنصة بنجاح!</span>
                  </div>
                )}

                <form onSubmit={handleSavePlatformSettings} className="space-y-5 text-xs">
                  {/* Dynamic Support Contact Channels */}
                  <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-500 dark:text-slate-400">
                      قنوات التواصل والدعم (تظهر ديناميكياً في نافذة الترقية والصفحات العامة — اترك الحقل فارغاً لإخفائه)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم الواتساب (WhatsApp)
                        </label>
                        <input
                          type="text"
                          value={settings.support_whatsapp}
                          onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })}
                          placeholder="9665XXXXXXXX"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          البريد الإلكتروني للدعم والمبيعات
                        </label>
                        <input
                          type="email"
                          value={settings.support_email}
                          onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                          placeholder="support@yawmi.app"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-bold text-slate-500 dark:text-slate-400">
                      بيانات الحساب البنكي الرسمي لتحويل الاشتراكات (اتركها فارغة لإخفاء التحويل البنكي في نافذة الترقية)
                    </h3>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t("bank_name")}
                      </label>
                      <input
                        type="text"
                        value={settings.bank_name}
                        onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                        placeholder="مصرف الراجحي (Al Rajhi Bank)"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t("account_name")}
                      </label>
                      <input
                        type="text"
                        value={settings.account_name}
                        onChange={(e) => setSettings({ ...settings, account_name: e.target.value })}
                        placeholder="مؤسسة يومي لتقنية المعلومات"
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          رقم الحساب (Account Number)
                        </label>
                        <input
                          type="text"
                          value={settings.account_number}
                          onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
                          placeholder="456608010123456"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t("iban")}
                        </label>
                        <input
                          type="text"
                          value={settings.iban}
                          onChange={(e) => setSettings({ ...settings, iban: e.target.value })}
                          placeholder="SA4480000456608010123456"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-500 dark:text-slate-400">
                      التراخيص والتوثيق الحكومي السعودي
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t("commercial_reg")}
                        </label>
                        <input
                          type="text"
                          value={settings.commercial_reg_number}
                          onChange={(e) =>
                            setSettings({ ...settings, commercial_reg_number: e.target.value })
                          }
                          placeholder="1010998877"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {t("freelance_cert")}
                        </label>
                        <input
                          type="text"
                          value={settings.freelance_cert_number}
                          onChange={(e) =>
                            setSettings({ ...settings, freelance_cert_number: e.target.value })
                          }
                          placeholder="FL-987654321"
                          className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {t("sbc_url")}
                      </label>
                      <input
                        type="url"
                        value={settings.sbc_verification_url}
                        onChange={(e) =>
                          setSettings({ ...settings, sbc_verification_url: e.target.value })
                        }
                        placeholder="https://mc.gov.sa/..."
                        className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="py-2.5 px-6 rounded-xl font-bold bg-purple-600 text-white hover:bg-purple-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                    >
                      {savingSettings ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      <span>حفظ الإعدادات الرسمية</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Company Limits Modal */}
      {editCompanyModalOpen && editingCompany && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-xs font-cairo">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                <span>تعديل باقة وحدود: {editingCompany.name}</span>
              </h3>
              <button
                onClick={() => setEditCompanyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCompanyEdit} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الباقة المعتمدة *
                </label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="starter">Starter (1 فرع / 5 موظفين)</option>
                  <option value="pro">Pro (5 فروع / 50 موظف)</option>
                  <option value="business">Business (غير محدود 999)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الحد الأقصى للفروع
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editMaxBranches}
                    onChange={(e) => setEditMaxBranches(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    الحد الأقصى للموظفين
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editMaxEmployees}
                    onChange={(e) => setEditMaxEmployees(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ نهاية الاشتراك (اختياري)
                </label>
                <input
                  type="date"
                  value={editSubscriptionEnd}
                  onChange={(e) => setEditSubscriptionEnd(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingCompany}
                  className="flex-1 py-2 px-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {savingCompany ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>حفظ التعديلات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditCompanyModalOpen(false)}
                  className="py-2 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Upgrade Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 text-xs font-cairo">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2 text-rose-600">
                <XCircle className="w-4 h-4" />
                <span>رفض طلب الترقية</span>
              </h3>
              <button
                onClick={() => setRejectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRejectUpgrade} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  سبب الرفض (سيظهر لإدارة الشركة) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="مثال: لم يتم العثور على الحوالة في كشف الحساب البنكي، يرجى إعادة إرسال رقم الإيصال الصحيح..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 px-4 rounded-xl font-bold bg-rose-600 text-white hover:bg-rose-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  <span>تأكيد الرفض</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="py-2 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  {t("cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
        يَومي | Yawmi Platform Super Admin HQ
      </footer>
    </div>
  );
}
