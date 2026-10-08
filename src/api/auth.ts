import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { Admin, LoginResponse } from "./types";

export const login = (email: string, password: string) => api<LoginResponse>("POST", "/auth/login", { email, password });

export const useMe = (enabled: boolean) =>
  useQuery({ queryKey: ["me"], queryFn: () => api<Admin>("GET", "/auth/me"), enabled, staleTime: Infinity });
