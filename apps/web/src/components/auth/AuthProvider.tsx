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
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from "@flipscout/types";
import { flipScoutApi } from "@/lib/api";

const TOKEN_KEY = "flipscout-access-token";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login(input: LoginRequest): Promise<void>;
  register(input: RegisterRequest): Promise<void>;
  logout(): Promise<void>;
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
    },
    [persistSession],
  );

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

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
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
