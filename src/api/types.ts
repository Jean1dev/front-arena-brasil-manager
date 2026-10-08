/** Tipos do contrato `docs/openapi.yaml` da arena-brasil-scheduler-api. */

export type Weekday = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";

export type CourtType = "INDOOR" | "OUTDOOR";

export interface Admin {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresAt: string;
}

export interface Court {
  id: string;
  name: string;
  type: CourtType;
  minHourlyPriceCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourtInput {
  name: string;
  type: CourtType;
  minHourlyPriceCents: number;
}

export type CourtPatch = Partial<CourtInput> & { active?: boolean };

/** Horas inteiras; `closeHour` 24 = meia-noite no fim do dia. */
export interface Window {
  weekday: Weekday;
  openHour: number;
  closeHour: number;
}

export interface BusinessHours {
  timezone: string;
  days: Window[];
}

/** `AVAILABLE`, `MONTHLY` ou qualquer status futuro (tratar como indisponível). */
export interface Slot {
  start: string;
  end: string;
  status: string;
  priceCents: number;
}

export interface SlotDay {
  date: string;
  weekday: Weekday;
  open: boolean;
  slots: Slot[];
}

export interface CourtSlots {
  courtId: string;
  timezone: string;
  days: SlotDay[];
}

/** Horas `[startHour, endHour)` de uma quadra num dia da semana, toda semana. */
export interface ScheduleEntry {
  courtId: string;
  weekday: Weekday;
  startHour: number;
  endHour: number;
}

export interface MonthlyCustomer {
  id: string;
  name: string;
  description: string;
  active: boolean;
  schedule: ScheduleEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyCustomerInput {
  name: string;
  description: string;
  schedule: ScheduleEntry[];
}

export type MonthlyCustomerPatch = Partial<MonthlyCustomerInput> & { active?: boolean };

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_REQUEST_BODY"
  | "REQUEST_TOO_LARGE"
  | "UNAUTHORIZED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_ALREADY_EXISTS"
  | "COURT_NOT_FOUND"
  | "COURT_NAME_ALREADY_EXISTS"
  | "MONTHLY_CUSTOMER_NOT_FOUND"
  | "MONTHLY_SCHEDULE_CONFLICT"
  | "INTERNAL_ERROR";

export interface FieldError {
  field: string;
  message: string;
}
