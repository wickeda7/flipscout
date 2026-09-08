function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function button(url: string, label: string): string {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);

  return `
    <a
      href="${safeUrl}"
      style="
        display:inline-block;
        padding:12px 18px;
        border-radius:10px;
        background:#111827;
        color:#ffffff;
        text-decoration:none;
        font-weight:700;
      "
    >${safeLabel}</a>
  `;
}

function shell(title: string, body: string): string {
  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif;color:#111827;">
        <div style="max-width:560px;margin:0 auto;padding:36px 20px;">
          <div style="background:#ffffff;border-radius:16px;padding:28px;border:1px solid #e5e7eb;">
            <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#059669;">
              FlipScout
            </div>
            <h1 style="font-size:24px;line-height:1.25;margin:14px 0 12px;">
              ${escapeHtml(title)}
            </h1>
            ${body}
            <p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#6b7280;">
              If you did not request this action, you can ignore this email.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function verificationEmailHtml(url: string): string {
  return shell(
    "Verify your FlipScout email",
    `
      <p style="font-size:15px;line-height:1.7;color:#4b5563;">
        Verify your email address to secure your FlipScout account.
      </p>
      <div style="margin-top:22px;">
        ${button(url, "Verify email")}
      </div>
      <p style="margin-top:20px;font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;">
        Or open this link: ${escapeHtml(url)}
      </p>
    `,
  );
}

export function passwordResetEmailHtml(url: string): string {
  return shell(
    "Reset your FlipScout password",
    `
      <p style="font-size:15px;line-height:1.7;color:#4b5563;">
        A password reset was requested for your FlipScout account.
      </p>
      <div style="margin-top:22px;">
        ${button(url, "Reset password")}
      </div>
      <p style="margin-top:20px;font-size:12px;line-height:1.6;color:#6b7280;word-break:break-all;">
        Or open this link: ${escapeHtml(url)}
      </p>
    `,
  );
}
