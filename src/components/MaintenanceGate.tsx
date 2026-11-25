"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePlatformContact } from "@/lib/usePlatformContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { Wrench, MessageCircle, Mail, Loader2 } from "lucide-react";

const GATED_PREFIXES = [
  "/dashboard",
  "/app",
  "/supervisor",
  "/kiosk",
  "/register",
  "/signup",
];

function isPathMatch(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { language } = useLanguage();
  const { maintenanceMode, maintenanceMessage, whatsappUrl, supportEmail } = usePlatformContact();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  // Synchronously exempt /hq and /hq/* before any async checks
  const isHqRoute = isPathMatch(pathname, "/hq");
  const isLoginRoute = isPathMatch(pathname, "/login");
  const isGatedRoute = GATED_PREFIXES.some((prefix) => isPathMatch(pathname, prefix));

  useEffect(() => {
    if (!maintenanceMode || isHqRoute || !isGatedRoute) {
      setRoleChecked(true);
      return;
    }

    let active = true;
    setRoleChecked(false);
    const checkRole = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        let userId = sessionData?.session?.user?.id;
        if (!userId) {
          const { data: userData } = await supabase.auth.getUser();
          userId = userData?.user?.id;
        }
        if (userId) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userId)
            .maybeSingle();
          if (active) {
            setIsSuperAdmin(prof?.role === "super_admin");
          }
        } else if (active) {
          setIsSuperAdmin(false);
        }
      } catch {
        if (active) setIsSuperAdmin(false);
      } finally {
        if (active) setRoleChecked(true);
      }
    };

    checkRole();
    return () => {
      active = false;
    };
  }, [maintenanceMode, isHqRoute, isGatedRoute]);

  // 1. /hq, public marketing (/), /guide, /privacy, /terms, or maintenance off -> always open
  if (isHqRoute || !maintenanceMode) {
    return <>{children}</>;
  }

  // 2. /login -> keep login form accessible for super_admin, with a clear maintenance notice banner
  if (isLoginRoute) {
    return (
      <>
        <div className="bg-amber-50 dark:bg-amber-950/70 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 text-xs font-cairo text-amber-900 dark:text-amber-200">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2 text-center">
            <Wrench className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-bold">
              {language === "ar"
                ? `وضع الصيانة مفعّل حالياً: ${maintenanceMessage}`
                : `Maintenance Mode Active: ${maintenanceMessage}`}
            </span>
          </div>
        </div>
        {children}
      </>
    );
  }

  // 3. Non-gated public routes (/, /guide, /privacy, /terms, etc.) -> always open
  if (!isGatedRoute) {
    return <>{children}</>;
  }

  // 4. Wait for role check on gated routes so super_admin is never locked out or flashed
  if (!roleChecked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // 5. Gated operational & registration routes during maintenance -> Maintenance Screen
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 font-cairo">
      <div className="max-w-md w-full rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-8 text-center space-y-5">
        <div className="flex justify-center">
          <YawmiLogo size="lg" showText={true} />
        </div>

        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <Wrench className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">
            {language === "ar" ? "المنصة في وضع الصيانة" : "Platform Under Maintenance"}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {maintenanceMessage}
          </p>
        </div>

        {(whatsappUrl || supportEmail) && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2.5">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{language === "ar" ? "تواصل عبر واتساب" : "WhatsApp Support"}</span>
              </a>
            )}
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Mail className="w-4 h-4" />
                <span>{language === "ar" ? "البريد الإلكتروني" : "Email Support"}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
