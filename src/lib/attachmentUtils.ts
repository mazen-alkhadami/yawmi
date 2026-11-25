"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024; // 5MB
const TARGET_IMAGE_BYTES = 500 * 1024; // 500KB

/**
 * Compresses an image File client-side via HTML5 Canvas to <= 500KB (max 1280px).
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const maxDim = 1280;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const toBlob = (quality: number) =>
          new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality));

        let quality = 0.78;
        let blob = await toBlob(quality);

        // Step down quality if still above 500KB
        while (blob && blob.size > TARGET_IMAGE_BYTES && quality > 0.4) {
          quality -= 0.12;
          blob = await toBlob(quality);
        }

        if (!blob) {
          resolve(file);
          return;
        }

        const baseName = file.name.replace(/\.[^.]+$/, "");
        resolve(new File([blob], `${baseName}.jpg`, { type: "image/jpeg" }));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Validates, compresses (if image), and uploads a request attachment to `request-attachments`.
 * Returns the storage object path to save in `requests.attachment_url`.
 */
export async function uploadRequestAttachment(
  supabase: SupabaseClient,
  companyId: string,
  userId: string,
  file: File
): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Allowed: JPG, PNG, WebP, PDF.");
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    throw new Error("File size exceeds the 5MB limit.");
  }

  const preparedFile = file.type.startsWith("image/") ? await compressImageFile(file) : file;
  const ext = preparedFile.name.split(".").pop()?.toLowerCase() || (preparedFile.type === "application/pdf" ? "pdf" : "jpg");
  const storagePath = `${companyId}/${userId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("request-attachments")
    .upload(storagePath, preparedFile, {
      contentType: preparedFile.type,
      upsert: false,
    });

  if (error) throw error;
  return storagePath;
}
