"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PricingConfig {
  pro: { monthly: number; annual: number };
  enterprise: { monthly: number; annual: number };
}

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  pro: { monthly: 149, annual: 1490 },
  enterprise: { monthly: 349, annual: 3490 },
};

export interface GlobalAnnouncementConfig {
  active: boolean;
  title: string;
  body: string;
  severity: "info" | "warning" | "urgent";
}

export interface PlatformContactInfo {
  whatsappUrl: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  globalAnnouncement: GlobalAnnouncementConfig;
  pricingConfig: PricingConfig;
  loaded: boolean;
}

const CACHE_KEY = "yawmi_platform_config_cache_v2";

export function normalizePricingConfig(raw: any): PricingConfig {
  return {
    pro: {
      monthly: Number(raw?.pro?.monthly) > 0 ? Number(raw.pro.monthly) : DEFAULT_PRICING_CONFIG.pro.monthly,
      annual: Number(raw?.pro?.annual) > 0 ? Number(raw.pro.annual) : DEFAULT_PRICING_CONFIG.pro.annual,
    },
    enterprise: {
      monthly:
        Number(raw?.enterprise?.monthly) > 0
          ? Number(raw.enterprise.monthly)
          : DEFAULT_PRICING_CONFIG.enterprise.monthly,
      annual:
        Number(raw?.enterprise?.annual) > 0
          ? Number(raw.enterprise.annual)
          : DEFAULT_PRICING_CONFIG.enterprise.annual,
    },
  };
}

const DEFAULT_INFO: PlatformContactInfo = {
  whatsappUrl: "",
  supportEmail: "",
  maintenanceMode: false,
  maintenanceMessage: "نجري تحديثاً سريعاً لتحسين الأداء، نعود خلال دقائق.",
  globalAnnouncement: {
    active: false,
    title: "",
    body: "",
    severity: "info",
  },
  pricingConfig: DEFAULT_PRICING_CONFIG,
  loaded: false,
};

/**
 * Fetches dynamic contact channels, maintenance mode, global broadcast, and pricing_config
 * from public.platform_settings with localStorage SWR caching.
 */
export function usePlatformContact(): PlatformContactInfo {
  const [info, setInfo] = useState<PlatformContactInfo>(DEFAULT_INFO);

  useEffect(() => {
    let active = true;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.whatsappUrl === "string") {
          setInfo({ ...DEFAULT_INFO, ...parsed, loaded: false });
        }
      }
    } catch {
      // ignore storage errors
    }

    const fetchConfig = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("platform_settings")
          .select(
            "support_whatsapp, support_email, maintenance_mode, maintenance_message, global_announcement_active, global_announcement_title, global_announcement_body, global_announcement_severity, pricing_config"
          )
          .eq("id", 1)
          .maybeSingle();

        if (!active || !data) return;
        const cleanWa = (data.support_whatsapp || "").replace(/[^\d]/g, "");
        const next: PlatformContactInfo = {
          whatsappUrl: cleanWa ? `https://wa.me/${cleanWa}` : "",
          supportEmail: (data.support_email || "").trim(),
          maintenanceMode: Boolean(data.maintenance_mode),
          maintenanceMessage:
            (data.maintenance_message || "").trim() ||
            "نجري تحديثاً سريعاً لتحسين الأداء، نعود خلال دقائق.",
          globalAnnouncement: {
            active: Boolean(data.global_announcement_active),
            title: (data.global_announcement_title || "").trim(),
            body: (data.global_announcement_body || "").trim(),
            severity:
              data.global_announcement_severity === "warning" ||
              data.global_announcement_severity === "urgent"
                ? data.global_announcement_severity
                : "info",
          },
          pricingConfig: normalizePricingConfig(data.pricing_config),
          loaded: true,
        };
        setInfo(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      } catch {
        if (active) setInfo((prev) => ({ ...prev, loaded: true }));
      }
    };

    fetchConfig();
    return () => {
      active = false;
    };
  }, []);

  return info;
}
