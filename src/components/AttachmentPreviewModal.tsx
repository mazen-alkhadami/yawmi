"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Download, FileText, Loader2, X, AlertCircle } from "lucide-react";

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachmentPath: string | null;
  language?: "ar" | "en";
}

export function AttachmentPreviewModal({
  isOpen,
  onClose,
  attachmentPath,
  language = "ar",
}: AttachmentPreviewModalProps) {
  const supabase = createClient();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !attachmentPath) {
      setSignedUrl(null);
      setErrorMsg(null);
      return;
    }

    let active = true;
    const loadUrl = async () => {
      if (attachmentPath.startsWith("http://") || attachmentPath.startsWith("https://")) {
        setSignedUrl(attachmentPath);
        return;
      }

      setLoading(true);
      setErrorMsg(null);
      try {
        const { data, error } = await supabase.storage
          .from("request-attachments")
          .createSignedUrl(attachmentPath, 300);

        if (!active) return;
        if (error || !data?.signedUrl) {
          throw error || new Error("Could not generate signed URL");
        }
        setSignedUrl(data.signedUrl);
      } catch (err: any) {
        if (!active) return;
        setErrorMsg(err?.message || (language === "ar" ? "تعذر تحميل المرفق" : "Failed to load attachment"));
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUrl();
    return () => {
      active = false;
    };
  }, [isOpen, attachmentPath, language]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !attachmentPath) return null;

  const isPdf = attachmentPath.toLowerCase().split("?")[0].endsWith(".pdf");

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 font-cairo"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {language === "ar" ? "معاينة المرفق" : "Attachment Preview"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {signedUrl && (
              <a
                href={signedUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{language === "ar" ? "تحميل" : "Download"}</span>
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/60 min-h-[280px]">
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span>{language === "ar" ? "جاري تجهيز المرفق..." : "Loading attachment..."}</span>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center gap-2 text-rose-600 text-xs text-center p-4">
              <AlertCircle className="w-6 h-6" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          ) : signedUrl ? (
            isPdf ? (
              <iframe
                src={signedUrl}
                title="Attachment PDF Preview"
                className="w-full h-[65vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
              />
            ) : (
              <img
                src={signedUrl}
                alt="Request Attachment"
                className="max-w-full max-h-[68vh] object-contain rounded-xl shadow-md"
              />
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
