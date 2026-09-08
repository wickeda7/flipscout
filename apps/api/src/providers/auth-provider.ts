import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@flipscout/types";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthProvider {
  register(input: RegisterRequest): Promise<AuthResponse>;
  login(input: LoginRequest): Promise<AuthResponse>;
  getUserByToken(token: string): Promise<AuthUser | null>;
  logout(token: string): Promise<void>;
  logoutAll(userId: string): Promise<void>;
  updateProfile(userId: string, displayName: string | null): Promise<AuthUser>;
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void>;
  createPasswordReset(email: string): Promise<string | null>;
  resetPassword(token: string, newPassword: string): Promise<void>;
}
