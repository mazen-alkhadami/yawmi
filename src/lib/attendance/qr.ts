/**
 * Dynamic and Static QR token generation and verification for branches.
 * - Dynamic: Rotates every 60 seconds with SHA-256 digest on branch kiosks.
 * - Static: Fixed printable QR poster encoded as YAWMI:STATIC:{branch_id}:{static_qr_token}
 */

export async function generateQrToken(
  branchId: string,
  qrSecret: string,
  timeWindow?: number
): Promise<string> {
  const window = timeWindow ?? Math.floor(Date.now() / 60000);
  const data = `${branchId}:${qrSecret || "yawmi-secret"}:${window}`;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `YAWMI:${branchId}:${window}:${hashHex.substring(0, 16)}`;
}

export function generateStaticQrCode(branchId: string, staticToken: string): string {
  return `YAWMI:STATIC:${branchId}:${staticToken}`;
}

export async function verifyQrToken(
  token: string,
  branchId: string,
  qrSecret: string,
  staticToken?: string | null
): Promise<{ valid: boolean; reason?: string }> {
  if (!token || !token.startsWith("YAWMI:")) {
    return { valid: false, reason: "رمز الباركود غير صالح أو غير تابع لمنصة يومي" };
  }

  // Handle Static Printable QR Code: YAWMI:STATIC:{branch_id}:{static_qr_token}
  if (token.startsWith("YAWMI:STATIC:")) {
    const parts = token.split(":");
    if (parts.length !== 4) {
      return { valid: false, reason: "هيكل رمز الباركود الثابت غير صحيح" };
    }
    const tokenBranchId = parts[2];
    const tokenSecret = parts[3];

    if (tokenBranchId !== branchId) {
      return { valid: false, reason: "رمز الباركود يتبع لفرع آخر غير فرعك المسجل" };
    }

    if (!staticToken || tokenSecret !== staticToken) {
      return { valid: false, reason: "تم إعادة توليد باركود الفرع، يرجى مسح الباركود المطبوع الجديد" };
    }

    return { valid: true };
  }

  // Handle Dynamic 60s Rotating QR Token: YAWMI:{branch_id}:{window}:{hash}
  const parts = token.split(":");
  if (parts.length !== 4) {
    return { valid: false, reason: "هيكل رمز الباركود غير صحيح" };
  }

  const tokenBranchId = parts[1];
  const tokenWindow = parseInt(parts[2], 10);

  if (tokenBranchId !== branchId) {
    return { valid: false, reason: "رمز الباركود يتبع لفرع آخر غير فرعك المسجل" };
  }

  const currentWindow = Math.floor(Date.now() / 60000);
  // Allow current window or previous 1-minute window (clock jitter tolerance)
  if (tokenWindow !== currentWindow && tokenWindow !== currentWindow - 1) {
    return { valid: false, reason: "انتهت صلاحية رمز الباركود (يتجدد كل دقيقة)، يرجى مسح الرمز الحي" };
  }

  const expectedToken = await generateQrToken(branchId, qrSecret, tokenWindow);
  if (token !== expectedToken) {
    return { valid: false, reason: "فشل التحقق من التوقيع المشفر لرمز الباركود" };
  }

  return { valid: true };
}
