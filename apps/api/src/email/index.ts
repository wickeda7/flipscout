import type { EmailProvider } from "./email-provider.js";
import { ConsoleEmailProvider } from "./console-email-provider.js";
import { ResendEmailProvider } from "./resend-email-provider.js";

export function createEmailProvider(): EmailProvider {
  const provider =
    process.env.EMAIL_PROVIDER?.trim().toLowerCase() ||
    ((process.env.NODE_ENV ?? "development") === "production"
      ? "resend"
      : "console");

  if (provider === "console") {
    return new ConsoleEmailProvider();
  }

  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM_EMAIL?.trim();

    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY is required when EMAIL_PROVIDER=resend.",
      );
    }

    if (!from) {
      throw new Error(
        "RESEND_FROM_EMAIL is required when EMAIL_PROVIDER=resend.",
      );
    }

    return new ResendEmailProvider(apiKey, from);
  }

  throw new Error(
    `Unsupported EMAIL_PROVIDER "${provider}". Use "console" or "resend".`,
  );
}
