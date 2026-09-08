import type { TranslationKey } from "@flipscout/i18n";

type Translate = (key: TranslationKey) => string;

const API_ERROR_KEYS: Partial<Record<string, TranslationKey>> = {
  INVALID_EMAIL: "auth.error.invalidEmail",
  WEAK_PASSWORD: "auth.error.weakPassword",
  INVALID_DISPLAY_NAME: "auth.error.invalidDisplayName",
  EMAIL_EXISTS: "auth.error.emailExists",
  MISSING_CREDENTIALS: "auth.error.missingCredentials",
  INVALID_CREDENTIALS: "auth.error.invalidCredentials",
  UNAUTHORIZED: "auth.error.unauthorized",
  MISSING_RESET_TOKEN: "auth.error.missingResetToken",
  INVALID_RESET_TOKEN: "auth.error.invalidResetToken",
  MISSING_VERIFICATION_TOKEN: "auth.error.missingVerificationToken",
  INVALID_VERIFICATION_TOKEN: "auth.error.invalidVerificationToken",
  INVALID_CURRENT_PASSWORD: "auth.error.invalidCurrentPassword",
  MISSING_PASSWORD: "auth.error.missingPassword",
  PASSWORD_UNCHANGED: "auth.error.passwordUnchanged",
  RATE_LIMITED: "auth.error.rateLimited",
  INVALID_JSON: "auth.error.invalidRequest",
  PAYLOAD_TOO_LARGE: "auth.error.requestTooLarge",
  USER_NOT_FOUND: "auth.error.userNotFound",
};

export function translatedApiError(
  error: unknown,
  t: Translate,
  fallback: TranslationKey,
): string {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
      ? error.code
      : undefined;

  const key = code ? API_ERROR_KEYS[code] : undefined;
  return key ? t(key) : t(fallback);
}

export function safeInternalPath(
  value: string | null | undefined,
  fallback = "/",
): string {
  if (!value) return fallback;

  let decoded = value;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }

  if (
    !decoded.startsWith("/") ||
    decoded.startsWith("//") ||
    decoded.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(decoded)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://flipscout.local");
    const resolved = new URL(value, base);

    if (resolved.origin !== base.origin) {
      return fallback;
    }
  } catch {
    return fallback;
  }

  return value;
}
