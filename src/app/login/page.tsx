"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { mapErrorMessage } from "@/lib/utils/error-mapping";
import {
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  User,
  Phone,
  Sparkles,
  X,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  // Standard Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inline Setup State (for accounts without initial profile/metadata)
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupCompanyName, setSetupCompanyName] = useState("");
  const [setupFullName, setSetupFullName] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Forgot Password Modal State
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetMessage(null);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetMessage({
        type: "success",
        text:
          language === "ar"
            ? "تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح! يرجى فحص صندوق الوارد."
            : "Password reset link sent to your email! Please check your inbox.",
      });
    } catch (err: any) {
      setResetMessage({
        type: "error",
        text: err?.message || "فشل إرسال رابط الاستعادة.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const routeByRole = (role: string) => {
    switch (role) {
      case "super_admin":
        router.push("/hq");
        break;
      case "company_manager":
        router.push("/dashboard");
        break;
      case "branch_supervisor":
        router.push("/supervisor");
        break;
      case "employee":
        router.push("/app");
        break;
      default:
        router.push("/dashboard");
        break;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || t("login_error"));
      }

      const user = authData.user;

      // 2. Fetch user profile from public.profiles cleanly
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, status, company_id")
        .eq("id", user.id)
        .maybeSingle();

      // If that query returns an error, display the exact error (do NOT show inline setup form)
      if (profileError) {
        console.error("Profiles query error:", profileError);
        throw new Error(profileError.message || "Failed to load user profile from database.");
      }

      // Only show the inline setup form if !profileError && !profile
      if (!profile) {
        const metadata = user.user_metadata || {};
        const metaInviteCode = metadata.company_invite_code?.trim();
        const metaCompanyName = metadata.company_name?.trim();
        const metaFullName = metadata.full_name?.trim();
        const metaPhone = metadata.phone?.trim() || "";

        // If employee signup metadata with company_invite_code
        if (metaInviteCode && metaFullName) {
          const { error: joinError } = await supabase.rpc("join_company_by_code", {
            p_invite_code: metaInviteCode,
            p_full_name: metaFullName,
            p_national_id: metadata.national_id?.trim() || "",
            p_nationality: metadata.nationality?.trim() || "",
            p_job_title: metadata.job_title?.trim() || "",
            p_phone: metaPhone,
          });

          if (joinError) throw joinError;
          await supabase.auth.signOut();
          throw new Error(t("join_success_desc"));
        }

        // If metadata has company_name and full_name, automatically create company & profile
        if (metaCompanyName && metaFullName) {
          const { error: rpcError } = await supabase.rpc("register_new_company", {
            p_company_name: metaCompanyName,
            p_full_name: metaFullName,
            p_phone: metaPhone,
          });

          if (rpcError) {
            throw new Error(rpcError.message || "Failed to initialize company profile.");
          }

          router.push("/dashboard");
          return;
        }

        // If user_metadata is empty, show inline setup form right here
        setNeedsSetup(true);
        setSetupFullName(metaFullName || "");
        setSetupPhone(metaPhone || "");
        setLoading(false);
        return;
      }

      // 3. Profile exists: Check if user is suspended or pending approval
      if (profile.status === "suspended") {
        await supabase.auth.signOut();
        throw new Error(t("account_suspended"));
      }

      if (profile.status === "pending") {
        await supabase.auth.signOut();
        throw new Error(t("join_success_desc"));
      }

      // 4. If profile.company_id is not null, query public.companies separately to check status
      if (profile.company_id) {
        const { data: company, error: compError } = await supabase
          .from("companies")
          .select("status")
          .eq("id", profile.company_id)
          .maybeSingle();

        if (compError) {
          console.error("Company query error:", compError);
        }

        if (company && company.status === "suspended") {
          await supabase.auth.signOut();
          throw new Error(t("company_suspended"));
        }
      }

      // 5. Redirect cleanly based on profile.role
      routeByRole(profile.role);
    } catch (err: any) {
      console.error("Login error:", err);
      setErrorMsg(mapErrorMessage(err, language));
    } finally {
      setLoading(false);
    }
  };

  const handleInlineSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSetupLoading(true);

    try {
      const { error: rpcError } = await supabase.rpc("register_new_company", {
        p_company_name: setupCompanyName.trim(),
        p_full_name: setupFullName.trim(),
        p_phone: setupPhone.trim(),
      });

      if (rpcError) {
        throw new Error(rpcError.message || "Failed to complete setup.");
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Inline setup error:", err);
      setErrorMsg(mapErrorMessage(err, language));
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="transition hover:opacity-90">
          <YawmiLogo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xl shadow-slate-900/5">
          {errorMsg && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {needsSetup ? (
            /* Inline Setup Form */
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white font-cairo">
                  {t("inline_setup_title")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("inline_setup_subtitle")}
                </p>
              </div>

              <form onSubmit={handleInlineSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("company_name_label")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={setupCompanyName}
                      onChange={(e) => setSetupCompanyName(e.target.value)}
                      placeholder={t("company_name_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("manager_name_label")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={setupFullName}
                      onChange={(e) => setSetupFullName(e.target.value)}
                      placeholder={t("manager_name_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("phone_label")}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={setupPhone}
                      onChange={(e) => setSetupPhone(e.target.value)}
                      placeholder={t("phone_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      dir="ltr"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                >
                  {setupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("completing_setup")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("complete_setup_btn")}</span>
                      <ArrowIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Standard Login Form */
            <>
              <div className="text-center mb-8">
                <div className="inline-flex justify-center mb-4">
                  <YawmiLogo size="lg" showText={false} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-cairo">
                  {t("login_title")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("login_subtitle")}
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("email_label")}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("email_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      dir="ltr"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("password_label")}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email || "");
                        setResetMessage(null);
                        setForgotModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {language === "ar" ? "نسيت كلمة المرور؟" : "Forgot Password?"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("password_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      dir="ltr"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("logging_in")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("login_button")}</span>
                      <ArrowIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Links */}
              <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/80 space-y-3 text-center text-xs">
                <div>
                  <Link
                    href="/register"
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {t("register_company_link")}
                  </Link>
                </div>
                <div>
                  <Link
                    href="/join"
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                  >
                    {t("employee_join_link")}
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {language === "ar" ? "استعادة كلمة المرور" : "Reset Password"}
              </span>
              <button
                type="button"
                onClick={() => setForgotModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold border ${
                  resetMessage.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                    : "bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800"
                }`}
              >
                {resetMessage.text}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {language === "ar"
                  ? "أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطاً آمناً لتعيين كلمة مرور جديدة لحسابك."
                  : "Enter your registered email and we will send you a secure link to set a new password."}
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("email_label")}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder={t("email_placeholder")}
                    className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500"
                    dir="ltr"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{language === "ar" ? "إرسال الرابط" : "Send Reset Link"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        يَومي | Yawmi &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
