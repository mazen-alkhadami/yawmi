/**
 * Device binding utility for employee attendance verification.
 * Persists a unique persistent device UUID in localStorage.
 */

const DEVICE_STORAGE_KEY = "yawmi_device_id";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";

  let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
  if (!deviceId) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(8));
    const randomHex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    deviceId = `dev_${Date.now().toString(36)}_${randomHex}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
  }
  return deviceId;
}

export function verifyDeviceBinding(profileDeviceId: string | null | undefined): {
  isBound: boolean;
  matches: boolean;
  currentDeviceId: string;
} {
  const currentDeviceId = getOrCreateDeviceId();

  if (!profileDeviceId) {
    // Not bound yet; allowed to bind this device on first check-in
    return { isBound: false, matches: true, currentDeviceId };
  }

  return {
    isBound: true,
    matches: profileDeviceId === currentDeviceId,
    currentDeviceId,
  };
}
