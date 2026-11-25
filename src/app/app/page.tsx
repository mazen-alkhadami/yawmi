"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { YawmiLogo } from "@/components/yawmi-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProductTour, TourStep } from "@/components/ProductTour";
import { DigitalIdModal } from "@/components/DigitalIdModal";
import { verifyQrToken } from "@/lib/attendance/qr";
import { calculateHaversineDistanceMeters } from "@/lib/attendance/geo";
import { getOrCreateDeviceId, verifyDeviceBinding } from "@/lib/attendance/device";
import {
  QuickUnlockSettings,
  getQuickUnlockSettings,
  saveQuickUnlockSettings,
  hashPin,
  verifyPin,
  checkBiometricSupport,
  registerBiometricCredential,
  verifyBiometricCredential,
  isSessionUnlocked,
  setSessionUnlocked,
} from "@/lib/attendance/quick-unlock";
import { getCachedData, setCachedData, clearUserCache } from "@/lib/instantCache";
import { applyDynamicThemeColor, THEME_COLOR_PRESETS } from "@/lib/themeColor";
import {
  Home,
  History,
  FileCheck2,
  User,
  Clock,
  MapPin,
  CalendarClock,
  Camera,
  CheckCircle2,
  AlertCircle,
  QrCode,
  LogOut,
  Smartphone,
  ShieldAlert,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Send,
  X,
  RefreshCw,
  Plus,
  Inbox,
  FileText,
  Calendar,
  CheckCircle,
  Check,
  Fingerprint,
  Key,
  ShieldCheck,
  Lock,
  Delete,
  HelpCircle,
  Bell,
  Megaphone,
  Download,
  Share,
  Palmtree,
  Timer,
} from "lucide-react";

export interface FeedNotificationItem {
  id: string;
  kind: "announcement" | "request_status";
  title: string;
  body: string;
  status?: "pending" | "in_review" | "approved" | "rejected";
  priority?: "normal" | "urgent";
  timestamp: string;
  source: "company" | "request" | "ai";
}

function buildEmployeeFeedNotifications(
  announcements: any[],
  outgoingRequests: any[],
  language: "ar" | "en"
): FeedNotificationItem[] {
  const annItems: FeedNotificationItem[] = (announcements || []).map((ann) => ({
    id: `ann_${ann.id}`,
    kind: "announcement",
    title: ann.title,
    body: ann.body,
    priority: ann.priority || "normal",
    timestamp: ann.created_at,
    source: "company",
  }));

  const reqLabel = (type: string) => {
    switch (type) {
      case "leave":
        return language === "ar" ? "طلب إجازة" : "Leave Request";
      case "permission":
        return language === "ar" ? "طلب استئذان" : "Permission Request";
      case "manual_edit":
        return language === "ar" ? "تعديل حضور يدوي" : "Manual Edit";
      case "shift_change":
        return language === "ar" ? "تغيير شفت" : "Shift Change";
      default:
        return language === "ar" ? "إعادة ربط جهاز" : "Device Reset";
    }
  };

  const reqItems: FeedNotificationItem[] = (outgoingRequests || []).map((req) => ({
    id: `req_${req.id}`,
    kind: "request_status",
    title: reqLabel(req.type),
    body:
      req.review_note ||
      (req.status === "approved"
        ? language === "ar"
          ? "تمت الموافقة على طلبك بنجاح."
          : "Your request has been approved."
        : req.status === "rejected"
        ? language === "ar"
          ? "تم رفض الطلب من الإدارة."
          : "Your request was rejected."
        : language === "ar"
        ? "طلبك قيد المراجعة لدى الإدارة."
        : "Your request is currently under review."),
    status: req.status,
    timestamp: req.updated_at || req.created_at,
    source: "request",
  }));

  return [...annItems, ...reqItems].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export default function EmployeeApp() {
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"home" | "history" | "requests" | "profile">("home");
  const [loading, setLoading] = useState(true);

  // User & Company Data
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [selectedThemeColor, setSelectedThemeColor] = useState<string>("#4F46E5");
  const [themeSaveStatus, setThemeSaveStatus] = useState<string | null>(null);
  const [branch, setBranch] = useState<any>(null);
  const [shift, setShift] = useState<any>(null);
  const [availableShifts, setAvailableShifts] = useState<any[]>([]);

  // Today's Attendance Log & History
  const [todayLog, setTodayLog] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // Requests Sub-tab & Data
  const [reqSubTab, setReqSubTab] = useState<"outgoing" | "incoming">("outgoing");
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [newReqModalOpen, setNewReqModalOpen] = useState(false);
  const [reqType, setReqType] = useState<"manual_edit" | "leave" | "permission" | "shift_change" | "device_reset">("leave");
  const [reqReason, setReqReason] = useState("");
  const [reqDate, setReqDate] = useState(new Date().toISOString().split("T")[0]);
  const [reqStartDate, setReqStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [reqEndDate, setReqEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reqCheckInTime, setReqCheckInTime] = useState("08:00");
  const [reqCheckOutTime, setReqCheckOutTime] = useState("16:00");
  const [reqPermTimeFrom, setReqPermTimeFrom] = useState("10:00");
  const [reqPermTimeTo, setReqPermTimeTo] = useState("12:00");
  const [reqTargetShift, setReqTargetShift] = useState("");
  const [submittingReq, setSubmittingReq] = useState(false);
  const [reqAlert, setReqAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");

  // Attendance Action Modal
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"checkin" | "checkout">("checkin");
  const [step, setStep] = useState<"qr" | "gps" | "selfie" | "submitting" | "success" | "error">("qr");

  // Flow State
  const [qrInput, setQrInput] = useState("");
  const [scannedToken, setScannedToken] = useState("");
  const [isScanningQr, setIsScanningQr] = useState(false);
  const [showManualQr, setShowManualQr] = useState(false);
  const qrScannerRef = useRef<any>(null);
  const [gpsDistance, setGpsDistance] = useState<number | null>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Camera stream for selfie
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Quick Unlock (6-Digit PIN & Biometrics)
  const [lockChecked, setLockChecked] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [quickSettings, setQuickSettings] = useState<QuickUnlockSettings>({
    pinEnabled: false,
    pinHash: null,
    biometricEnabled: false,
    biometricCredentialId: null,
  });
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // PIN Setup Modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<"enter" | "confirm">("enter");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  // Live Shift Elapsed Timer (HH:MM:SS)
  const [elapsedTimer, setElapsedTimer] = useState("00:00:00");

  // Company Announcements & Notifications Feed
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [feedDrawerOpen, setFeedDrawerOpen] = useState(false);
  const [unreadFeedCount, setUnreadFeedCount] = useState(0);

  // Smart PWA Install Banner & Tracking
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIosSafari, setIsIosSafari] = useState(false);
  const [installingPwa, setInstallingPwa] = useState(false);

  // Interactive Employee Product Tour
  const [tourOpen, setTourOpen] = useState(false);
  const [digitalIdOpen, setDigitalIdOpen] = useState(false);

  // Live Clock
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

  // Live Shift Elapsed Timer Effect
  useEffect(() => {
    if (!todayLog?.check_in_at || todayLog?.check_out_at) {
      setElapsedTimer("00:00:00");
      return;
    }

    const updateElapsed = () => {
      const start = new Date(todayLog.check_in_at).getTime();
      const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
      const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
      const secs = String(diffSec % 60).padStart(2, "0");
      setElapsedTimer(`${hrs}:${mins}:${secs}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [todayLog?.check_in_at, todayLog?.check_out_at]);

  // Record PWA Install to Supabase (deduplicated per user/device)
  const recordPwaInstall = async (platformName: string, targetUser?: any, targetProfile?: any) => {
    const activeUser = targetUser || user;
    const activeProfile = targetProfile || profile;
    if (!activeUser?.id || typeof window === "undefined") return;

    const storageKey = `yawmi_pwa_installed_${activeUser.id}`;
    if (localStorage.getItem(storageKey)) return;

    try {
      const { error } = await supabase.from("pwa_installs").insert([
        {
          user_id: activeUser.id,
          company_id: activeProfile?.company_id || null,
          role: activeProfile?.role || "employee",
          platform: platformName,
          user_agent: navigator.userAgent,
        },
      ]);
      if (!error) {
        localStorage.setItem(storageKey, new Date().toISOString());
      }
    } catch (err) {
      console.error("PWA install log error:", err);
    } finally {
      setShowInstallBanner(false);
    }
  };

  // Smart PWA Install Banner Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    const dismissed = localStorage.getItem("yawmi_pwa_banner_dismissed");
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);

    if (isIos && isSafari) {
      setIsIosSafari(true);
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!localStorage.getItem("yawmi_pwa_banner_dismissed")) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBanner(false);
      recordPwaInstall("android_chrome");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [user?.id, profile?.company_id]);

  const handleInstallPwaClick = async () => {
    if (isIosSafari) {
      await recordPwaInstall("ios_safari");
      return;
    }
    if (!deferredPrompt) return;
    setInstallingPwa(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        await recordPwaInstall("android_chrome");
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error("PWA prompt error:", err);
    } finally {
      setInstallingPwa(false);
    }
  };

  const handleDismissInstallBanner = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("yawmi_pwa_banner_dismissed", "1");
    }
    setShowInstallBanner(false);
  };

  // Synchronous Instant Lock Check (< 50ms) before any network/auth await
  const runInstantLockPrecheck = (): boolean => {
    if (typeof window === "undefined") return false;
    const cached = getCachedData<any>("employee_app");
    if (cached) {
      if (cached.user) setUser(cached.user);
      if (cached.profile) setProfile(cached.profile);
      if (cached.companyInfo) setCompanyInfo(cached.companyInfo);
      if (cached.branch !== undefined) setBranch(cached.branch);
      if (cached.shift !== undefined) setShift(cached.shift);
      if (cached.availableShifts) setAvailableShifts(cached.availableShifts);
      if (cached.announcements) setAnnouncements(cached.announcements);
      if (cached.todayLog !== undefined) setTodayLog(cached.todayLog);
      if (cached.historyLogs) setHistoryLogs(cached.historyLogs);
      if (cached.outgoingRequests) setOutgoingRequests(cached.outgoingRequests);
      if (cached.incomingRequests) setIncomingRequests(cached.incomingRequests);
    }

    let lockUserId: string | null =
      cached?.user?.id || localStorage.getItem("yawmi_last_user_id");

    const cachedThemeColor =
      cached?.profile?.theme_color ||
      (lockUserId ? localStorage.getItem(`yawmi_theme_color_${lockUserId}`) : null) ||
      cached?.companyInfo?.primary_color ||
      null;
    if (cachedThemeColor) {
      setSelectedThemeColor(cachedThemeColor);
      applyDynamicThemeColor(cachedThemeColor);
    }

    if (!lockUserId) {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("yawmi_pin_enabled_") && localStorage.getItem(k) === "true") {
          lockUserId = k.replace("yawmi_pin_enabled_", "");
          break;
        }
      }
    }

    if (lockUserId) {
      const quick = getQuickUnlockSettings(lockUserId);
      setQuickSettings(quick);
      if ((quick.pinEnabled || quick.biometricEnabled) && !isSessionUnlocked(lockUserId)) {
        setUser((prev: any) => prev || { id: lockUserId });
        setIsLocked(true);
        setLockChecked(true);
        setLoading(false);
        return true;
      }
    }

    if (cached) {
      setLockChecked(true);
      setLoading(false);
    }
    return false;
  };

  // Fetch Employee Data (Stale-While-Revalidate + Parallel Queries)
  const fetchEmployeeData = async () => {
    const lockedImmediately = runInstantLockPrecheck();
    if (!lockedImmediately && !getCachedData<any>("employee_app")) {
      setLoading(true);
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let authUser = sessionData?.session?.user || null;
      if (!authUser) {
        const { data: userData } = await supabase.auth.getUser();
        authUser = userData?.user || null;
      }

      if (!authUser) {
        clearUserCache();
        router.push("/login");
        return;
      }
      setUser(authUser);
      if (typeof window !== "undefined") {
        localStorage.setItem("yawmi_last_user_id", authUser.id);
      }

      // Fetch profile
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (profErr || !prof) {
        clearUserCache();
        router.push("/login");
        return;
      }
      setProfile(prof);

      const today = new Date().toISOString().split("T")[0];

      // Run all independent queries in parallel
      const [
        companyRes,
        branchRes,
        shiftRes,
        allShiftsRes,
        annRes,
        todayLogRes,
        historyRes,
        outReqsRes,
        inReqsRes,
      ] = await Promise.all([
        prof.company_id
          ? supabase.from("companies").select("id, name, logo_url, primary_color").eq("id", prof.company_id).maybeSingle()
          : Promise.resolve({ data: null }),
        prof.branch_id
          ? supabase.from("branches").select("*").eq("id", prof.branch_id).single()
          : Promise.resolve({ data: null }),
        prof.shift_template_id
          ? supabase.from("shift_templates").select("*").eq("id", prof.shift_template_id).single()
          : Promise.resolve({ data: null }),
        prof.company_id
          ? supabase.from("shift_templates").select("id, name").eq("company_id", prof.company_id)
          : Promise.resolve({ data: [] }),
        prof.company_id
          ? supabase
              .from("announcements")
              .select("*")
              .eq("company_id", prof.company_id)
              .order("created_at", { ascending: false })
              .limit(15)
          : Promise.resolve({ data: [] }),
        supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", authUser.id)
          .eq("shift_date", today)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("attendance_logs")
          .select("*")
          .eq("employee_id", authUser.id)
          .order("shift_date", { ascending: false })
          .limit(30),
        supabase
          .from("requests")
          .select("*")
          .eq("employee_id", authUser.id)
          .eq("direction", "outgoing")
          .order("created_at", { ascending: false }),
        supabase
          .from("requests")
          .select("*")
          .eq("employee_id", authUser.id)
          .eq("direction", "incoming")
          .order("created_at", { ascending: false }),
      ]);

      const compData = companyRes.data || null;
      const bData = branchRes.data || null;
      const sData = shiftRes.data || null;
      const allShifts = allShiftsRes.data || [];
      const rawAnnouncements = annRes.data || [];
      const loadedAnnouncements = rawAnnouncements.filter(
        (ann: any) => !ann.branch_id || ann.branch_id === prof.branch_id
      );
      const logData = todayLogRes.data || null;
      const logs = historyRes.data || [];
      const outReqsList = outReqsRes.data || [];
      const inReqsList = inReqsRes.data || [];

      const activeColor =
        prof.theme_color ||
        (typeof window !== "undefined" ? localStorage.getItem(`yawmi_theme_color_${authUser.id}`) : null) ||
        compData?.primary_color ||
        "#4F46E5";
      if (prof.theme_color && typeof window !== "undefined") {
        localStorage.setItem(`yawmi_theme_color_${authUser.id}`, prof.theme_color);
      }
      setCompanyInfo(compData);
      setSelectedThemeColor(activeColor);
      applyDynamicThemeColor(activeColor);

      setBranch(bData);
      setShift(sData);
      setAvailableShifts(allShifts);
      setAnnouncements(loadedAnnouncements);
      setTodayLog(logData);
      setHistoryLogs(logs);
      setOutgoingRequests(outReqsList);
      setIncomingRequests(inReqsList);

      // Persist fresh payload in instantCache
      setCachedData("employee_app", {
        user: { id: authUser.id, email: authUser.email },
        profile: prof,
        companyInfo: compData,
        branch: bData,
        shift: sData,
        availableShifts: allShifts,
        announcements: loadedAnnouncements,
        todayLog: logData,
        historyLogs: logs,
        outgoingRequests: outReqsList,
        incomingRequests: inReqsList,
      });

      // Compute unread feed count across announcements AND under-review / approved / rejected requests
      if (typeof window !== "undefined") {
        const lastSeenStr = localStorage.getItem(`yawmi_feed_seen_${authUser.id}`);
        const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
        const feedItems = buildEmployeeFeedNotifications(
          loadedAnnouncements,
          outReqsList,
          language
        );
        const unreadCount = feedItems.filter(
          (item) => new Date(item.timestamp).getTime() > lastSeenTime
        ).length;
        setUnreadFeedCount(unreadCount);
      }

      // Check Quick Unlock Settings
      const unlockSettings = getQuickUnlockSettings(authUser.id);
      setQuickSettings(unlockSettings);
      checkBiometricSupport().then(setBiometricSupported);

      const lockedNow =
        (unlockSettings.pinEnabled || unlockSettings.biometricEnabled) &&
        !isSessionUnlocked(authUser.id);
      if (lockedNow) {
        setIsLocked(true);
      } else if (
        !prof.has_completed_tour &&
        typeof window !== "undefined" &&
        !localStorage.getItem(`yawmi_tour_done_${authUser.id}`)
      ) {
        setTourOpen(true);
      }
      setLockChecked(true);
    } catch (err) {
      console.error("Employee app load error:", err);
      setLockChecked(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (employeeId: string) => {
    try {
      const { data: outReqs } = await supabase
        .from("requests")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("direction", "outgoing")
        .order("created_at", { ascending: false });
      setOutgoingRequests(outReqs || []);

      const { data: inReqs } = await supabase
        .from("requests")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("direction", "incoming")
        .order("created_at", { ascending: false });
      setIncomingRequests(inReqs || []);
      return outReqs || [];
    } catch (err) {
      console.error("Error fetching requests:", err);
      return [];
    }
  };

  const syncAnnouncementsInCache = (nextAnnouncements: any[], nextOutReqs?: any[]) => {
    const cached = getCachedData<any>("employee_app");
    if (cached) {
      setCachedData("employee_app", {
        ...cached,
        announcements: nextAnnouncements,
        ...(nextOutReqs ? { outgoingRequests: nextOutReqs } : {}),
      });
    }
  };

  const refreshFeedSilently = async () => {
    if (!profile?.company_id || !user?.id) return;
    try {
      const [annRes, outReqsRes] = await Promise.all([
        supabase
          .from("announcements")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("requests")
          .select("*")
          .eq("employee_id", user.id)
          .eq("direction", "outgoing")
          .order("created_at", { ascending: false }),
      ]);

      const filteredAnns = (annRes.data || []).filter(
        (ann: any) => !ann.branch_id || ann.branch_id === profile.branch_id
      );
      const nextOutReqs = outReqsRes.data || [];

      setAnnouncements(filteredAnns);
      setOutgoingRequests(nextOutReqs);
      syncAnnouncementsInCache(filteredAnns, nextOutReqs);

      if (typeof window !== "undefined") {
        const lastSeenStr = localStorage.getItem(`yawmi_feed_seen_${user.id}`);
        const lastSeenTime = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
        const feedItems = buildEmployeeFeedNotifications(filteredAnns, nextOutReqs, language);
        const unreadCount = feedItems.filter(
          (item) => new Date(item.timestamp).getTime() > lastSeenTime
        ).length;
        setUnreadFeedCount(unreadCount);
      }
    } catch (err) {
      console.error("Silent feed refresh error:", err);
    }
  };

  // Real-time Announcements Subscription (< 1s delivery) + Visibility Re-fetch
  useEffect(() => {
    if (!profile?.company_id || !user?.id) return;

    const channel = supabase
      .channel(`employee_announcements_${profile.company_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newAnn = payload.new as any;
            if (!newAnn.branch_id || newAnn.branch_id === profile.branch_id) {
              setAnnouncements((prev) => {
                if (prev.some((a) => a.id === newAnn.id)) return prev;
                const updated = [newAnn, ...prev];
                syncAnnouncementsInCache(updated);
                return updated;
              });
              setUnreadFeedCount((prev) => prev + 1);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedAnn = payload.new as any;
            setAnnouncements((prev) => {
              const exists = prev.some((a) => a.id === updatedAnn.id);
              const isVisible = !updatedAnn.branch_id || updatedAnn.branch_id === profile.branch_id;
              let nextList = prev;
              if (exists && isVisible) {
                nextList = prev.map((a) => (a.id === updatedAnn.id ? updatedAnn : a));
              } else if (exists && !isVisible) {
                nextList = prev.filter((a) => a.id !== updatedAnn.id);
              } else if (!exists && isVisible) {
                nextList = [updatedAnn, ...prev];
              }
              syncAnnouncementsInCache(nextList);
              return nextList;
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setAnnouncements((prev) => {
                const nextList = prev.filter((a) => a.id !== deletedId);
                syncAnnouncementsInCache(nextList);
                return nextList;
              });
            }
          }
        }
      )
      .subscribe();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        refreshFeedSilently();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [profile?.company_id, profile?.branch_id, user?.id]);

  const handleOpenFeed = () => {
    setFeedDrawerOpen(true);
    setUnreadFeedCount(0);
    if (user?.id && typeof window !== "undefined") {
      localStorage.setItem(`yawmi_feed_seen_${user.id}`, new Date().toISOString());
    }
  };

  const handleCompleteTour = async () => {
    setTourOpen(false);
    setActiveTab("home");
    if (user?.id) {
      if (typeof window !== "undefined") {
        localStorage.setItem(`yawmi_tour_done_${user.id}`, "1");
      }
      try {
        await supabase
          .from("profiles")
          .update({ has_completed_tour: true })
          .eq("id", user.id);
        setProfile((prev: any) => (prev ? { ...prev, has_completed_tour: true } : prev));
      } catch (err) {
        console.error("Error updating tour status:", err);
      }
    }
  };

  const employeeTourSteps: TourStep[] = [
    {
      id: "welcome-status",
      targetId: "tour-home-status",
      titleAr: "مرحباً بك في يومي! حالة الدوام المباشرة",
      titleEn: "Welcome to Yawmi! Live Shift Status",
      descAr: "من هنا تتابع حالة حضورك اليوم، وقت تسجيل الدخول، والعدّاد المباشر لساعات عملك، مع تنبيهات فترة السماح.",
      descEn: "Track your live shift status, check-in timestamp, ticking elapsed hours, and grace-period status.",
      icon: <Timer className="w-5 h-5" />,
      onEnter: () => setActiveTab("home"),
    },
    {
      id: "qr-checkin",
      targetId: "tour-checkin-btn",
      titleAr: "تسجيل الحضور والانصراف بالباركود",
      titleEn: "QR Check-In & Check-Out Scanner",
      descAr: "اضغط هنا لفتح الكاميرا ومسح باركود الفرع مع التحقق من الموقع الجغرافي (GPS) والسيلفي إذا كان مفعلاً.",
      descEn: "Tap here to open your rear camera and scan the branch QR code with instant GPS & optional selfie check.",
      icon: <QrCode className="w-5 h-5" />,
      onEnter: () => setActiveTab("home"),
    },
    {
      id: "leave-balance",
      targetId: "tour-leave-balance",
      titleAr: "رصيد الإجازات السنوية وسجل الحضور",
      titleEn: "Leave Balance & Attendance History",
      descAr: "تابع رصيد إجازاتك السنوية المتبقي واطلب إجازة بضغطة زر، أو استعرض سجل حضورك لآخر 30 يوماً من تبويب السجل.",
      descEn: "View your remaining annual leave days, submit quick leave requests, or inspect your 30-day attendance log.",
      icon: <Palmtree className="w-5 h-5" />,
      onEnter: () => setActiveTab("home"),
    },
    {
      id: "requests-announcements",
      targetId: "tour-nav-requests",
      titleAr: "الطلبات والتعميمات الإدارية",
      titleEn: "Requests & Company Announcements",
      descAr: "قدّم طلبات الإجازة والاستئذان والتعديل اليدوي، وتابع ردود الإدارة وتعميمات الشركة من أيقونة الجرس بالأعلى.",
      descEn: "Submit leave, permission, or manual edit requests and stay updated via the top Announcements & Notifications bell.",
      icon: <Megaphone className="w-5 h-5" />,
      onEnter: () => setActiveTab("home"),
    },
    {
      id: "profile-security",
      targetId: "tour-nav-profile",
      titleAr: "الملف الشخصي والأمان السريع",
      titleEn: "Profile & Quick Security",
      descAr: "فعّل القفل السريع برمز PIN أو بصمة الإصبع/الوجه، وبدّل اللغة والمظهر في أي وقت من تبويب الملف الشخصي.",
      descEn: "Enable 6-digit PIN or biometric quick unlock, and customize your language and theme from the Profile tab.",
      icon: <ShieldCheck className="w-5 h-5" />,
      onEnter: () => setActiveTab("home"),
    },
  ];

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  // Quick Unlock Handlers
  const handleKeypadPress = async (digit: string) => {
    if (enteredPin.length >= 6) return;
    const nextPin = enteredPin + digit;
    setEnteredPin(nextPin);
    setPinError(null);

    if (nextPin.length === 6) {
      if (!user) return;
      const deviceId = getOrCreateDeviceId();
      const valid = await verifyPin(nextPin, deviceId, quickSettings.pinHash || "");
      if (valid) {
        setSessionUnlocked(user.id, true);
        setIsLocked(false);
        setEnteredPin("");
        setPinError(null);
      } else {
        setPinError("رمز PIN غير صحيح");
        setTimeout(() => setEnteredPin(""), 600);
      }
    }
  };

  const handleKeypadDelete = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  const handleBiometricUnlock = async () => {
    if (!user) return;
    setPinError(null);
    const res = await verifyBiometricCredential(user.id);
    if (res.ok) {
      setSessionUnlocked(user.id, true);
      setIsLocked(false);
      setEnteredPin("");
      setPinError(null);
    } else if (res.error === "missing_credential") {
      setPinError(
        language === "ar"
          ? "لم يتم تسجيل بصمة الجهاز بعد. يرجى الدخول برمز PIN وإعادة تفعيل البصمة."
          : "Biometric credential missing. Please unlock with PIN and re-enable."
      );
    } else if (res.error === "unsupported") {
      setPinError(
        language === "ar"
          ? "المتصفح أو الجهاز لا يدعم التحقق الحيوي. استخدم رمز PIN."
          : "Biometrics unsupported on this device. Use PIN."
      );
    } else {
      setPinError(
        language === "ar"
          ? "تم إلغاء التحقق الحيوي أو فشل. يرجى المحاولة مجدداً أو إدخال رمز PIN."
          : "Biometric verification cancelled or failed. Use PIN."
      );
    }
  };

  // PIN Setup Handlers
  const handleOpenPinSetup = () => {
    setSetupStep("enter");
    setNewPin("");
    setConfirmPin("");
    setSetupError(null);
    setPinModalOpen(true);
  };

  const handleSavePinSetup = async () => {
    if (!user) return;
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      setSetupError("يجب أن يتكون الرمز من 6 أرقام");
      return;
    }
    if (newPin !== confirmPin) {
      setSetupError("الرمزان غير متطابقين");
      return;
    }

    const deviceId = getOrCreateDeviceId();
    const hash = await hashPin(newPin, deviceId);
    saveQuickUnlockSettings(user.id, { pinEnabled: true, pinHash: hash });
    setQuickSettings((prev) => ({ ...prev, pinEnabled: true, pinHash: hash }));
    setPinModalOpen(false);
  };

  const handleDisablePin = () => {
    if (!user) return;
    if (confirm("هل أنت متأكد من تعطيل القفل السريع برمز PIN؟")) {
      saveQuickUnlockSettings(user.id, {
        pinEnabled: false,
        pinHash: null,
        biometricEnabled: false,
        biometricCredentialId: null,
      });
      setQuickSettings({
        pinEnabled: false,
        pinHash: null,
        biometricEnabled: false,
        biometricCredentialId: null,
      });
    }
  };

  const handleToggleBiometric = async (enabled: boolean) => {
    if (!user) return;
    if (enabled && !quickSettings.pinEnabled) {
      alert(
        language === "ar"
          ? "يرجى تعيين رمز PIN أولاً ليكون خياراً احتياطياً."
          : "Please set a 6-digit PIN first as a fallback."
      );
      return;
    }

    if (enabled) {
      const res = await registerBiometricCredential(
        user.id,
        profile?.full_name || user.email || "yawmi-employee"
      );
      if (!res.ok) {
        alert(
          res.error === "unsupported"
            ? language === "ar"
              ? "متصفحك أو جهازك لا يدعم المصادقة البيومترية (WebAuthn Platform Authenticator)."
              : "Your browser or device does not support hardware biometrics."
            : language === "ar"
            ? "تعذر تسجيل البصمة الحيوية أو تم إلغاء العملية."
            : "Failed to register hardware biometrics or cancelled."
        );
        return;
      }
      setQuickSettings((prev) => ({
        ...prev,
        biometricEnabled: true,
        biometricCredentialId: res.credentialId || null,
      }));
    } else {
      saveQuickUnlockSettings(user.id, {
        biometricEnabled: false,
        biometricCredentialId: null,
      });
      setQuickSettings((prev) => ({
        ...prev,
        biometricEnabled: false,
        biometricCredentialId: null,
      }));
    }
  };

  const handleLogout = async () => {
    clearUserCache();
    if (typeof window !== "undefined") {
      localStorage.removeItem("yawmi_last_user_id");
    }
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Submit Outgoing Request
  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id || !user?.id) return;
    setSubmittingReq(true);
    setReqAlert(null);

    try {
      let payload: any = { reason: reqReason.trim() };

      if (reqType === "manual_edit") {
        payload.date = reqDate;
        payload.check_in_time = reqCheckInTime;
        payload.check_out_time = reqCheckOutTime;
      } else if (reqType === "leave") {
        payload.start_date = reqStartDate;
        payload.end_date = reqEndDate;
      } else if (reqType === "permission") {
        payload.date = reqDate;
        payload.time_from = reqPermTimeFrom;
        payload.time_to = reqPermTimeTo;
      } else if (reqType === "shift_change") {
        payload.target_shift_id = reqTargetShift;
        payload.target_shift_name = availableShifts.find((s) => s.id === reqTargetShift)?.name || "";
      } else if (reqType === "device_reset") {
        payload.device_reason = reqReason.trim();
      }

      const { error } = await supabase.from("requests").insert([
        {
          company_id: profile.company_id,
          branch_id: profile.branch_id || null,
          employee_id: user.id,
          type: reqType,
          direction: "outgoing",
          status: "pending",
          payload,
        },
      ]);

      if (error) throw error;

      setReqAlert({ type: "success", text: "تم إرسال طلبك بنجاح وهو الآن بانتظار مراجعة الإدارة." });
      setNewReqModalOpen(false);
      setReqReason("");
      await fetchRequests(user.id);
      setUnreadFeedCount((prev) => prev + 1);
    } catch (err: any) {
      setReqAlert({ type: "error", text: err.message || "فشل إرسال الطلب." });
    } finally {
      setSubmittingReq(false);
    }
  };

  // Confirm Incoming Salary Request
  const handleConfirmSalary = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({ status: "confirmed" })
        .eq("id", requestId)
        .eq("employee_id", user.id);

      if (error) throw error;

      setReqAlert({ type: "success", text: t("salary_confirmed_success") });
      await fetchRequests(user.id);
    } catch (err: any) {
      setReqAlert({ type: "error", text: err.message || "فشل تأكيد الاستلام." });
    }
  };

  // Start Attendance Action (Check-in or Check-out)
  const startAttendanceFlow = (type: "checkin" | "checkout") => {
    if (!branch) {
      alert("لم يتم إسناد فرع عمل لك حتى الآن. يرجى التواصل مع مدير المنشأة.");
      return;
    }

    // 1. Verify Device Binding
    const deviceCheck = verifyDeviceBinding(profile.device_id);
    if (deviceCheck.isBound && !deviceCheck.matches) {
      alert(t("device_mismatch_error"));
      return;
    }

    setActionType(type);
    setStep("qr");
    setQrInput("");
    setScannedToken("");
    setIsScanningQr(false);
    setShowManualQr(false);
    setGpsDistance(null);
    setSelfieDataUrl(null);
    setFlowError(null);
    setSuccessInfo(null);
    setActionModalOpen(true);
  };

  const stopQrScanner = async () => {
    try {
      if (qrScannerRef.current) {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
        qrScannerRef.current = null;
      }
    } catch (e) {
      console.warn("Error stopping QR scanner:", e);
    }
    setIsScanningQr(false);
  };

  const startQrScanner = async () => {
    setFlowError(null);
    setIsScanningQr(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      await stopQrScanner();
      setIsScanningQr(true);

      setTimeout(async () => {
        try {
          const readerElement = document.getElementById("yawmi-qr-reader");
          if (!readerElement) return;

          const scanner = new Html5Qrcode("yawmi-qr-reader");
          qrScannerRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 },
              aspectRatio: 1.0,
            },
            async (decodedText) => {
              if (typeof navigator !== "undefined" && navigator.vibrate) {
                navigator.vibrate(100);
              }
              setQrInput(decodedText);
              await stopQrScanner();
              handleValidateQr(decodedText);
            },
            () => {}
          );
        } catch (err: any) {
          console.error("Camera scanner start error:", err);
          setFlowError(
            err?.message || "تعذر فتح الكاميرا لمسح الباركود. يرجى التأكد من منح صلاحية الكاميرا في المتصفح."
          );
          setIsScanningQr(false);
        }
      }, 150);
    } catch (err: any) {
      console.error("html5-qrcode load error:", err);
      setFlowError("تعذر تشغيل ماسح الباركود.");
      setIsScanningQr(false);
    }
  };

  // Step 1: Validate QR Token (supports Dynamic Kiosk and Static Printable QR)
  const handleValidateQr = async (directToken?: string) => {
    setFlowError(null);
    const token = (directToken || qrInput).trim();
    if (!token) {
      setFlowError("يرجى فتح الكاميرا لمسح الباركود أو إدخال الكود يدوياً.");
      return;
    }

    const verification = await verifyQrToken(
      token,
      branch.id,
      branch.qr_secret,
      branch.static_qr_token
    );
    if (!verification.valid) {
      setFlowError(verification.reason || "رمز QR غير صالح أو منتهي الصلاحية.");
      return;
    }

    setScannedToken(token);
    await stopQrScanner();
    // Move to GPS verification
    handleCheckGps();
  };

  // Step 2: Check GPS Geofence
  const handleCheckGps = () => {
    setStep("gps");
    setFlowError(null);

    if (!navigator.geolocation) {
      setFlowError("متصفحك لا يدعم تحديد الموقع الجغرافي.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        if (branch.lat && branch.lng) {
          const distance = calculateHaversineDistanceMeters(
            userLat,
            userLng,
            branch.lat,
            branch.lng
          );
          setGpsDistance(distance);

          if (distance > (branch.radius_meters || 100)) {
            setFlowError(
              `${t("gps_out_of_range")} (${distance} ${t("meters")})، الحد المسموح: ${
                branch.radius_meters || 100
              } ${t("meters")}.`
            );
            return;
          }
        }

        // GPS OK! Move to selfie or submit
        if (actionType === "checkin" && branch.require_selfie) {
          startSelfieCapture();
        } else {
          submitAttendanceRecord(userLat, userLng, null);
        }
      },
      (err) => {
        console.error("GPS error:", err);
        setFlowError("تعذر التقاط موقع الـ GPS. تأكد من تفعيل صلاحيات الموقع في المتصفح.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Step 3: Selfie Capture
  const startSelfieCapture = async () => {
    setStep("selfie");
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Selfie camera error:", err);
      submitAttendanceRecord(branch.lat || 0, branch.lng || 0, null);
    }
  };

  const captureSelfieAndSubmit = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        setSelfieDataUrl(dataUrl);

        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach((track) => track.stop());
        setCameraActive(false);

        submitAttendanceRecord(branch.lat || 0, branch.lng || 0, dataUrl);
      }
    }
  };

  // Step 4: Final Submission & Calculation (Late, Grace, Overtime)
  const submitAttendanceRecord = async (
    lat: number,
    lng: number,
    selfieUrl: string | null
  ) => {
    setStep("submitting");
    setFlowError(null);

    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      if (!profile.device_id) {
        const newDevId = getOrCreateDeviceId();
        await supabase
          .from("profiles")
          .update({ device_id: newDevId })
          .eq("id", profile.id);
      }

      if (actionType === "checkin") {
        let lateMinutes = 0;
        let graceUsed = false;

        if (shift && shift.shift1_start) {
          const [sHours, sMinutes] = shift.shift1_start.split(":").map(Number);
          const shiftStart = new Date(now);
          shiftStart.setHours(sHours, sMinutes, 0, 0);

          if (now > shiftStart) {
            const diffMinutes = Math.floor((now.getTime() - shiftStart.getTime()) / 60000);
            if (diffMinutes > 0) {
              const allowedGrace = shift.grace_minutes || 15;
              const weeklyGraceLimit = shift.weekly_grace_limit || 2;

              let currentWeekGraceCount = 0;
              try {
                const { data: countData } = await supabase.rpc("get_weekly_grace_count", {
                  p_employee_id: profile.id,
                  p_date: today,
                });
                currentWeekGraceCount = Number(countData) || 0;
              } catch {
                currentWeekGraceCount = historyLogs.filter(
                  (l) => l.grace_used && l.shift_date >= today
                ).length;
              }

              if (diffMinutes <= allowedGrace && currentWeekGraceCount < weeklyGraceLimit) {
                graceUsed = true;
                lateMinutes = 0;
              } else {
                lateMinutes = diffMinutes;
              }
            }
          }
        }

        const { error: insErr } = await supabase.from("attendance_logs").insert([
          {
            company_id: profile.company_id,
            branch_id: branch.id,
            employee_id: profile.id,
            shift_date: today,
            check_in_at: now.toISOString(),
            lat,
            lng,
            selfie_url: selfieUrl,
            late_minutes: lateMinutes,
            grace_used: graceUsed,
          },
        ]);

        if (insErr) throw insErr;

        let msg = t("checkin_success");
        if (graceUsed) msg += ` (${t("grace_applied_badge")})`;
        if (lateMinutes > 0) msg += ` (تم تسجيل تأخير ${lateMinutes} دقيقة)`;
        setSuccessInfo(msg);
      } else {
        let overtimeMinutes = 0;

        if (shift) {
          const endTimeStr = shift.is_dual_shift && shift.shift2_end ? shift.shift2_end : shift.shift1_end;
          if (endTimeStr) {
            const [eHours, eMinutes] = endTimeStr.split(":").map(Number);
            const shiftEnd = new Date(now);
            shiftEnd.setHours(eHours, eMinutes, 0, 0);

            if (now > shiftEnd) {
              const diffMinutes = Math.floor((now.getTime() - shiftEnd.getTime()) / 60000);
              if (diffMinutes > 0) {
                overtimeMinutes = diffMinutes;
              }
            }
          }
        }

        if (todayLog) {
          const { error: upErr } = await supabase
            .from("attendance_logs")
            .update({
              check_out_at: now.toISOString(),
              overtime_minutes: overtimeMinutes,
              overtime_approved: false,
            })
            .eq("id", todayLog.id);

          if (upErr) throw upErr;
        }

        let msg = t("checkout_success");
        if (overtimeMinutes > 0) {
          msg += ` (ساعات إضافية: ${overtimeMinutes} دقيقة - بانتظار الاعتماد)`;
        }
        setSuccessInfo(msg);
      }

      setStep("success");
      await fetchEmployeeData();
    } catch (err: any) {
      console.error("Attendance submission error:", err);
      setFlowError(err.message || "فشل تسجيل العملية في قاعدة البيانات.");
      setStep("error");
    }
  };

  const closeActionModal = () => {
    stopQrScanner();
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
    }
    setCameraActive(false);
    setActionModalOpen(false);
  };

  const isCheckedIn = !!todayLog?.check_in_at && !todayLog?.check_out_at;
  const isCheckedOut = !!todayLog?.check_in_at && !!todayLog?.check_out_at;

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case "manual_edit":
        return t("req_type_manual_edit");
      case "leave":
        return t("req_type_leave");
      case "permission":
        return t("req_type_permission");
      case "shift_change":
        return t("req_type_shift_change");
      case "device_reset":
        return t("req_type_device_reset");
      case "salary_confirmation":
        return t("req_type_salary_confirmation");
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "confirmed":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
            {status === "confirmed" ? t("req_status_confirmed") : t("req_status_approved")}
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
            {t("req_status_rejected")}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
            {t("req_status_pending")}
          </span>
        );
    }
  };

  if (!lockChecked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 font-cairo select-none">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <YawmiLogo size="md" showText={true} />
          <div className="px-4 py-2 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-center">
            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              {language === "ar"
                ? "منصة يومي الذكية لإدارة الحضور والانصراف"
                : "Yawmi Smart Attendance & Workforce Platform"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col justify-between p-6 font-cairo select-none">
        {/* Top Bar with Language, Theme, and Branded Info Bar */}
        <div className="w-full max-w-sm mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <YawmiLogo size="sm" showText={true} />
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-center">
            <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">
              {language === "ar"
                ? "منصة يومي الذكية لإدارة الحضور والانصراف"
                : "Yawmi Smart Attendance & Workforce Platform"}
            </p>
            {branch?.name && (
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                {branch.name}
              </p>
            )}
          </div>
        </div>

        {/* Lock Screen Center */}
        <div className="w-full max-w-sm mx-auto flex flex-col items-center justify-center my-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-bold">
              {profile?.full_name || "مرحباً بك"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              أدخل رمز PIN المكون من 6 أرقام لفتح التطبيق
            </p>
          </div>

          {/* 6 Dots Indicator */}
          <div className="flex items-center justify-center gap-3 py-2">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  enteredPin.length > idx
                    ? "bg-indigo-600 scale-125 shadow-sm shadow-indigo-500/60"
                    : "bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {pinError && (
            <p className="text-xs font-bold text-rose-500">
              {pinError}
            </p>
          )}

          {/* On-screen Keypad Grid (Always LTR so 1-2-3, 4-5-6, 7-8-9 render left-to-right) */}
          <div dir="ltr" className="grid grid-cols-3 gap-3 w-64 pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                onClick={() => handleKeypadPress(digit)}
                className="w-16 h-16 rounded-2xl text-xl font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition shadow-sm flex items-center justify-center mx-auto"
              >
                {digit}
              </button>
            ))}

            {/* Bottom Row: Biometrics or Empty, 0, Backspace */}
            {quickSettings.biometricEnabled ? (
              <button
                onClick={handleBiometricUnlock}
                className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 border border-indigo-200 dark:border-indigo-800 active:scale-95 transition flex items-center justify-center mx-auto"
                title="فتح بالقفل الحيوي"
              >
                <Fingerprint className="w-6 h-6" />
              </button>
            ) : (
              <div className="w-16 h-16" />
            )}

            <button
              onClick={() => handleKeypadPress("0")}
              className="w-16 h-16 rounded-2xl text-xl font-bold font-mono bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition shadow-sm flex items-center justify-center mx-auto"
            >
              0
            </button>

            <button
              onClick={handleKeypadDelete}
              className="w-16 h-16 rounded-2xl text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-95 transition shadow-sm flex items-center justify-center mx-auto"
              title="مسح"
            >
              <Delete className="w-5 h-5 rtl:rotate-180" />
            </button>
          </div>
        </div>

        {/* Fallback to Password Login */}
        <div className="w-full max-w-sm mx-auto text-center pt-6">
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            تسجيل الخروج واستخدام كلمة المرور
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-cairo select-none pb-20">
      {/* Top Mobile Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-sm">
        <YawmiLogo size="sm" showText={true} />
        <div className="flex items-center gap-1.5">
          {/* Replay Onboarding Tour Button */}
          <button
            onClick={() => setTourOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title={language === "ar" ? "جولة تعريفية بالتطبيق" : "App Tour"}
            aria-label={language === "ar" ? "جولة تعريفية بالتطبيق" : "App Tour"}
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Announcements & Notifications Feed Button */}
          <button
            onClick={handleOpenFeed}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
            title={language === "ar" ? "التعميمات والإشعارات" : "Announcements & Updates"}
            aria-label={language === "ar" ? "التعميمات والإشعارات" : "Announcements & Updates"}
          >
            <Bell className="w-4 h-4" />
            {(unreadFeedCount > 0 ||
              outgoingRequests.some((r) => r.status === "pending" || r.status === "in_review" || r.status === "approved")) && (
              <span className="absolute -top-1 -end-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-slate-900">
                {unreadFeedCount > 0 ? (unreadFeedCount > 9 ? "9+" : unreadFeedCount) : ""}
              </span>
            )}
          </button>

          <ThemeToggle />

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-colors shadow-sm ${
              activeTab === "profile"
                ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
            title={profile?.full_name || t("app_tab_profile")}
            aria-label={t("app_tab_profile")}
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content by Tab */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 rounded-2xl bg-indigo-200/50 dark:bg-indigo-950/40" />
            <div className="h-24 rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-16 rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
            <div className="h-14 rounded-2xl bg-emerald-200/50 dark:bg-emerald-950/30" />
            <div className="h-20 rounded-2xl bg-slate-200 dark:bg-slate-800/80" />
          </div>
        ) : (
          <>
            {/* TAB 1: HOME */}
            {activeTab === "home" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Smart PWA Install Banner */}
                {showInstallBanner && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-600/20 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                          <Download className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xs font-extrabold">
                            {language === "ar"
                              ? "تثبيت تطبيق يومي على الشاشة الرئيسية"
                              : "Install Yawmi App on Home Screen"}
                          </h3>
                          <p className="text-[11px] text-emerald-100 leading-relaxed mt-0.5">
                            {isIosSafari
                              ? language === "ar"
                                ? "على الآيفون: اضغط زر المشاركة (Share) بالأسفل ثم اختر «إضافة إلى الشاشة الرئيسية»."
                                : "On iOS: tap Share below, then choose 'Add to Home Screen'."
                              : language === "ar"
                              ? "وصول أسرع لتسجيل الحضور والانصراف بلمسة واحدة دون فتح المتصفح."
                              : "Faster one-tap access for daily check-in and check-out."}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleDismissInstallBanner}
                        className="p-1 text-emerald-100 hover:text-white rounded-lg transition"
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {isIosSafari ? (
                        <button
                          type="button"
                          onClick={handleInstallPwaClick}
                          className="w-full py-2 px-3 rounded-xl bg-white text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition shadow-sm"
                        >
                          <Share className="w-3.5 h-3.5" />
                          <span>
                            {language === "ar" ? "تمت الإضافة للشاشة الرئيسية" : "I Added It to Home Screen"}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleInstallPwaClick}
                          disabled={installingPwa || !deferredPrompt}
                          className="w-full py-2 px-3 rounded-xl bg-white text-emerald-900 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition shadow-sm disabled:opacity-70"
                        >
                          {installingPwa ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {language === "ar" ? "تثبيت التطبيق الآن" : "Install App Now"}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* User Greeting Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-indigo-900 text-white shadow-lg shadow-indigo-600/15">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-indigo-200 font-medium block">
                        مرحباً بك 👋
                      </span>
                      <h1 className="text-lg font-bold">{profile?.full_name}</h1>
                      <span className="text-[11px] text-indigo-200 block">
                        {profile?.job_title || "موظف"} &bull; {branch?.name || t("unassigned")}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center font-bold border border-white/20">
                      {profile?.full_name?.charAt(0) || "U"}
                    </div>
                  </div>
                </div>

                {/* Live Clock & Date */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                  <div className="font-mono text-3xl font-black text-slate-900 dark:text-white">
                    {currentTime}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {currentDate}
                  </div>
                </div>

                {/* Live Shift Timer & Attendance Status Card */}
                <div
                  id="tour-home-status"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3.5 h-3.5 rounded-full ${
                          isCheckedIn
                            ? "bg-emerald-500 animate-pulse"
                            : isCheckedOut
                            ? "bg-indigo-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {isCheckedIn
                            ? t("status_checked_in")
                            : isCheckedOut
                            ? t("status_checked_out")
                            : t("status_not_checked_in")}
                        </span>
                        {todayLog?.check_in_at && (
                          <span className="text-[11px] text-slate-400 font-mono block">
                            حضور: {new Date(todayLog.check_in_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                            {todayLog.check_out_at && ` • انصراف: ${new Date(todayLog.check_out_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {todayLog?.grace_used && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200">
                          {t("grace_applied_badge")}
                        </span>
                      )}
                      {todayLog?.late_minutes > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200">
                          {t("late_badge")} ({todayLog.late_minutes} د)
                        </span>
                      ) : todayLog?.check_in_at && !todayLog?.grace_used ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                          {language === "ar" ? "في الموعد" : "On Time"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Live Elapsed Shift Timer when Checked In */}
                  {isCheckedIn && (
                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                        <Timer className="w-4 h-4 text-emerald-500" />
                        <span>{language === "ar" ? "الوقت المنقضي بالدوام:" : "Active Shift Timer:"}</span>
                      </div>
                      <span
                        dir="ltr"
                        className="font-mono text-base font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800"
                      >
                        {elapsedTimer}
                      </span>
                    </div>
                  )}
                </div>

                {/* Big Action Check-in / Check-out Button */}
                <div id="tour-checkin-btn" className="pt-1">
                  {!isCheckedIn && !isCheckedOut && (
                    <button
                      onClick={() => startAttendanceFlow("checkin")}
                      className="w-full py-4 px-6 rounded-2xl font-black text-base bg-checkin hover:bg-checkin-hover text-white shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    >
                      <QrCode className="w-5 h-5" />
                      <span>{t("check_in_btn")}</span>
                    </button>
                  )}

                  {isCheckedIn && (
                    <button
                      onClick={() => startAttendanceFlow("checkout")}
                      className="w-full py-4 px-6 rounded-2xl font-black text-base bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/25 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>{t("check_out_btn")}</span>
                    </button>
                  )}

                  {isCheckedOut && (
                    <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                      <span>اكتمل تسجيل يوم العمل اليوم بنجاح! نراك غداً.</span>
                    </div>
                  )}
                </div>

                {/* Annual Leave Balance Card */}
                <div
                  id="tour-leave-balance"
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
                      <Palmtree className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        {language === "ar" ? "رصيد الإجازات السنوية" : "Annual Leave Balance"}
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                          {profile?.annual_leave_balance ?? 21}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {language === "ar" ? "يوم متبقي" : "days left"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setReqType("leave");
                      setNewReqModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition shrink-0"
                  >
                    {language === "ar" ? "طلب إجازة" : "Request Leave"}
                  </button>
                </div>

                {/* Latest Announcement Preview Card */}
                {announcements.length > 0 && (
                  <div
                    onClick={handleOpenFeed}
                    className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition hover:opacity-95 space-y-1.5 ${
                      announcements[0].priority === "urgent"
                        ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <Megaphone
                          className={`w-3.5 h-3.5 ${
                            announcements[0].priority === "urgent" ? "text-rose-600" : "text-indigo-500"
                          }`}
                        />
                        <span>{announcements[0].title}</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {announcements[0].branch_id
                            ? branch?.name || (language === "ar" ? "الفرع" : "Branch")
                            : language === "ar"
                            ? "جميع الفروع"
                            : "All Branches"}
                        </span>
                        {announcements[0].priority === "urgent" && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                            {language === "ar" ? "عاجل" : "Urgent"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {announcements[0].body}
                    </p>
                    {announcements[0].sender_name && (
                      <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        {language === "ar" ? "المرسل:" : "From:"} {announcements[0].sender_name} •{" "}
                        {announcements[0].sender_role === "supervisor"
                          ? language === "ar"
                            ? "مشرف الفرع"
                            : "Branch Supervisor"
                          : language === "ar"
                          ? "مدير الشركة"
                          : "Company Admin"}
                      </p>
                    )}
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block pt-0.5">
                      {language === "ar" ? "عرض كل التعميمات والتحديثات ←" : "View all announcements & updates →"}
                    </span>
                  </div>
                )}

                {/* Shift Info Card */}
                {shift && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="w-4 h-4 text-indigo-500" />
                        <span>{shift.name}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        سماح: {shift.grace_minutes} د
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>الفترة الأولى:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                        {shift.shift1_start?.slice(0, 5)} - {shift.shift1_end?.slice(0, 5)}
                      </span>
                    </div>

                    {shift.is_dual_shift && shift.shift2_start && (
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                        <span>الفترة الثانية:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                          {shift.shift2_start?.slice(0, 5)} - {shift.shift2_end?.slice(0, 5)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: HISTORY */}
            {activeTab === "history" && (
              <div className="space-y-3 animate-fadeIn">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {t("app_tab_history")} (آخر 30 يوم)
                </h2>

                {historyLogs.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                    لا يوجد سجلات حضور سابقة.
                  </div>
                ) : (
                  historyLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {new Date(log.shift_date).toLocaleDateString("ar-SA", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {log.check_in_at
                            ? new Date(log.check_in_at).toLocaleTimeString("ar-SA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "--"}
                          {" → "}
                          {log.check_out_at
                            ? new Date(log.check_out_at).toLocaleTimeString("ar-SA", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "مفتوح"}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        {log.grace_used && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200">
                            {t("grace_applied_badge")}
                          </span>
                        )}
                        {log.late_minutes > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-semibold border border-rose-200">
                            تأخير {log.late_minutes} د
                          </span>
                        )}
                        {log.overtime_minutes > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold border border-purple-200">
                            إضافي {log.overtime_minutes} د
                          </span>
                        )}
                        {!log.grace_used && log.late_minutes === 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200">
                            في الموعد
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: REQUESTS */}
            {activeTab === "requests" && (
              <div className="space-y-4 animate-fadeIn">
                {/* Header & Subtabs */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t("app_tab_requests")}
                  </h2>
                  <button
                    onClick={() => setNewReqModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("new_request_btn")}</span>
                  </button>
                </div>

                {reqAlert && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center justify-between ${
                      reqAlert.type === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-200"
                        : "bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-800 dark:text-red-200"
                    }`}
                  >
                    <span>{reqAlert.text}</span>
                    <button onClick={() => setReqAlert(null)}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Sub-tab Pill Switcher */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 text-xs font-bold">
                  <button
                    onClick={() => setReqSubTab("outgoing")}
                    className={`py-1.5 rounded-lg transition ${
                      reqSubTab === "outgoing"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {t("req_tab_outgoing")} ({outgoingRequests.length})
                  </button>
                  <button
                    onClick={() => setReqSubTab("incoming")}
                    className={`py-1.5 rounded-lg transition flex items-center justify-center gap-1.5 ${
                      reqSubTab === "incoming"
                        ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span>{t("req_tab_incoming")}</span>
                    {incomingRequests.filter((r) => r.status === "pending").length > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {incomingRequests.filter((r) => r.status === "pending").length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Sub-tab 1: Outgoing Requests */}
                {reqSubTab === "outgoing" && (
                  <div className="space-y-3">
                    {outgoingRequests.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        لم تقم بتقديم أي طلبات سابقة.
                      </div>
                    ) : (
                      outgoingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {getRequestTypeLabel(req.type)}
                            </span>
                            {getStatusBadge(req.status)}
                          </div>

                          {/* Payload Details */}
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                            {req.type === "leave" && (
                              <p>
                                الفترة: من {req.payload?.start_date} إلى {req.payload?.end_date}
                              </p>
                            )}
                            {req.type === "permission" && (
                              <p>
                                التاريخ: {req.payload?.date} &bull; الوقت: {req.payload?.time_from} - {req.payload?.time_to}
                              </p>
                            )}
                            {req.type === "manual_edit" && (
                              <p>
                                التاريخ: {req.payload?.date} &bull; حضور: {req.payload?.check_in_time} &bull; انصراف: {req.payload?.check_out_time}
                              </p>
                            )}
                            {req.type === "shift_change" && (
                              <p>الشفت المطلوب: {req.payload?.target_shift_name || "غير محدد"}</p>
                            )}
                            {req.payload?.reason && <p>السبب: {req.payload.reason}</p>}
                          </div>

                          {/* Review Note */}
                          {req.review_note && (
                            <div className="text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 p-2 rounded-lg border border-indigo-200 dark:border-indigo-900">
                              <strong>{t("manager_review_note")}:</strong> {req.review_note}
                            </div>
                          )}

                          <span className="text-[10px] text-slate-400 block text-end font-mono">
                            {new Date(req.created_at).toLocaleDateString("ar-SA", {
                              month: "numeric",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Sub-tab 2: Incoming Requests (Salary Acknowledgments) */}
                {reqSubTab === "incoming" && (
                  <div className="space-y-3">
                    {incomingRequests.length === 0 ? (
                      <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                        لا توجد طلبات أو إشعارات مسيرات رواتب واردة.
                      </div>
                    ) : (
                      incomingRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Inbox className="w-4 h-4 text-indigo-500" />
                              <span>{getRequestTypeLabel(req.type)}</span>
                            </span>
                            {getStatusBadge(req.status)}
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl space-y-1 text-slate-600 dark:text-slate-300 text-xs">
                            <p className="font-bold text-slate-900 dark:text-white">
                              مسير راتب شهر {req.payload?.month} / {req.payload?.year}
                            </p>
                            {req.payload?.amount && (
                              <p className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                المبلغ: {req.payload.amount} ريال
                              </p>
                            )}
                            {req.payload?.note && <p className="text-[11px]">{req.payload.note}</p>}
                          </div>

                          {req.status === "pending" ? (
                            <button
                              onClick={() => handleConfirmSalary(req.id)}
                              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center justify-center gap-1.5 transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                              <span>{t("confirm_salary_btn")}</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 py-1.5 text-emerald-600 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>تم تأكيد الاستلام من قبلك</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-4 animate-fadeIn">
                <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {t("app_tab_profile")}
                </h2>

                {/* Profile Card */}
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold text-base flex items-center justify-center border border-indigo-200">
                      {profile?.full_name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                        {profile?.full_name}
                      </h3>
                      <span className="text-xs text-slate-400 block">
                        {profile?.job_title || "موظف"} &bull; {profile?.phone}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>رقم الهوية / الإقامة:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {profile?.national_id || "غير مسجل"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>الفرع المعتمد:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {branch?.name || t("unassigned")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>شفت الدوام:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {shift?.name || t("unassigned")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>ربط الجهاز:</span>
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[150px]">
                        {profile?.device_id ? t("device_bound") : t("device_unbound")}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDigitalIdOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center gap-2 hover:bg-indigo-100 transition"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{language === "ar" ? "عرض وطباعة بطاقة الموظف الذكية" : "View Smart Digital ID"}</span>
                  </button>
                </div>

                {/* Security Settings: Quick Unlock */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      <span>أمان التطبيق والقفل السريع</span>
                    </span>
                    <span className="text-[10px] text-slate-400">مرتبط بهذا الجهاز</span>
                  </div>

                  {/* 6-Digit PIN Row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>قفل برمز PIN (6 أرقام)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {quickSettings.pinEnabled
                          ? "مفعّل للدخول السريع دون كتابة كلمة المرور"
                          : "غير مفعّل"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {quickSettings.pinEnabled ? (
                        <>
                          <button
                            onClick={handleOpenPinSetup}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                          >
                            تغيير
                          </button>
                          <button
                            onClick={handleDisablePin}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 hover:bg-rose-100 transition"
                          >
                            تعطيل
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={handleOpenPinSetup}
                          className="px-3 py-1 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm"
                        >
                          تفعيل الرمز
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Biometric Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <Fingerprint className="w-3.5 h-3.5 text-slate-500" />
                        <span>القفل الحيوي (بصمة الإصبع والوجه)</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {biometricSupported
                          ? "مدعوم على هذا المتصفح والجهاز"
                          : "متوافق مع الهواتف الذكية الداعمة لـ WebAuthn"}
                      </span>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={quickSettings.biometricEnabled}
                        onChange={(e) => handleToggleBiometric(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>

                {/* Preferences */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      اللغة والمظهر
                    </span>
                    <div className="flex items-center gap-2">
                      <LanguageToggle />
                      <ThemeToggle />
                    </div>
                  </div>

                  {/* Personal Accent Theme Color */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {language === "ar" ? "لون الواجهة المفضل" : "Accent Color"}
                      </span>
                      <div className="flex items-center gap-2">
                        {themeSaveStatus && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {themeSaveStatus}
                          </span>
                        )}
                        {companyInfo?.primary_color && (
                          <button
                            type="button"
                            onClick={async () => {
                              const companyHex = companyInfo.primary_color;
                              setSelectedThemeColor(companyHex);
                              applyDynamicThemeColor(companyHex);
                              const uid = profile?.id || user?.id;
                              if (uid) {
                                if (typeof window !== "undefined") {
                                  localStorage.removeItem(`yawmi_theme_color_${uid}`);
                                }
                                setProfile((prev: any) => (prev ? { ...prev, theme_color: null } : prev));
                                const prevCache = getCachedData<any>("employee_app");
                                if (prevCache?.profile) {
                                  setCachedData("employee_app", {
                                    ...prevCache,
                                    profile: { ...prevCache.profile, theme_color: null },
                                  });
                                }
                                const { error } = await supabase
                                  .from("profiles")
                                  .update({ theme_color: null })
                                  .eq("id", uid);
                                setThemeSaveStatus(
                                  error
                                    ? (language === "ar" ? "تمت الاستعادة محلياً" : "Reset locally")
                                    : (language === "ar" ? "تمت الاستعادة ✓" : "Reset ✓")
                                );
                                setTimeout(() => setThemeSaveStatus(null), 2500);
                              }
                            }}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {language === "ar" ? "استعادة لون الشركة" : "Reset to Company"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {THEME_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={async () => {
                            const hex = preset.hex;
                            setSelectedThemeColor(hex);
                            applyDynamicThemeColor(hex);
                            const uid = profile?.id || user?.id;
                            if (uid) {
                              if (typeof window !== "undefined") {
                                localStorage.setItem(`yawmi_theme_color_${uid}`, hex);
                              }
                              setProfile((prev: any) => (prev ? { ...prev, theme_color: hex } : prev));
                              const prevCache = getCachedData<any>("employee_app");
                              if (prevCache?.profile) {
                                setCachedData("employee_app", {
                                  ...prevCache,
                                  profile: { ...prevCache.profile, theme_color: hex },
                                });
                              }
                              const { error } = await supabase
                                .from("profiles")
                                .update({ theme_color: hex })
                                .eq("id", uid);
                              setThemeSaveStatus(
                                error
                                  ? (language === "ar" ? "تم التطبيق محلياً" : "Applied locally")
                                  : (language === "ar" ? "تم الحفظ ✓" : "Saved ✓")
                              );
                              setTimeout(() => setThemeSaveStatus(null), 2500);
                            }
                          }}
                          className={`w-7 h-7 rounded-full border-2 transition ${
                            selectedThemeColor?.toLowerCase() === preset.hex.toLowerCase()
                              ? "border-slate-900 dark:border-white scale-110 shadow-sm"
                              : "border-transparent hover:scale-105"
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={language === "ar" ? preset.nameAr : preset.nameEn}
                        />
                      ))}
                      {/* Custom Color Picker */}
                      <label
                        className="w-7 h-7 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer overflow-hidden hover:scale-105 transition"
                        title={language === "ar" ? "لون مخصص" : "Custom Color"}
                      >
                        <input
                          type="color"
                          value={/^#[0-9a-fA-F]{6}$/.test(selectedThemeColor) ? selectedThemeColor : "#4F46E5"}
                          onChange={async (e) => {
                            const hex = e.target.value;
                            setSelectedThemeColor(hex);
                            applyDynamicThemeColor(hex);
                            const uid = profile?.id || user?.id;
                            if (uid) {
                              if (typeof window !== "undefined") {
                                localStorage.setItem(`yawmi_theme_color_${uid}`, hex);
                              }
                              setProfile((prev: any) => (prev ? { ...prev, theme_color: hex } : prev));
                              const prevCache = getCachedData<any>("employee_app");
                              if (prevCache?.profile) {
                                setCachedData("employee_app", {
                                  ...prevCache,
                                  profile: { ...prevCache.profile, theme_color: hex },
                                });
                              }
                              const { error } = await supabase
                                .from("profiles")
                                .update({ theme_color: hex })
                                .eq("id", uid);
                              setThemeSaveStatus(
                                error
                                  ? (language === "ar" ? "تم التطبيق محلياً" : "Applied locally")
                                  : (language === "ar" ? "تم الحفظ ✓" : "Saved ✓")
                              );
                              setTimeout(() => setThemeSaveStatus(null), 2500);
                            }
                          }}
                          className="w-9 h-9 -m-1 cursor-pointer border-0 bg-transparent"
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full py-3 px-4 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900 flex items-center justify-center gap-2 hover:bg-rose-100 transition shadow-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t("logout")}</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* New Request Modal */}
      {newReqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t("new_request_btn")}
              </span>
              <button onClick={() => setNewReqModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="space-y-3.5 text-xs">
              {/* Type Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  نوع الطلب
                </label>
                <select
                  value={reqType}
                  onChange={(e: any) => setReqType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 font-bold"
                >
                  <option value="leave">{t("req_type_leave")}</option>
                  <option value="permission">{t("req_type_permission")}</option>
                  <option value="manual_edit">{t("req_type_manual_edit")}</option>
                  <option value="shift_change">{t("req_type_shift_change")}</option>
                  <option value="device_reset">{t("req_type_device_reset")}</option>
                </select>
              </div>

              {/* Conditional Fields by Type */}
              {reqType === "leave" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{t("req_start_date")}</label>
                    <input
                      type="date"
                      required
                      value={reqStartDate}
                      onChange={(e) => setReqStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{t("req_end_date")}</label>
                    <input
                      type="date"
                      required
                      value={reqEndDate}
                      onChange={(e) => setReqEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                </div>
              )}

              {reqType === "permission" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{t("req_date_label")}</label>
                    <input
                      type="date"
                      required
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">من الساعة</label>
                      <input
                        type="time"
                        required
                        value={reqPermTimeFrom}
                        onChange={(e) => setReqPermTimeFrom(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">إلى الساعة</label>
                      <input
                        type="time"
                        required
                        value={reqPermTimeTo}
                        onChange={(e) => setReqPermTimeTo(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {reqType === "manual_edit" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">{t("req_date_label")}</label>
                    <input
                      type="date"
                      required
                      value={reqDate}
                      onChange={(e) => setReqDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">وقت الحضور</label>
                      <input
                        type="time"
                        required
                        value={reqCheckInTime}
                        onChange={(e) => setReqCheckInTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">وقت الانصراف</label>
                      <input
                        type="time"
                        required
                        value={reqCheckOutTime}
                        onChange={(e) => setReqCheckOutTime(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {reqType === "shift_change" && (
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">{t("req_shift_label")}</label>
                  <select
                    required
                    value={reqTargetShift}
                    onChange={(e) => setReqTargetShift(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                  >
                    <option value="">اختر الشفت البديل...</option>
                    {availableShifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason / Justification */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t("req_reason_label")} <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reqReason}
                  onChange={(e) => setReqReason(e.target.value)}
                  placeholder="اكتب التوضيح أو المبرر للإدارة..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewReqModalOpen(false)}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {submittingReq && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>{t("join_btn")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Flow Modal */}
      {actionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {actionType === "checkin" ? t("check_in_btn") : t("check_out_btn")}
              </span>
              <button onClick={closeActionModal} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {flowError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 text-red-700 dark:text-red-300 text-xs text-start flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{flowError}</span>
              </div>
            )}

            {/* STEP 1: QR INPUT / SCAN */}
            {step === "qr" && (
              <div className="space-y-4 py-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {actionType === "checkin" ? "مسح باركود تسجيل الحضور" : "مسح باركود تسجيل الانصراف"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {branch?.name ? `فرع: ${branch.name}` : "وجّه الكاميرا نحو باركود الفرع الحي أو المطبوع"}
                  </p>
                </div>

                {/* Real Live Camera Viewport */}
                {isScanningQr ? (
                  <div className="space-y-3">
                    <div className="relative w-full aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black border-2 border-indigo-600 shadow-xl">
                      <div id="yawmi-qr-reader" className="w-full h-full" />
                      <div className="absolute inset-0 pointer-events-none border border-emerald-400/40 rounded-2xl flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-emerald-400 border-dashed rounded-xl animate-pulse" />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stopQrScanner}
                      className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    >
                      إيقاف الكاميرا
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={startQrScanner}
                      className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2.5 transition active:scale-[0.98]"
                    >
                      <Camera className="w-5 h-5 text-indigo-200" />
                      <span>فتح الكاميرا لمسح الباركود (Open Camera)</span>
                    </button>

                    {/* Small Collapsible Manual Fallback */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowManualQr(!showManualQr)}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline transition"
                      >
                        {showManualQr ? "إخفاء الإدخال اليدوي" : "إدخال الكود يدوياً (للاختبار والنسخ)"}
                      </button>

                      {showManualQr && (
                        <div className="mt-2.5 space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                          <input
                            type="text"
                            value={qrInput}
                            onChange={(e) => setQrInput(e.target.value)}
                            placeholder="YAWMI:..."
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-center focus:ring-2 focus:ring-indigo-500"
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => handleValidateQr()}
                            className="w-full py-2 px-3 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700 transition"
                          >
                            التحقق اليدوي والمتابعة
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: GPS VERIFYING */}
            {step === "gps" && (
              <div className="py-6 space-y-3">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("verifying_location")}
                </h3>
                <p className="text-xs text-slate-400">
                  يرجى السماح بالوصول للموقع عبر المتصفح.
                </p>
              </div>
            )}

            {/* STEP 3: SELFIE CAPTURE */}
            {step === "selfie" && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("take_selfie_prompt")}
                </h3>
                <div className="w-full h-56 rounded-2xl overflow-hidden bg-black relative border-2 border-indigo-500">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={captureSelfieAndSubmit}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-indigo-600 text-white flex items-center justify-center gap-2 shadow-md"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط وتأكيد الحضور</span>
                </button>
              </div>
            )}

            {/* STEP 4: SUBMITTING */}
            {step === "submitting" && (
              <div className="py-6 space-y-3">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  جاري تسجيل العملية...
                </h3>
              </div>
            )}

            {/* STEP 5: SUCCESS */}
            {step === "success" && (
              <div className="py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تم بنجاح!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {successInfo}
                </p>
                <button
                  onClick={closeActionModal}
                  className="w-full py-2 px-4 rounded-xl font-bold text-xs bg-indigo-600 text-white shadow-md"
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (4 Tabs) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-4 h-16">
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "home"
                ? "text-indigo-600 dark:text-indigo-400 font-bold"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[11px]">{t("app_tab_home")}</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "history"
                ? "text-indigo-600 dark:text-indigo-400 font-bold"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[11px]">{t("app_tab_history")}</span>
          </button>

          <button
            id="tour-nav-requests"
            onClick={() => setActiveTab("requests")}
            className={`flex flex-col items-center justify-center gap-1 transition relative ${
              activeTab === "requests"
                ? "text-indigo-600 dark:text-indigo-400 font-bold"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <FileCheck2 className="w-5 h-5" />
            <span className="text-[11px]">{t("app_tab_requests")}</span>
            {incomingRequests.filter((r) => r.status === "pending").length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2.5 end-7" />
            )}
          </button>

          <button
            id="tour-nav-profile"
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center gap-1 transition ${
              activeTab === "profile"
                ? "text-indigo-600 dark:text-indigo-400 font-bold"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[11px]">{t("app_tab_profile")}</span>
          </button>
        </div>
      </nav>

      {/* PIN Setup Modal */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-4 font-cairo">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                <span>تعيين رمز PIN السريع (6 أرقام)</span>
              </h3>
              <button
                onClick={() => setPinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              اختر رمز PIN مكوّن من 6 أرقام لفتح التطبيق بسرعة من هذا الجهاز مستقبلاً.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رمز PIN الجديد (6 أرقام) *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d*"
                  value={newPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewPin(val);
                    setSetupError(null);
                  }}
                  placeholder="••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center tracking-widest text-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تأكيد رمز PIN الجديد *
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  pattern="\d*"
                  value={confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setConfirmPin(val);
                    setSetupError(null);
                  }}
                  placeholder="••••••"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center tracking-widest text-lg font-bold"
                />
              </div>

              {setupError && (
                <p className="text-[11px] font-bold text-rose-500">{setupError}</p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSavePinSetup}
                  className="flex-1 py-2 px-4 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ الرمز</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="py-2 px-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Announcements & Request Updates Feed Drawer */}
      {feedDrawerOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 font-cairo">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {language === "ar" ? "التعميمات وتحديثات الطلبات" : "Announcements & Updates"}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {language === "ar" ? "إعلانات الإدارة وحالة طلباتك الأخيرة" : "Company broadcasts & recent request updates"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFeedDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Section 1: Company Announcements */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === "ar" ? "تعميمات الشركة" : "Company Announcements"}
                </div>
                {announcements.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                    {language === "ar" ? "لا توجد تعميمات حالياً." : "No announcements yet."}
                  </div>
                ) : (
                  announcements.map((ann) => {
                    const scopeLabel = ann.branch_id
                      ? branch?.name || (language === "ar" ? "فرعك" : "Your Branch")
                      : language === "ar"
                      ? "جميع الفروع"
                      : "All Branches";
                    const senderRoleLabel =
                      ann.sender_role === "supervisor"
                        ? language === "ar"
                          ? "مشرف الفرع"
                          : "Branch Supervisor"
                        : language === "ar"
                        ? "مدير الشركة"
                        : "Company Admin";

                    return (
                    <div
                      key={ann.id}
                      className={`p-3.5 rounded-2xl border space-y-1.5 ${
                        ann.priority === "urgent"
                          ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
                          : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                          {ann.title}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {scopeLabel}
                          </span>
                          {ann.priority === "urgent" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                              {language === "ar" ? "عاجل" : "Urgent"}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {ann.body}
                      </p>
                      <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] text-slate-400 pt-0.5">
                        {ann.sender_name ? (
                          <span className="font-semibold text-slate-500 dark:text-slate-400">
                            {language === "ar" ? "المرسل:" : "From:"} {ann.sender_name} • {senderRoleLabel}
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="font-mono">
                          {new Date(ann.created_at).toLocaleDateString("ar-SA", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                    );
                  })
                )}
              </div>

              {/* Section 2: Recent Request Status Updates (Under Review, Approved & Rejected) */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {language === "ar" ? "حالة وتحديثات طلباتك" : "Your Request Status & Updates"}
                </div>
                {buildEmployeeFeedNotifications([], outgoingRequests, language).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                    {language === "ar" ? "لا توجد طلبات مسجلة حالياً." : "No requests yet."}
                  </div>
                ) : (
                  buildEmployeeFeedNotifications([], outgoingRequests, language)
                    .slice(0, 8)
                    .map((item) => (
                      <div
                        key={item.id}
                        onClick={() => {
                          setFeedDrawerOpen(false);
                          setActiveTab("requests");
                        }}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 cursor-pointer hover:border-indigo-300 transition"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            {item.body}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            item.status === "approved"
                              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                              : item.status === "rejected"
                              ? "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                              : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {item.status === "approved"
                            ? language === "ar"
                              ? "تمت الموافقة"
                              : "Approved"
                            : item.status === "rejected"
                            ? language === "ar"
                              ? "مرفوض"
                              : "Rejected"
                            : language === "ar"
                            ? "قيد المراجعة"
                            : "Under Review"}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Employee Product Tour */}
      <ProductTour
        isOpen={tourOpen}
        steps={employeeTourSteps}
        onComplete={handleCompleteTour}
        onSkip={handleCompleteTour}
      />

      {/* Smart Employee Digital ID Modal */}
      {profile && (
        <DigitalIdModal
          isOpen={digitalIdOpen}
          onClose={() => setDigitalIdOpen(false)}
          employee={profile}
          companyName={companyInfo?.name}
          companyLogoUrl={companyInfo?.logo_url}
          branchName={branch?.name}
          accentColor={companyInfo?.primary_color || selectedThemeColor}
        />
      )}
    </div>
  );
}
