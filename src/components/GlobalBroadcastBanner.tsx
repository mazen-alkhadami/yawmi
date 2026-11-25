"use client";

import React, { useEffect, useState } from "react";
import { usePlatformContact } from "@/lib/usePlatformContact";
import { AlertTriangle, Info, Megaphone, X } from "lucide-react";

export function GlobalBroadcastBanner() {
  const { globalAnnouncement } = usePlatformContact();
  const [dismissed, setDismissed] = useState(false);

  const storageKey = globalAnnouncement.active
    ? `yawmi_dismissed_broadcast_${encodeURIComponent(
        `${globalAnnouncement.title}|${globalAnnouncement.body}|${globalAnnouncement.severity}`
      )}`
    : "";

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setDismissed(false);
      return;
    }
    setDismissed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (!globalAnnouncement.active || dismissed || (!globalAnnouncement.title && !globalAnnouncement.body)) {
    return null;
  }

  const handleDismiss = () => {
    if (storageKey && typeof window !== "undefined") {
      localStorage.setItem(storageKey, "1");
    }
    setDismissed(true);
  };

  const styles =
    globalAnnouncement.severity === "urgent"
      ? {
          wrap: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200",
          icon: <Megaphone className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
        }
      : globalAnnouncement.severity === "warning"
      ? {
          wrap: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
        }
      : {
          wrap: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200",
          icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
        };

  return (
    <div className={`border-b px-4 py-2.5 text-xs font-cairo ${styles.wrap}`}>
      <div className="max-w-7xl mx-auto flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          {styles.icon}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            {globalAnnouncement.title && (
              <span className="font-extrabold">{globalAnnouncement.title}</span>
            )}
            {globalAnnouncement.body && (
              <span className="opacity-90">{globalAnnouncement.body}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition shrink-0"
          aria-label="Dismiss announcement"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
