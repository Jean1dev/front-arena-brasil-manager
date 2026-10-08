import type { FieldError } from "./types";

const BASE_URL = (import.meta.env.VITE_API_URL ?? "https://arena-brasil-scheduler-api-production.up.railway.app/").replace(/\/$/, "");

const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Confira os campos destacados.",
  INVALID_REQUEST_BODY: "Requisição inválida.",
  REQUEST_TOO_LARGE: "Requisição grande demais.",
  UNAUTHORIZED: "Sessão expirada. Entre novamente.",
  INVALID_CREDENTIALS: "E-mail ou senha inválidos.",
  COURT_NOT_FOUND: "Quadra não encontrada.",
  COURT_NAME_ALREADY_EXISTS: "Já existe uma quadra com esse nome.",
  MONTHLY_CUSTOMER_NOT_FOUND: "Mensalista não encontrado.",
  MONTHLY_SCHEDULE_CONFLICT: "Horário já ocupado por outro mensalista.",
  INTERNAL_ERROR: "Erro no servidor. Tente novamente.",
  NETWORK_ERROR: "Não foi possível falar com o servidor.",
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: FieldError[] = [],
  ) {
    super(MESSAGES[code] ?? message);
  }
}

let token: string | null = null;
let onUnauthorized: () => void = () => {};

export function setToken(value: string | null) {
  token = value;
}

export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "network error");
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return data as T;

  const err = data?.error;
  const apiError = new ApiError(res.status, err?.code ?? "INTERNAL_ERROR", err?.message ?? res.statusText, err?.fields ?? []);
  if (res.status === 401 && token) onUnauthorized();
  throw apiError;
}
