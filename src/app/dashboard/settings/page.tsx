"use client";

import React, { useContext, useEffect, useState } from "react";
import { CompanyDashboardContext } from "../layout";
import { useLanguage } from "@/contexts/LanguageContext";
import { createClient } from "@/lib/supabase/client";
import {
  Settings,
  Building2,
  Palette,
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Landmark,
  ExternalLink,
  Loader2,
  Send,
  ShieldCheck,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface UpgradeRequest {
  id: string;
  requested_plan: "pro" | "business";
  billing_cycle: "monthly" | "yearly";
  receipt_url: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
}

interface PlatformSettingsData {
  commercial_reg_number: string | null;
  freelance_cert_number: string | null;
  sbc_verification_url: string | null;
  bank_transfer_details: {
    bank_name?: string;
    account_name?: string;
    iban?: string;
  } | null;
}

export default function CompanySettingsPage() {
  const { company, profile, refreshData, updateCompanyLocally } = useContext(CompanyDashboardContext);
  const { t, dir } = useLanguage();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"profile" | "subscription">("profile");

  // Profile / Branding State
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [copiedCode, setCopiedCode] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Usage stats
  const [branchesCount, setBranchesCount] = useState(0);
  const [employeesCount, setEmployeesCount] = useState(0);

  // Platform Bank Settings & Upgrade History
  const [platformSettings, setPlatformSettings] = useState<PlatformSettingsData | null>(null);
  const [upgradeHistory, setUpgradeHistory] = useState<UpgradeRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Upgrade Form
  const [requestedPlan, setRequestedPlan] = useState<"pro" | "business">("pro");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [submittingUpgrade, setSubmittingUpgrade] = useState(false);
  const [upgradeAlert, setUpgradeAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name || "");
      if (company.primary_color) {
        setPrimaryColor(company.primary_color);
      }
      fetchCompanyUsage();
      fetchPlatformSettings();
      fetchUpgradeHistory();
    }
  }, [company?.id, company?.name, company?.primary_color]);

  const fetchCompanyUsage = async () => {
    if (!company?.id) return;
    try {
      const { count: bCount } = await supabase
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("is_active", true);

      const { count: eCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("company_id", company.id)
        .neq("status", "suspended");

      setBranchesCount(bCount || 0);
      setEmployeesCount(eCount || 0);
    } catch (err) {
      console.error("Error fetching usage stats:", err);
    }
  };

  const fetchPlatformSettings = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data) {
        setPlatformSettings(data);
      }
    } catch (err) {
      console.error("Error fetching platform settings:", err);
    }
  };

  const fetchUpgradeHistory = async () => {
    if (!company?.id) return;
    setLoadingHistory(true);
    try {
      const { data } = await supabase
        .from("upgrade_requests")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });

      setUpgradeHistory(data || []);
    } catch (err) {
      console.error("Error fetching upgrade history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Save Company Profile / Branding
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setSavingProfile(true);
    setProfileSuccess(false);

    try {
      const { data, error } = await supabase
        .from("companies")
        .update({
          name: companyName.trim(),
          primary_color: primaryColor,
        })
        .eq("id", company.id)
        .select("id, name, primary_color, invite_code, plan, max_branches, max_employees, status, subscription_ends_at")
        .single();

      if (error) throw error;

      // Update state and layout context immediately so brand color applies instantly
      if (data) {
        updateCompanyLocally({
          name: data.name,
          primary_color: data.primary_color,
        });
      }

      setProfileSuccess(true);
      await refreshData();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert("Error saving company profile: " + (err.message || err));
    } finally {
      setSavingProfile(false);
    }
  };

  // Submit Upgrade Request
  const handleSubmitUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company?.id) return;
    setSubmittingUpgrade(true);
    setUpgradeAlert(null);

    try {
      const { error } = await supabase.from("upgrade_requests").insert({
        company_id: company.id,
        requested_plan: requestedPlan,
        billing_cycle: billingCycle,
        receipt_url: receiptUrl.trim() || null,
        status: "pending",
      });

      if (error) throw error;
      setUpgradeAlert({
        type: "success",
        text: "تم إرسال طلب الترقية بنجاح! سيقوم فريق الإدارة بمراجعة الحوالة وتفعيل الباقة خلال 24 ساعة.",
      });
      setReceiptUrl("");
      await fetchUpgradeHistory();
    } catch (err: any) {
      setUpgradeAlert({
        type: "error",
        text: "فشل إرسال طلب الترقية: " + (err.message || err),
      });
    } finally {
      setSubmittingUpgrade(false);
    }
  };

  const colorPresets = [
    { name: "Deep Indigo", hex: "#4F46E5" },
    { name: "Royal Blue", hex: "#2563EB" },
    { name: "Teal Emerald", hex: "#0D9488" },
    { name: "Forest Green", hex: "#16A34A" },
    { name: "Purple", hex: "#9333EA" },
    { name: "Midnight Navy", hex: "#1E293B" },
  ];

  return (
    <div className="space-y-6 font-cairo">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            <span>{t("company_settings_title")}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الهوية المؤسسية وترقية سعة الفروع والموظفين
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === "profile"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            {t("tab_company_profile")}
          </button>
          <button
            onClick={() => setActiveTab("subscription")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === "subscription"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{t("tab_subscription_upgrades")}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Company Profile & Identity */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Form */}
          <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>بيانات وهوية المنشأة</span>
            </h2>

            {profileSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>تم تحديث بيانات وهوية المنشأة بنجاح!</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اسم المنشأة / الشركة *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold"
                />
              </div>

              {/* Primary Color Picker */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t("company_primary_color")}
                </label>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm shrink-0"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#4F46E5"
                    className="w-36 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs font-bold"
                  />
                  {/* Presets */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {colorPresets.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setPrimaryColor(preset.hex)}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          primaryColor === preset.hex
                            ? "border-slate-900 dark:border-white scale-110"
                            : "border-transparent"
                        }`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="py-2.5 px-6 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {savingProfile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{t("save")}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Info & Invite Code Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700">
              كود دعوة الموظفين
            </h2>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center space-y-2">
              <span className="text-[11px] text-slate-400 block">كود انضمام الموظفين</span>
              <div className="text-2xl font-black font-mono tracking-widest text-indigo-600 dark:text-indigo-400">
                {company?.invite_code}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(company?.invite_code || "");
                  setCopiedCode(true);
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shadow-sm"
              >
                {copiedCode ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedCode ? t("copied") : t("copy_code")}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              يمكن لموظفيك إدخال هذا الرمز عند التسجيل عبر صفحة الانضمام (Join) لتقديم طلب الانضمام إلى منشأتك.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Subscription & Upgrades */}
      {activeTab === "subscription" && (
        <div className="space-y-6">
          {/* Plan Quotas Usage Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold">
                    الباقة الحالية:{" "}
                    <span className="uppercase text-indigo-600 dark:text-indigo-400">
                      {company?.plan}
                    </span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    نشط
                  </span>
                </div>
                {company?.subscription_ends_at && (
                  <p className="text-xs text-slate-400 mt-1">
                    {t("subscription_renews_at")}:{" "}
                    {new Date(company.subscription_ends_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <span className="text-xs text-slate-500 font-bold">
                {t("plan_usage")}
              </span>
            </div>

            {/* Quota Progress Bars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Branches Quota */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>الفروع المفعلة:</span>
                  <span className="font-mono">
                    {branchesCount} / {company?.max_branches || 1}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (branchesCount / (company?.max_branches || 1)) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Employees Quota */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>الموظفون المسجلون:</span>
                  <span className="font-mono">
                    {employeesCount} / {company?.max_employees || 5}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      employeesCount >= (company?.max_employees || 5)
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(100, (employeesCount / (company?.max_employees || 5)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Comparison Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Starter */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-slate-400 block uppercase">Starter</span>
              <div className="text-2xl font-black">مجاناً</div>
              <p className="text-xs text-slate-500">للشركات الناشئة والمتاجر الفردية</p>
              <ul className="text-xs space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <li className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>فرع واحد فقط (1 Branch)</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>حتى 5 موظفين</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>حضور GPS وبوابة المشرف</span>
                </li>
              </ul>
            </div>

            {/* Pro */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-indigo-600 shadow-md relative space-y-3">
              <span className="absolute top-3 end-3 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                الأكثر طلباً
              </span>
              <span className="text-xs font-bold text-indigo-600 block uppercase">Pro</span>
              <div className="text-2xl font-black">
                199 <span className="text-xs font-normal text-slate-400">ريال / شهرياً</span>
              </div>
              <p className="text-xs text-slate-500">للشركات المتوسطة والمتوسعة</p>
              <ul className="text-xs space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <li className="flex items-center gap-1.5 font-bold text-indigo-600">
                  <Check className="w-3.5 h-3.5" />
                  <span>حتى 5 فروع معتمدة</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold text-indigo-600">
                  <Check className="w-3.5 h-3.5" />
                  <span>حتى 50 موظفاً</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>تصدير تقارير Excel و PDF</span>
                </li>
              </ul>
            </div>

            {/* Business */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-3">
              <span className="text-xs font-bold text-purple-600 block uppercase">Business</span>
              <div className="text-2xl font-black">
                499 <span className="text-xs font-normal text-slate-400">ريال / شهرياً</span>
              </div>
              <p className="text-xs text-slate-500">للمؤسسات والشركات الكبيرة</p>
              <ul className="text-xs space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <li className="flex items-center gap-1.5 font-bold text-purple-600">
                  <Check className="w-3.5 h-3.5" />
                  <span>فروع غير محدودة (Unlimited)</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold text-purple-600">
                  <Check className="w-3.5 h-3.5" />
                  <span>موظفون غير محدودين (Unlimited)</span>
                </li>
                <li className="flex items-center gap-1.5 font-bold">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>دعم فني وأولوية قصوى</span>
                </li>
              </ul>
            </div>
          </div>

          {/* WhatsApp Upgrade Option (Fast & Flexible for Saudi, Yemen & GCC) */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-start">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>ترقية فورية ميسرة</span>
              </div>
              <h3 className="text-base font-extrabold">تواصل عبر واتساب لإتمام الترقية المباشرة</h3>
              <p className="text-xs text-emerald-100 max-w-xl">
                للشركات في المملكة العربية السعودية واليمن وكافة الدول: نوفر لك خيارات تحويل بنكي محلي ودفع مرن مع تفعيل فوري للباقة عبر فريق خدمة العملاء.
              </p>
            </div>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `مرحباً فريق يومي، أود ترقية اشتراك منشأتنا (${company?.name || ""}) إلى باقة ${requestedPlan.toUpperCase()} (${billingCycle === "yearly" ? "سنوي" : "شهري"}). كود الشركة: ${company?.invite_code || ""}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl font-bold bg-white text-emerald-950 hover:bg-emerald-50 transition text-xs shadow-md shrink-0 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <span>تواصل عبر واتساب للترقية الآن</span>
            </a>
          </div>

          {/* Official Bank Transfer Details & Upgrade Request Form */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Transfer Details (Optional / Collapsible) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-indigo-600" />
                  <span>{t("bank_transfer_info")}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBankDetails(!showBankDetails)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>{showBankDetails ? "إخفاء التفاصيل" : "عرض بيانات الحساب"}</span>
                  {showBankDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {showBankDetails ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2.5 animate-fade-in-up">
                  <div>
                    <span className="text-slate-400 block">{t("bank_name")}:</span>
                    <span className="font-bold">
                      {platformSettings?.bank_transfer_details?.bank_name || "مصرف الراجحي (Al Rajhi Bank)"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">{t("account_name")}:</span>
                    <span className="font-bold">
                      {platformSettings?.bank_transfer_details?.account_name || "مؤسسة يومي لتقنية المعلومات"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block">{t("iban")}:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm block">
                      {platformSettings?.bank_transfer_details?.iban || "SA4480000456608010123456"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 text-center space-y-1">
                  <p className="font-bold text-slate-700 dark:text-slate-300">التحويل البنكي المباشر (اختياري)</p>
                  <p>انقر على "عرض بيانات الحساب" للاطلاع على الآيبان والحساب البنكي، أو راسلنا عبر واتساب أعلاه.</p>
                </div>
              )}
            </div>

            {/* Upgrade Submission Form */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <h3 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                <span>تقديم طلب ترقية وإرسال الإيصال</span>
              </h3>

              {upgradeAlert && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold border ${
                    upgradeAlert.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                  }`}
                >
                  {upgradeAlert.text}
                </div>
              )}

              <form onSubmit={handleSubmitUpgrade} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      الباقة المطلوبة *
                    </label>
                    <select
                      value={requestedPlan}
                      onChange={(e) => setRequestedPlan(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="pro">باقة Pro (5 فروع / 50 موظف)</option>
                      <option value="business">باقة Business (غير محدود)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      دورة الفوترة *
                    </label>
                    <select
                      value={billingCycle}
                      onChange={(e) => setBillingCycle(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="monthly">شهري (Monthly)</option>
                      <option value="yearly">سنوي (خصم شهرين مجاناً)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t("receipt_link")} *
                  </label>
                  <input
                    type="text"
                    required
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    placeholder="رابط صورة الإيصال أو رقم الحوالة المرجعي..."
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submittingUpgrade}
                    className="w-full py-2.5 px-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {submittingUpgrade ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{t("upgrade_request_btn")}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Past Upgrade Requests Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold pb-2 border-b border-slate-100 dark:border-slate-700">
              {t("upgrade_history_title")}
            </h3>

            {loadingHistory ? (
              <div className="py-8 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-xs">{t("loading")}</p>
              </div>
            ) : upgradeHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                لا توجد طلبات ترقية سابقة مسجلة.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3">تاريخ الطلب</th>
                      <th className="p-3">الباقة المطلوبة</th>
                      <th className="p-3">الدورة</th>
                      <th className="p-3">مرجع الإيصال</th>
                      <th className="p-3">الحالة</th>
                      <th className="p-3">ملاحظة الإدارة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {upgradeHistory.map((req) => (
                      <tr key={req.id}>
                        <td className="p-3 font-mono">
                          {new Date(req.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 font-bold uppercase text-indigo-600">
                          {req.requested_plan}
                        </td>
                        <td className="p-3">
                          {req.billing_cycle === "yearly" ? "سنوي" : "شهري"}
                        </td>
                        <td className="p-3 truncate max-w-[150px]">
                          {req.receipt_url || "--"}
                        </td>
                        <td className="p-3">
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
                              ? "تم التفعيل"
                              : req.status === "rejected"
                              ? "مرفوض"
                              : "قيد المراجعة"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500">
                          {req.admin_note || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
