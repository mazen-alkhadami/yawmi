"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface TourStep {
  id: string;
  targetId?: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  icon?: React.ReactNode;
  onEnter?: () => void;
}

interface ProductTourProps {
  isOpen: boolean;
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ProductTour({
  isOpen,
  steps,
  onComplete,
  onSkip,
}: ProductTourProps) {
  const { dir, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const measureTarget = useCallback((shouldScroll: boolean) => {
    if (typeof window === "undefined") return;
    setViewport({ width: window.innerWidth, height: window.innerHeight });

    if (!isOpen || !step?.targetId) {
      setRect(null);
      return;
    }

    const el = document.getElementById(step.targetId);
    if (!el) {
      setRect(null);
      return;
    }

    const initialRect = el.getBoundingClientRect();
    if (
      shouldScroll &&
      (initialRect.top < 72 || initialRect.bottom > window.innerHeight - 72)
    ) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    const applyMeasure = () => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        setRect(null);
        return;
      }
      setViewport({ width: window.innerWidth, height: window.innerHeight });
      setRect({
        top: Math.max(4, r.top - 6),
        left: Math.max(4, r.left - 6),
        width: r.width + 12,
        height: r.height + 12,
      });
    };

    applyMeasure();
    if (shouldScroll) {
      const t1 = setTimeout(applyMeasure, 180);
      const t2 = setTimeout(applyMeasure, 380);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setRect(null);
      return;
    }

    if (step?.onEnter) {
      step.onEnter();
    }

    let cleanupMeasure: (() => void) | undefined;
    const initTimer = setTimeout(() => {
      cleanupMeasure = measureTarget(true);
    }, 80);

    const handleViewportChange = () => {
      measureTarget(false);
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      clearTimeout(initTimer);
      if (cleanupMeasure) cleanupMeasure();
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isOpen, currentStep, step, measureTarget]);

  if (!isOpen || !step || steps.length === 0) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const NextIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Compute smart tooltip positioning (auto-flip above/below + horizontal clamping)
  const PAD = 16;
  const vw = viewport.width || (typeof window !== "undefined" ? window.innerWidth : 390);
  const vh = viewport.height || (typeof window !== "undefined" ? window.innerHeight : 844);
  const cardWidth = Math.min(384, Math.max(260, vw - PAD * 2));

  let cardStyle: React.CSSProperties | undefined;
  let placement: "top" | "bottom" | "center" = "center";

  if (rect && vw > 0 && vh > 0) {
    const targetCenterY = rect.top + rect.height / 2;
    const targetCenterX = rect.left + rect.width / 2;
    const isLowerHalf = targetCenterY > vh / 2;

    const desiredLeft = targetCenterX - cardWidth / 2;
    const clampedLeft = Math.max(PAD, Math.min(desiredLeft, vw - cardWidth - PAD));

    if (isLowerHalf) {
      placement = "top";
      const bottomOffset = Math.max(PAD, vh - rect.top + PAD);
      const availableAbove = Math.max(180, vh - bottomOffset - PAD);
      cardStyle = {
        position: "fixed",
        left: clampedLeft,
        width: cardWidth,
        bottom: bottomOffset,
        maxHeight: availableAbove,
      };
    } else {
      placement = "bottom";
      const topOffset = Math.max(PAD, rect.top + rect.height + PAD);
      const availableBelow = Math.max(180, vh - topOffset - PAD);
      cardStyle = {
        position: "fixed",
        left: clampedLeft,
        width: cardWidth,
        top: topOffset,
        maxHeight: availableBelow,
      };
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] font-cairo"
      dir={dir}
      role="dialog"
      aria-modal="true"
    >
      {/* Dimmed Overlay / Spotlight Cutout */}
      {rect ? (
        <>
          {/* Clickable backdrop layer behind spotlight */}
          <div
            className="fixed inset-0 bg-transparent"
            onClick={onSkip}
            aria-hidden="true"
          />
          <div
            className="fixed rounded-2xl pointer-events-none transition-all duration-300 ease-out border-2 border-indigo-400 shadow-[0_0_0_9999px_rgba(2,6,23,0.74)]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      ) : (
        <div
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-[2px] transition-opacity"
          onClick={onSkip}
        />
      )}

      {/* Tooltip Card (Positioned dynamically above/below target, or centered when no target) */}
      <div
        className={
          rect
            ? "fixed inset-0 pointer-events-none z-10"
            : "fixed inset-0 flex items-center justify-center p-4 pointer-events-none z-10"
        }
      >
        <div
          ref={cardRef}
          data-tour-placement={placement}
          style={cardStyle}
          className="pointer-events-auto w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl p-5 space-y-4 overflow-y-auto transition-all duration-200 ease-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Row: Step Counter + Skip */}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              <span>
                {language === "ar"
                  ? `الخطوة ${currentStep + 1} من ${steps.length}`
                  : `Step ${currentStep + 1} of ${steps.length}`}
              </span>
            </span>

            <button
              type="button"
              onClick={onSkip}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
            >
              <span>{language === "ar" ? "تخطي" : "Skip"}</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step Icon + Title + Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              {step.icon && (
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  {step.icon}
                </div>
              )}
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                {language === "ar" ? step.titleAr : step.titleEn}
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {language === "ar" ? step.descAr : step.descEn}
            </p>
          </div>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Step ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "w-6 bg-indigo-600 dark:bg-indigo-400"
                    : idx < currentStep
                    ? "w-2 bg-indigo-300 dark:bg-indigo-700"
                    : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition"
            >
              <BackIcon className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "السابق" : "Back"}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md transition ${
                isLast
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
              }`}
            >
              <span>
                {isLast
                  ? language === "ar"
                    ? "إنهاء الجولة"
                    : "Finish"
                  : language === "ar"
                  ? "التالي"
                  : "Next"}
              </span>
              {isLast ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <NextIcon className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
