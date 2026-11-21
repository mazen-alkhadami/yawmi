"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountryCodeSelect } from "@/components/country-code-select";
import { mapErrorMessage } from "@/lib/utils/error-mapping";
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  MailCheck,
} from "lucide-react";

export default function RegisterCompanyPage() {
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("+966");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [emailConfirmRequired, setEmailConfirmRequired] = useState(false);

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setEmailConfirmRequired(false);
    setLoading(true);

    try {
      const cleanPhone = phone.trim().replace(/^0+/, "");
      const fullPhone = `${countryCode}${cleanPhone}`;

      // 1. Sign up user via Supabase Auth with company_name, full_name, and phone in user_metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            company_name: companyName.trim(),
            full_name: fullName.trim(),
            phone: fullPhone,
          },
        },
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Failed to create user account.");
      }

      // 2. Check if session was returned immediately (Email confirmation disabled or auto-confirmed)
      if (authData.session) {
        // Call the Security Definer RPC function to create company & profile
        const { error: rpcError } = await supabase.rpc("register_new_company", {
          p_company_name: companyName.trim(),
          p_full_name: fullName.trim(),
          p_phone: fullPhone,
        });

        if (rpcError) {
          throw new Error(rpcError.message || "Failed to register company records.");
        }

        setSuccessMsg(t("register_success"));
        setTimeout(() => {
          router.push("/dashboard");
        }, 1200);
      } else {
        // Email confirmation is enabled in Supabase!
        setEmailConfirmRequired(true);
        setSuccessMsg(t("email_confirm_required"));
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setErrorMsg(mapErrorMessage(err, language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <Link href="/" className="transition hover:opacity-90">
          <YawmiLogo size="md" />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Register Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/80 p-6 sm:p-8 shadow-xl shadow-slate-900/5">
          {emailConfirmRequired ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-200 dark:border-indigo-800 shadow-sm">
                <MailCheck className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white font-cairo">
                تأكيد البريد الإلكتروني
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                {t("email_confirm_required")}
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all w-full"
                >
                  <span>{t("login_button")}</span>
                  <ArrowIcon className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-cairo">
                  {t("register_title")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {t("register_subtitle")}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("company_name_label")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t("company_name_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <Building2 className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                {/* Manager Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("manager_name_label")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("manager_name_placeholder")}
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                {/* Email and Phone Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t("email_label")} <span className="text-red-500">*</span>
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
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      {t("phone_label")} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 relative focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500 transition-all" dir="ltr">
                      <CountryCodeSelect
                        value={countryCode}
                        onChange={setCountryCode}
                        lang={language}
                      />
                      <div className="flex-1 min-w-0 border-s border-slate-200 dark:border-slate-700">
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="5XXXXXXXX"
                          className="w-full h-11 px-3 bg-transparent text-slate-900 dark:text-white text-sm focus:outline-none font-mono tracking-wide"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t("password_label")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (6+ characters)"
                      className="w-full px-3.5 py-2.5 ps-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                      dir="ltr"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  </div>
                </div>

                {/* Mandatory Consent Checkbox */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-900"
                    />
                    <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {language === "ar" ? (
                        <>
                          أوافق على{" "}
                          <Link href="/terms" target="_blank" className="font-bold text-indigo-600 hover:underline">
                            شروط الاستخدام
                          </Link>{" "}
                          و{" "}
                          <Link href="/privacy" target="_blank" className="font-bold text-indigo-600 hover:underline">
                            سياسة الخصوصية
                          </Link>
                        </>
                      ) : (
                        <>
                          I agree to the{" "}
                          <Link href="/terms" target="_blank" className="font-bold text-indigo-600 hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link href="/privacy" target="_blank" className="font-bold text-indigo-600 hover:underline">
                            Privacy Policy
                          </Link>
                        </>
                      )}
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={!agreedToTerms || loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-4"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t("registering")}</span>
                    </>
                  ) : (
                    <>
                      <span>{t("register_button")}</span>
                      <ArrowIcon className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Already have account */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/80 text-center text-xs">
                <Link
                  href="/login"
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {t("already_have_account")}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        يَومي | Yawmi &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
