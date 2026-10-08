import { ApiError } from "../api/client";

export type FieldErrors = Record<string, string>;

const FIELD_MESSAGES: [RegExp, string][] = [
  [/is required/i, "Campo obrigatório."],
  [/must be at most (\d+) characters/i, "Máximo de $1 caracteres."],
  [/must contain at least 1 entry/i, "Adicione pelo menos um horário."],
  [/must contain at most (\d+) entries/i, "Máximo de $1 horários."],
  [/must be one of/i, "Valor inválido."],
  [/must be greater than 0/i, "Deve ser maior que zero."],
  [/must be greater than (startHour|openHour)/i, "Deve ser depois do início."],
  [/must be between (\d+) and (\d+)/i, "Deve estar entre $1 e $2."],
  [/existing, active court/i, "Quadra inexistente ou inativa."],
  [/overlaps/i, "Sobrepõe outro horário desta quadra no mesmo dia."],
  [/is closed/i, "A arena está fechada neste dia."],
  [/within business hours for \w+ \((\d+)–(\d+)\)/i, "Fora do horário de funcionamento ($1h–$2h)."],
  [/duplicate weekday/i, "Dia repetido."],
];

function translate(message: string) {
  const hit = FIELD_MESSAGES.find(([re]) => re.test(message));
  return hit ? message.replace(new RegExp(`^.*?${hit[0].source}.*$`, "i"), hit[1]) : message;
}

/** `fields` do envelope de erro da API → { "schedule[1].endHour": "..." }. */
export function fieldErrorsOf(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.fields.map((f) => [f.field, translate(f.message)]));
}

/** Primeira mensagem cujo campo começa com `prefix` (ex.: "schedule[2]"). */
export const errorUnder = (errors: FieldErrors, prefix: string) =>
  Object.entries(errors).find(([k]) => k === prefix || k.startsWith(`${prefix}.`) || k.startsWith(`${prefix}[`))?.[1];
