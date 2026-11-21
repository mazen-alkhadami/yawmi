"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CountryCode {
  code: string;
  nameAr: string;
  nameEn: string;
  iso2: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+966", nameAr: "السعودية", nameEn: "Saudi Arabia", iso2: "sa" },
  { code: "+967", nameAr: "اليمن", nameEn: "Yemen", iso2: "ye" },
  { code: "+971", nameAr: "الإمارات", nameEn: "UAE", iso2: "ae" },
  { code: "+965", nameAr: "الكويت", nameEn: "Kuwait", iso2: "kw" },
  { code: "+973", nameAr: "البحرين", nameEn: "Bahrain", iso2: "bh" },
  { code: "+974", nameAr: "قطر", nameEn: "Qatar", iso2: "qa" },
  { code: "+968", nameAr: "عُمان", nameEn: "Oman", iso2: "om" },
  { code: "+20", nameAr: "مصر", nameEn: "Egypt", iso2: "eg" },
  { code: "+962", nameAr: "الأردن", nameEn: "Jordan", iso2: "jo" },
  { code: "+964", nameAr: "العراق", nameEn: "Iraq", iso2: "iq" },
  { code: "+961", nameAr: "لبنان", nameEn: "Lebanon", iso2: "lb" },
  { code: "+963", nameAr: "سوريا", nameEn: "Syria", iso2: "sy" },
  { code: "+249", nameAr: "السودان", nameEn: "Sudan", iso2: "sd" },
  { code: "+212", nameAr: "المغرب", nameEn: "Morocco", iso2: "ma" },
  { code: "+213", nameAr: "الجزائر", nameEn: "Algeria", iso2: "dz" },
  { code: "+216", nameAr: "تونس", nameEn: "Tunisia", iso2: "tn" },
  { code: "+218", nameAr: "ليبيا", nameEn: "Libya", iso2: "ly" },
  { code: "+970", nameAr: "فلسطين", nameEn: "Palestine", iso2: "ps" },
  { code: "+90", nameAr: "تركيا", nameEn: "Turkey", iso2: "tr" },
  { code: "+1", nameAr: "أمريكا/كندا", nameEn: "US/Canada", iso2: "us" },
  { code: "+44", nameAr: "بريطانيا", nameEn: "UK", iso2: "gb" },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (val: string) => void;
  lang?: "ar" | "en";
  className?: string;
}

export function CountryCodeSelect({
  value,
  onChange,
  lang = "ar",
  className = "",
}: CountryCodeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = COUNTRY_CODES.find((c) => c.code === value) || COUNTRY_CODES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={`relative shrink-0 w-[96px] ${className}`} dir="ltr">
      {/* Trigger Button showing 20px flag + code + chevron */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-11 px-2 flex items-center justify-between gap-1.5 rounded-s-xl bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition-colors focus:outline-none cursor-pointer"
        title={lang === "ar" ? `${selected.nameAr} (${selected.code})` : `${selected.nameEn} (${selected.code})`}
      >
        <img
          src={`https://flagcdn.com/w20/${selected.iso2}.png`}
          alt={selected.iso2}
          width={20}
          height={15}
          className="w-5 h-3.5 object-cover rounded-sm shrink-0 border border-slate-300 dark:border-slate-600"
          loading="eager"
        />
        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
          {selected.code}
        </span>
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 max-h-64 overflow-y-auto rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl py-1 text-xs">
          {COUNTRY_CODES.map((c) => {
            const isCurrent = c.code === selected.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 flex items-center gap-2.5 transition text-start ${
                  isCurrent
                    ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <img
                  src={`https://flagcdn.com/w20/${c.iso2}.png`}
                  alt={c.iso2}
                  width={20}
                  height={15}
                  className="w-5 h-3.5 object-cover rounded-sm shrink-0 border border-slate-200 dark:border-slate-700"
                />
                <span className="font-mono font-bold text-slate-900 dark:text-white w-12 shrink-0">
                  {c.code}
                </span>
                <span className="truncate flex-1">
                  {lang === "ar" ? c.nameAr : c.nameEn}
                </span>
                {isCurrent && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
