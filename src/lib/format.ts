import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Centavos → "R$ 90,00". */
export const money = (cents: number) => brl.format(cents / 100);

export const hh = (hour: number) => `${String(hour).padStart(2, "0")}h`;

export const hourRange = (start: number, end: number) => `${hh(start)}–${hh(end)}`;

/** "R$ 90,50" / "90,5" / "90" → 9050; inválido → NaN. */
export function parseMoney(value: string): number {
  const clean = value.replace(/[^\d,.]/g, "").replace(/\./g, "").replace(",", ".");
  if (!clean) return NaN;
  return Math.round(Number(clean) * 100);
}

/** 9050 → "90,50" (valor de input). */
export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Date → "2026-10-12" (data local). */
export const dateKey = (d: Date) => format(d, "yyyy-MM-dd");

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const longDate = (key: string) => capitalize(format(parseISO(key), "EEEE, d 'de' MMMM", { locale: ptBR }));

/** "2026-10-12T18:00:00-03:00" → 18 (hora no fuso do servidor, lida do próprio texto). */
export const slotHour = (iso: string) => Number(iso.slice(11, 13));
