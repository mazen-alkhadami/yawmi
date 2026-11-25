export interface ThemeColorPreset {
  nameAr: string;
  nameEn: string;
  hex: string;
}

export const THEME_COLOR_PRESETS: ThemeColorPreset[] = [
  { nameAr: "أخضر زمردي", nameEn: "Emerald Green", hex: "#059669" },
  { nameAr: "أزرق ملكي", nameEn: "Royal Blue", hex: "#2563EB" },
  { nameAr: "نيلي بنفسجي", nameEn: "Indigo Violet", hex: "#4F46E5" },
  { nameAr: "أحمر قرمزي", nameEn: "Crimson Red", hex: "#DC2626" },
  { nameAr: "برتقالي كهرماني", nameEn: "Amber Orange", hex: "#D97706" },
  { nameAr: "فيروزي سماوي", nameEn: "Teal Cyan", hex: "#0D9488" },
  { nameAr: "وردي ياقوتي", nameEn: "Rose Pink", hex: "#E11D48" },
  { nameAr: "رمادي فحمي", nameEn: "Slate Charcoal", hex: "#334155" },
  { nameAr: "بنفسجي عميق", nameEn: "Deep Purple", hex: "#7C3AED" },
  { nameAr: "نحاسي محروق", nameEn: "Burnt Copper", hex: "#C2410C" },
  { nameAr: "أزرق محيطي", nameEn: "Ocean Navy", hex: "#1D4ED8" },
  { nameAr: "زيتوني غابات", nameEn: "Forest Olive", hex: "#4D7C0F" },
];

export function hexToHslComponents(hex: string): string {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return "243 75% 59%";

  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Apply dynamic theme color globally via CSS custom properties on :root.
 */
export function applyDynamicThemeColor(hex?: string | null): void {
  if (typeof document === "undefined") return;
  const validHex = hex && /^#[0-9a-fA-F]{6}$/.test(hex.trim()) ? hex.trim() : "#4F46E5";
  const hsl = hexToHslComponents(validHex);
  const root = document.documentElement;

  root.style.setProperty("--brand-primary", validHex);
  root.style.setProperty("--color-primary", validHex);
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.setAttribute("data-brand-themed", "true");
}
