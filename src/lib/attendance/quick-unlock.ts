/**
 * Quick Unlock Utility (6-Digit PIN & Biometrics)
 * Stored locally in localStorage per bound device and user.
 */

export interface QuickUnlockSettings {
  pinEnabled: boolean;
  pinHash: string | null;
  biometricEnabled: boolean;
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${pin}_yawmi_salt_${salt}`);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getQuickUnlockSettings(userId: string): QuickUnlockSettings {
  if (typeof window === "undefined") {
    return { pinEnabled: false, pinHash: null, biometricEnabled: false };
  }
  const pinEnabled = localStorage.getItem(`yawmi_pin_enabled_${userId}`) === "true";
  const pinHash = localStorage.getItem(`yawmi_pin_hash_${userId}`);
  const biometricEnabled = localStorage.getItem(`yawmi_bio_enabled_${userId}`) === "true";

  return {
    pinEnabled: pinEnabled && !!pinHash,
    pinHash,
    biometricEnabled,
  };
}

export function saveQuickUnlockSettings(
  userId: string,
  settings: Partial<QuickUnlockSettings>
) {
  if (typeof window === "undefined") return;

  if (settings.pinEnabled !== undefined) {
    localStorage.setItem(`yawmi_pin_enabled_${userId}`, settings.pinEnabled ? "true" : "false");
  }
  if (settings.pinHash !== undefined) {
    if (settings.pinHash) {
      localStorage.setItem(`yawmi_pin_hash_${userId}`, settings.pinHash);
    } else {
      localStorage.removeItem(`yawmi_pin_hash_${userId}`);
    }
  }
  if (settings.biometricEnabled !== undefined) {
    localStorage.setItem(
      `yawmi_bio_enabled_${userId}`,
      settings.biometricEnabled ? "true" : "false"
    );
  }
}

export async function verifyPin(pin: string, salt: string, storedHash: string): Promise<boolean> {
  const currentHash = await hashPin(pin, salt);
  return currentHash === storedHash;
}

export async function checkBiometricSupport(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch {
    return false;
  }
}

export function isSessionUnlocked(userId: string): boolean {
  if (typeof window === "undefined") return true;
  return sessionStorage.getItem(`yawmi_unlocked_${userId}`) === "true";
}

export function setSessionUnlocked(userId: string, unlocked: boolean) {
  if (typeof window === "undefined") return;
  if (unlocked) {
    sessionStorage.setItem(`yawmi_unlocked_${userId}`, "true");
  } else {
    sessionStorage.removeItem(`yawmi_unlocked_${userId}`);
  }
}
