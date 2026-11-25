/**
 * Quick Unlock Utility (6-Digit PIN & Hardware WebAuthn Biometrics)
 * Stored locally in localStorage per bound device and user.
 */

export interface QuickUnlockSettings {
  pinEnabled: boolean;
  pinHash: string | null;
  biometricEnabled: boolean;
  biometricCredentialId: string | null;
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
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
    return {
      pinEnabled: false,
      pinHash: null,
      biometricEnabled: false,
      biometricCredentialId: null,
    };
  }
  const pinEnabled = localStorage.getItem(`yawmi_pin_enabled_${userId}`) === "true";
  const pinHash = localStorage.getItem(`yawmi_pin_hash_${userId}`);
  const biometricCredentialId = localStorage.getItem(`yawmi_bio_cred_id_${userId}`);
  const biometricEnabled =
    localStorage.getItem(`yawmi_bio_enabled_${userId}`) === "true" && !!biometricCredentialId;

  return {
    pinEnabled: pinEnabled && !!pinHash,
    pinHash,
    biometricEnabled,
    biometricCredentialId,
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
  if (settings.biometricCredentialId !== undefined) {
    if (settings.biometricCredentialId) {
      localStorage.setItem(`yawmi_bio_cred_id_${userId}`, settings.biometricCredentialId);
    } else {
      localStorage.removeItem(`yawmi_bio_cred_id_${userId}`);
    }
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

/**
 * Register a real platform WebAuthn credential (FaceID / TouchID / Fingerprint).
 */
export async function registerBiometricCredential(
  userId: string,
  userLabel: string
): Promise<{ ok: boolean; credentialId?: string; error?: string }> {
  if (typeof window === "undefined" || !navigator.credentials?.create || !window.PublicKeyCredential) {
    return { ok: false, error: "unsupported" };
  }

  try {
    const supported = await checkBiometricSupport();
    if (!supported) {
      return { ok: false, error: "unsupported" };
    }

    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    const userBytes = new TextEncoder().encode(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Yawmi",
          id: window.location.hostname,
        },
        user: {
          id: userBytes,
          name: userLabel || "yawmi-employee",
          displayName: userLabel || "Yawmi Employee",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential || !credential.rawId) {
      return { ok: false, error: "cancelled" };
    }

    const rawIdB64 = bufferToBase64Url(credential.rawId);
    saveQuickUnlockSettings(userId, {
      biometricEnabled: true,
      biometricCredentialId: rawIdB64,
    });

    return { ok: true, credentialId: rawIdB64 };
  } catch (err: any) {
    return { ok: false, error: err?.name || "failed" };
  }
}

/**
 * Verify a real hardware WebAuthn challenge before unlocking.
 */
export async function verifyBiometricCredential(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !navigator.credentials?.get || !window.PublicKeyCredential) {
    return { ok: false, error: "unsupported" };
  }

  const { biometricCredentialId } = getQuickUnlockSettings(userId);
  if (!biometricCredentialId) {
    return { ok: false, error: "missing_credential" };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64UrlToBuffer(biometricCredentialId),
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { ok: false, error: "cancelled" };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.name || "failed" };
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
