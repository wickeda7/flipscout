import { randomUUID } from "node:crypto";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@flipscout/types";
import {
  createAccessToken,
  createPasswordResetToken,
  hashAccessToken,
  hashPassword,
  hashPasswordResetToken,
  verifyPassword,
} from "../auth-crypto.js";
import { AuthError, type AuthProvider } from "./auth-provider.js";

type MemoryUser = AuthUser & { passwordHash: string };

export class MemoryAuthProvider implements AuthProvider {
  private readonly usersByEmail = new Map<string, MemoryUser>();
  private readonly usersById = new Map<string, MemoryUser>();
  private readonly sessions = new Map<string, string>();
  private readonly passwordResets = new Map<string, { userId: string; expiresAt: number }>();

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();

    if (this.usersByEmail.has(email)) {
      throw new AuthError(
        "An account with this email already exists.",
        409,
        "EMAIL_EXISTS",
      );
    }

    const user: MemoryUser = {
      id: randomUUID(),
      email,
      displayName: input.displayName?.trim() || null,
      passwordHash: hashPassword(input.password),
    };

    this.usersByEmail.set(email, user);
    this.usersById.set(user.id, user);

    return this.createSession(user);
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = this.usersByEmail.get(email);

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AuthError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    return this.createSession(user);
  }

  async getUserByToken(token: string): Promise<AuthUser | null> {
    const userId = this.sessions.get(hashAccessToken(token));
    if (!userId) return null;

    const user = this.usersById.get(userId);
    return user ? this.publicUser(user) : null;
  }

  async logout(token: string): Promise<void> {
    this.sessions.delete(hashAccessToken(token));
  }


  async logoutAll(userId: string): Promise<void> {
    for (const [tokenHash, sessionUserId] of this.sessions.entries()) {
      if (sessionUserId === userId) {
        this.sessions.delete(tokenHash);
      }
    }
  }

  async updateProfile(
    userId: string,
    displayName: string | null,
  ): Promise<AuthUser> {
    const user = this.usersById.get(userId);
    if (!user) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    user.displayName = displayName?.trim() || null;
    this.usersById.set(userId, user);
    this.usersByEmail.set(user.email, user);
    return this.publicUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = this.usersById.get(userId);

    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      throw new AuthError(
        "Current password is incorrect.",
        400,
        "INVALID_CURRENT_PASSWORD",
      );
    }

    user.passwordHash = hashPassword(newPassword);
    this.usersById.set(userId, user);
    this.usersByEmail.set(user.email, user);
    await this.logoutAll(userId);
  }


  async createPasswordReset(email: string): Promise<string | null> {
    const user = this.usersByEmail.get(email.trim().toLowerCase());
    if (!user) return null;

    const token = createPasswordResetToken();
    this.passwordResets.set(hashPasswordResetToken(token), {
      userId: user.id,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashPasswordResetToken(token);
    const reset = this.passwordResets.get(tokenHash);

    if (!reset || reset.expiresAt <= Date.now()) {
      this.passwordResets.delete(tokenHash);
      throw new AuthError(
        "Password reset link is invalid or expired.",
        400,
        "INVALID_RESET_TOKEN",
      );
    }

    const user = this.usersById.get(reset.userId);
    if (!user) {
      this.passwordResets.delete(tokenHash);
      throw new AuthError(
        "Password reset link is invalid or expired.",
        400,
        "INVALID_RESET_TOKEN",
      );
    }

    user.passwordHash = hashPassword(newPassword);
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    this.passwordResets.delete(tokenHash);
    await this.logoutAll(user.id);
  }

  private createSession(user: MemoryUser): AuthResponse {
    const accessToken = createAccessToken();
    this.sessions.set(hashAccessToken(accessToken), user.id);

    return {
      user: this.publicUser(user),
      accessToken,
    };
  }

  private publicUser(user: MemoryUser): AuthUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  }
}
