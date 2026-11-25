"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { usePlatformContact } from "@/lib/usePlatformContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { Wrench, MessageCircle, Mail } from "lucide-react";

const EXEMPT_PREFIXES = ["/hq", "/login", "/reset-password"];

export function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const { language } = useLanguage();
  const { maintenanceMode, maintenanceMessage, whatsappUrl, supportEmail } = usePlatformContact();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const isExemptRoute = EXEMPT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  useEffect(() => {
    if (!maintenanceMode || isExemptRoute) return;

    let active = true;
    const checkRole = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;
        const { data: prof } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userId)
          .maybeSingle();
        if (active && prof?.role === "super_admin") {
          setIsSuperAdmin(true);
        }
      } catch {
        // ignore
      }
    };
    checkRole();
    return () => {
      active = false;
    };
  }, [maintenanceMode, isExemptRoute]);

  if (!maintenanceMode || isExemptRoute || isSuperAdmin) {
    return <>{children}</>;
  }

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
