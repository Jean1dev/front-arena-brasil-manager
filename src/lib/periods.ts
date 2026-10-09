import { Moon, Sun, Sunrise, type LucideIcon } from "lucide-react";

export type PeriodId = "morning" | "afternoon" | "night";

export interface Period {
  id: PeriodId;
  label: string;
  icon: LucideIcon;
  /** Horas de início `[from, to)` que pertencem ao período. */
  from: number;
  to: number;
}

export const PERIODS: Period[] = [
  { id: "morning", label: "Manhã", icon: Sunrise, from: 0, to: 12 },
  { id: "afternoon", label: "Tarde", icon: Sun, from: 12, to: 17 },
  { id: "night", label: "Noite", icon: Moon, from: 17, to: 24 },
];

export const periodOf = (hour: number) => PERIODS.find((p) => hour >= p.from && hour < p.to)!;

/** Agrupa horas (já ordenadas) por período, omitindo períodos vazios. */
export const groupByPeriod = (hours: number[]) =>
  PERIODS.map((p) => ({ period: p, hours: hours.filter((h) => h >= p.from && h < p.to) })).filter((g) => g.hours.length);

/**
 * Períodos abertos. Sem escolha do usuário (`explicit` nulo), abre o período atual;
 * se a arena não funciona nele, abre o próximo período com horários (ou o último).
 */
export function openPeriods(explicit: Set<PeriodId> | null, current: PeriodId, visible: PeriodId[]): Set<PeriodId> {
  if (explicit) return explicit;
  if (visible.includes(current)) return new Set([current]);
  const order = PERIODS.map((p) => p.id);
  const next = visible.find((id) => order.indexOf(id) > order.indexOf(current)) ?? visible[visible.length - 1];
  return new Set(next ? [next] : []);
}
