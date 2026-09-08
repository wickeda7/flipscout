"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AuthResponse,
  AuthUser,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";

const TOKEN_KEY = "flipscout-access-token";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(input: LoginRequest): Promise<void>;
  register(input: RegisterRequest): Promise<AuthResponse>;
  refreshUser(): Promise<void>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  updateProfile(input: UpdateProfileRequest): Promise<void>;
  changePassword(input: ChangePasswordRequest): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    flipScoutApi.setAccessToken(token);

    flipScoutApi
      .me()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        flipScoutApi.setAccessToken(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const persistSession = useCallback(
    (accessToken: string, nextUser: AuthUser) => {
      window.localStorage.setItem(TOKEN_KEY, accessToken);
      flipScoutApi.setAccessToken(accessToken);
      setUser(nextUser);
      window.dispatchEvent(new Event("flipscout-watchlist-change"));
    },
    [],
  );

  const login = useCallback(
    async (input: LoginRequest) => {
      const result = await flipScoutApi.login(input);
      persistSession(result.accessToken, result.user);
    },
    [persistSession],
  );

  const register = useCallback(
    async (input: RegisterRequest) => {
      const result = await flipScoutApi.register(input);
      persistSession(result.accessToken, result.user);
      return result;
    },
    [persistSession],
  );

  const refreshUser = useCallback(async () => {
    const result = await flipScoutApi.me();
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await flipScoutApi.logout();
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      flipScoutApi.setAccessToken(null);
      setUser(null);
      window.dispatchEvent(new Event("flipscout-watchlist-change"));
    }
  }, []);


  const updateProfile = useCallback(
    async (input: UpdateProfileRequest) => {
      const result = await flipScoutApi.updateProfile(input);
      setUser(result.user);
    },
    [],
  );

  const changePassword = useCallback(
    async (input: ChangePasswordRequest) => {
      await flipScoutApi.changePassword(input);
      window.localStorage.removeItem(TOKEN_KEY);
      flipScoutApi.setAccessToken(null);
      setUser(null);
      window.dispatchEvent(new Event("flipscout-watchlist-change"));
    },
    [],
  );

  const logoutAll = useCallback(async () => {
    try {
      await flipScoutApi.logoutAll();
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      flipScoutApi.setAccessToken(null);
      setUser(null);
      window.dispatchEvent(new Event("flipscout-watchlist-change"));
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      refreshUser,
      logout,
      logoutAll,
      updateProfile,
      changePassword,
    }),
    [
      user,
      loading,
      login,
      register,
      refreshUser,
      logout,
      logoutAll,
      updateProfile,
      changePassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
