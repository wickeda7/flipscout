export interface VerificationEmailInput {
  to: string;
  verificationUrl: string;
}

export interface PasswordResetEmailInput {
  to: string;
  resetUrl: string;
}

export interface EmailProvider {
  readonly name: string;
  sendVerificationEmail(input: VerificationEmailInput): Promise<void>;
  sendPasswordResetEmail(input: PasswordResetEmailInput): Promise<void>;
}
