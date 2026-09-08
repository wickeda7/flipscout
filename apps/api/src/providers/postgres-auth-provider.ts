import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
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

type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  password_hash: string | null;
};

export class PostgresAuthProvider implements AuthProvider {
  constructor(private readonly pool: Pool) {}

  async register(input: RegisterRequest): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const id = randomUUID();

    try {
      const result = await this.pool.query<UserRow>(
        `
        INSERT INTO users (id, email, display_name, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id::text, email, display_name, password_hash
        `,
        [
          id,
          email,
          input.displayName?.trim() || null,
          hashPassword(input.password),
        ],
      );

      return this.createSession(this.publicUser(result.rows[0]));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new AuthError(
          "An account with this email already exists.",
          409,
          "EMAIL_EXISTS",
        );
      }
      throw error;
    }
  }

  async login(input: LoginRequest): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();

    const result = await this.pool.query<UserRow>(
      `
      SELECT id::text, email, display_name, password_hash
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [email],
    );

    const row = result.rows[0];

    if (!row?.password_hash || !verifyPassword(input.password, row.password_hash)) {
      throw new AuthError(
        "Invalid email or password.",
        401,
        "INVALID_CREDENTIALS",
      );
    }

    return this.createSession(this.publicUser(row));
  }

  async getUserByToken(token: string): Promise<AuthUser | null> {
    const result = await this.pool.query<UserRow>(
      `
      SELECT u.id::text, u.email, u.display_name, u.password_hash
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
      `,
      [hashAccessToken(token)],
    );

    return result.rows[0] ? this.publicUser(result.rows[0]) : null;
  }

  async logout(token: string): Promise<void> {
    await this.pool.query(
      "DELETE FROM auth_sessions WHERE token_hash = $1",
      [hashAccessToken(token)],
    );
  }


  async logoutAll(userId: string): Promise<void> {
    await this.pool.query(
      "DELETE FROM auth_sessions WHERE user_id = $1",
      [userId],
    );
  }

  async updateProfile(
    userId: string,
    displayName: string | null,
  ): Promise<AuthUser> {
    const result = await this.pool.query<UserRow>(
      `
      UPDATE users
      SET display_name = $2
      WHERE id = $1
      RETURNING id::text, email, display_name, password_hash
      `,
      [userId, displayName?.trim() || null],
    );

    if (!result.rows[0]) {
      throw new AuthError("User not found.", 404, "USER_NOT_FOUND");
    }

    return this.publicUser(result.rows[0]);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const result = await this.pool.query<UserRow>(
      `
      SELECT id::text, email, display_name, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    const user = result.rows[0];

    if (
      !user?.password_hash ||
      !verifyPassword(currentPassword, user.password_hash)
    ) {
      throw new AuthError(
        "Current password is incorrect.",
        400,
        "INVALID_CURRENT_PASSWORD",
      );
    }

    await this.pool.query(
      "UPDATE users SET password_hash = $2 WHERE id = $1",
      [userId, hashPassword(newPassword)],
    );

    await this.logoutAll(userId);
  }


  async createPasswordReset(email: string): Promise<string | null> {
    const result = await this.pool.query<{ id: string }>(
      "SELECT id::text FROM users WHERE LOWER(email) = $1 LIMIT 1",
      [email.trim().toLowerCase()],
    );

    const user = result.rows[0];
    if (!user) return null;

    const token = createPasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const minutes = Number(process.env.PASSWORD_RESET_MINUTES ?? 30);

    await this.pool.query(
      "DELETE FROM password_reset_tokens WHERE user_id = $1",
      [user.id],
    );

    await this.pool.query(
      `
      INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
      VALUES ($1, $2, NOW() + ($3::text || ' minutes')::interval)
      `,
      [tokenHash, user.id, minutes],
    );

    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashPasswordResetToken(token);
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query<{ user_id: string }>(
        `
        SELECT user_id::text
        FROM password_reset_tokens
        WHERE token_hash = $1
          AND expires_at > NOW()
        FOR UPDATE
        `,
        [tokenHash],
      );

      const reset = result.rows[0];

      if (!reset) {
        await client.query("ROLLBACK");
        throw new AuthError(
          "Password reset link is invalid or expired.",
          400,
          "INVALID_RESET_TOKEN",
        );
      }

      await client.query(
        "UPDATE users SET password_hash = $2 WHERE id = $1",
        [reset.user_id, hashPassword(newPassword)],
      );

      await client.query(
        "DELETE FROM password_reset_tokens WHERE user_id = $1",
        [reset.user_id],
      );

      await client.query(
        "DELETE FROM auth_sessions WHERE user_id = $1",
        [reset.user_id],
      );

      await client.query("COMMIT");
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original error.
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async createSession(user: AuthUser): Promise<AuthResponse> {
    const accessToken = createAccessToken();
    const tokenHash = hashAccessToken(accessToken);
    const sessionDays = Number(process.env.AUTH_SESSION_DAYS ?? 30);

    await this.pool.query(
      `
      INSERT INTO auth_sessions (user_id, token_hash, expires_at)
      VALUES ($1, $2, NOW() + ($3::text || ' days')::interval)
      `,
      [user.id, tokenHash, sessionDays],
    );

    return { user, accessToken };
  }

  private publicUser(row: UserRow): AuthUser {
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
    };
  }
}
