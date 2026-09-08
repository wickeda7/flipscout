import { randomUUID } from "node:crypto";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@flipscout/types";
import {
  createAccessToken,
  hashAccessToken,
  hashPassword,
  verifyPassword,
} from "../auth-crypto.js";
import { AuthError, type AuthProvider } from "./auth-provider.js";

type MemoryUser = AuthUser & { passwordHash: string };

export class MemoryAuthProvider implements AuthProvider {
  private readonly usersByEmail = new Map<string, MemoryUser>();
  private readonly usersById = new Map<string, MemoryUser>();
  private readonly sessions = new Map<string, string>();

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
