"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PlatformContactInfo {
  whatsappUrl: string;
  supportEmail: string;
}

const CACHE_KEY = "yawmi_platform_contact_cache";

/**
 * Fetches dynamic support_whatsapp and support_email from public.platform_settings.
 * Returns empty strings when Super Admin has cleared them so UI hides them dynamically.
 */
export function usePlatformContact(): PlatformContactInfo {
  const [contact, setContact] = useState<PlatformContactInfo>({
    whatsappUrl: "",
    supportEmail: "",
  });

  useEffect(() => {
    let active = true;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.whatsappUrl === "string" && typeof parsed.supportEmail === "string") {
          setContact(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }

    const fetchContact = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("platform_settings")
          .select("support_whatsapp, support_email")
          .eq("id", 1)
          .maybeSingle();

        if (!active || !data) return;
        const cleanWa = (data.support_whatsapp || "").replace(/[^\d]/g, "");
        const next: PlatformContactInfo = {
          whatsappUrl: cleanWa ? `https://wa.me/${cleanWa}` : "",
          supportEmail: (data.support_email || "").trim(),
        };
        setContact(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      } catch {
        // ignore network errors on public page
      }
    };

    fetchContact();
    return () => {
      active = false;
    };
  }, []);

  return contact;
}
