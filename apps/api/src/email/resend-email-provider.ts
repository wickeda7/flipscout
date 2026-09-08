import type {
  EmailProvider,
  PasswordResetEmailInput,
  VerificationEmailInput,
} from "./email-provider.js";
import {
  passwordResetEmailHtml,
  verificationEmailHtml,
} from "./templates.js";

interface ResendErrorBody {
  message?: string;
  name?: string;
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async sendVerificationEmail(
    input: VerificationEmailInput,
  ): Promise<void> {
    await this.send({
      to: input.to,
      subject: "Verify your FlipScout email",
      html: verificationEmailHtml(input.verificationUrl),
      tag: "email_verification",
    });
  }

  async sendPasswordResetEmail(
    input: PasswordResetEmailInput,
  ): Promise<void> {
    await this.send({
      to: input.to,
      subject: "Reset your FlipScout password",
      html: passwordResetEmailHtml(input.resetUrl),
      tag: "password_reset",
    });
  }

  private async send(input: {
    to: string;
    subject: string;
    html: string;
    tag: string;
  }): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        tags: [
          {
            name: "category",
            value: input.tag,
          },
        ],
      }),
    });

    if (response.ok) return;

    const body = (await response
      .json()
      .catch(() => ({}))) as ResendErrorBody;

    throw new Error(
      body.message ||
        `Resend email request failed with HTTP ${response.status}.`,
    );
  }
}
