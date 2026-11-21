"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";
import { generateQrToken } from "@/lib/attendance/qr";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Clock,
  Maximize2,
  Minimize2,
  MapPin,
  RefreshCw,
  Building2,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";

interface KioskParams {
  params: Promise<{ id: string }>;
}

export default function BranchQrKioskPage({ params }: KioskParams) {
  const resolvedParams = use(params);
  const branchId = resolvedParams.id;

  const { t, dir } = useLanguage();
  const supabase = createClient();

  const [branch, setBranch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Kiosk dynamic token & countdown
  const [qrToken, setQrToken] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [currentTime, setCurrentTime] = useState<string>("");
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  // 1. Fetch branch details
  useEffect(() => {
    async function loadBranch() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("branches")
          .select("id, name, address, qr_secret, company_id, require_selfie")
          .eq("id", branchId)
          .single();

        if (error || !data) {
          throw new Error(error?.message || "Branch not found");
        }
        setBranch(data);
      } catch (err: any) {
        console.error("Kiosk error:", err);
        setErrorMsg(err.message || "Failed to load branch kiosk");
      } finally {
        setLoading(false);
      }
    }

    loadBranch();
  }, [branchId]);

  // 2. Live clock updater (every 1 second)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("ar-SA", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString("ar-SA", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 3. 60-Second Dynamic QR Token and countdown
  useEffect(() => {
    if (!branch) return;

    let isMounted = true;

    const refreshQr = async () => {
      const token = await generateQrToken(branch.id, branch.qr_secret || "yawmi-secret");
      if (isMounted) {
        setQrToken(token);
      }
    };

    refreshQr();

    const interval = setInterval(() => {
      const now = Date.now();
      const currentSecond = Math.floor((now % 60000) / 1000);
      const remaining = 60 - currentSecond;
      setSecondsRemaining(remaining);

      // If at boundary (0 or 60), regenerate token
      if (remaining === 60 || remaining === 1) {
        refreshQr();
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [branch]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white font-cairo">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-sm font-semibold">{t("loading")}</span>
        </div>
      </div>
    );
  }

  if (errorMsg || !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-cairo">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-800 border border-slate-700 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">تعذر فتح الكشك</h2>
          <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
          <Link
            href="/dashboard/branches"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            <ArrowIcon className="w-4 h-4" />
            <span>العودة للفروع</span>
          </Link>
        </div>
      </div>
    );
  }

  // Progress percentage (0% to 100%)
  const progressPercent = (secondsRemaining / 60) * 100;

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-950 text-white selection:bg-indigo-500 selection:text-white select-none overflow-hidden font-cairo">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <YawmiLogo size="md" />
          <div className="h-6 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
            <MapPin className="w-4 h-4" />
            <span>{branch.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isFullscreen ? t("kiosk_exit_fullscreen") : t("kiosk_fullscreen")}
            </span>
          </button>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Kiosk Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full">
        {/* Live Clock Display */}
        <div className="mb-6">
          <div className="text-4xl sm:text-6xl font-black font-mono tracking-tight text-white mb-1">
            {currentTime}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 font-medium">
            {currentDate}
          </div>
        </div>

        {/* Dynamic QR Code Card */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-white text-slate-900 shadow-2xl shadow-indigo-500/10 border-4 border-indigo-500/30 flex flex-col items-center">
          {qrToken ? (
            <div className="p-3 bg-white rounded-2xl">
              <QRCodeSVG
                value={qrToken}
                size={260}
                level="H"
                includeMargin={false}
              />
            </div>
          ) : (
            <div className="w-[260px] h-[260px] flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          )}

          {/* Micro Watermark */}
          <div className="mt-3 text-[11px] font-mono text-slate-400 tracking-wider">
            {branch.name} &bull; YAWMI KIOSK
          </div>

          {/* Copy Code Helper for PC / Camera-less Testing */}
          {qrToken && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(qrToken);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200 shadow-sm"
              title="نسخ كود الـ QR لتجربة الحضور يدوياً على جهاز الكمبيوتر"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{copied ? "تم نسخ الكود!" : "نسخ الكود للتجربة (Copy Code)"}</span>
            </button>
          )}
        </div>

        {/* 60-Second Countdown & Progress Bar */}
        <div className="w-full max-w-xs mt-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5 text-indigo-400">
              <RefreshCw className={`w-3.5 h-3.5 ${secondsRemaining <= 5 ? "animate-spin text-amber-400" : ""}`} />
              <span>{t("kiosk_refresh_in")}</span>
            </span>
            <span className="font-mono text-white text-sm font-bold">
              {secondsRemaining} {t("kiosk_seconds")}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                secondsRemaining <= 10 ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Guidance Notice */}
        <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400 max-w-md">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{t("kiosk_tip")}</span>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/60 bg-slate-900/40 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>كشك الحضور الذكي &bull; Yawmi Dynamic Attendance Kiosk</span>
        <span className="font-mono text-[10px] text-slate-600">{branch.id}</span>
      </footer>
    </div>
  );
}
