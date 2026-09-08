import type {
  EmailProvider,
  PasswordResetEmailInput,
  VerificationEmailInput,
} from "./email-provider.js";

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async sendVerificationEmail(
    input: VerificationEmailInput,
  ): Promise<void> {
    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new Error(
        "ConsoleEmailProvider is disabled in production. Configure EMAIL_PROVIDER=resend.",
      );
    }

    console.log(
      `[FlipScout email:verification] to=${input.to} url=${input.verificationUrl}`,
    );
  }

  async sendPasswordResetEmail(
    input: PasswordResetEmailInput,
  ): Promise<void> {
    if ((process.env.NODE_ENV ?? "development") === "production") {
      throw new Error(
        "ConsoleEmailProvider is disabled in production. Configure EMAIL_PROVIDER=resend.",
      );
    }

    console.log(
      `[FlipScout email:password-reset] to=${input.to} url=${input.resetUrl}`,
    );
  }
}
