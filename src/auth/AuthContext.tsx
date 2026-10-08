import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setToken, setUnauthorizedHandler } from "../api/client";
import { login as apiLogin } from "../api/auth";
import { useToast } from "../components/Toast";

const STORAGE_KEY = "arena-manager.session";

interface Session {
  token: string;
  expiresAt: string;
}

interface AuthValue {
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue>(null!);

export const useAuth = () => useContext(AuthContext);

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const session = raw ? (JSON.parse(raw) as Session) : null;
    return session && new Date(session.expiresAt).getTime() > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function storeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sem storage: a sessão vale só nesta aba */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    const s = loadSession();
    setToken(s?.token ?? null);
    return s;
  });
  const queryClient = useQueryClient();
  const toast = useToast();

  const logout = useCallback(() => {
    setToken(null);
    storeSession(null);
    setSession(null);
    queryClient.clear();
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    const next = { token: res.accessToken, expiresAt: res.expiresAt };
    setToken(next.token);
    storeSession(next);
    setSession(next);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      toast("Sessão expirada. Entre novamente.", "info");
    });
  }, [logout, toast]);

  useEffect(() => {
    if (!session) return;
    const ms = new Date(session.expiresAt).getTime() - Date.now();
    const timer = setTimeout(() => {
      logout();
      toast("Sessão expirada. Entre novamente.", "info");
    }, Math.min(Math.max(ms, 0), 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [session, logout, toast]);

  return <AuthContext.Provider value={{ isAuthenticated: !!session, login, logout }}>{children}</AuthContext.Provider>;
}
