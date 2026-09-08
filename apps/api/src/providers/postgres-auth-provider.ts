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
  hashAccessToken,
  hashPassword,
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
