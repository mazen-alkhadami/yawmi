/**
 * Dynamic QR token generation and verification for branch kiosks.
 * Rotates every 60 seconds with a SHA-256 hash digest.
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

export async function verifyQrToken(
  token: string,
  branchId: string,
  qrSecret: string
): Promise<{ valid: boolean; reason?: string }> {
  if (!token || !token.startsWith("YAWMI:")) {
    return { valid: false, reason: "Invalid QR format" };
  }

  const parts = token.split(":");
  if (parts.length !== 4) {
    return { valid: false, reason: "Malformed QR token structure" };
  }

  const tokenBranchId = parts[1];
  const tokenWindow = parseInt(parts[2], 10);

  if (tokenBranchId !== branchId) {
    return { valid: false, reason: "QR token does not belong to this branch" };
  }

  const currentWindow = Math.floor(Date.now() / 60000);
  // Allow current window or previous 1-minute window (clock jitter tolerance)
  if (tokenWindow !== currentWindow && tokenWindow !== currentWindow - 1) {
    return { valid: false, reason: "QR token has expired. Please scan the current code." };
  }

  const expectedToken = await generateQrToken(branchId, qrSecret, tokenWindow);
  if (token !== expectedToken) {
    return { valid: false, reason: "QR cryptographic signature mismatch" };
  }

  return { valid: true };
}
