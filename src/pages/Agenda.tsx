import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarOff, CalendarRange, LandPlot, Moon, Sun, Sunrise } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinessHours } from "../api/businessHours";
import { useCourts } from "../api/courts";
import { useMonthlyCustomers } from "../api/monthlyCustomers";
import { useCourtSlots, useSlotsForCourts } from "../api/slots";
import type { Court, MonthlyCustomer, Slot, SlotDay, Weekday } from "../api/types";
import { CourtBadge } from "../components/CourtBadge";
import { DayStrip } from "../components/DayStrip";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import { capitalize, dateKey, hh, longDate, money, slotHour } from "../lib/format";
import { WEEKDAY_SHORT, weekdayOf } from "../lib/weekdays";

const DAYS_AHEAD = 30;

type Mode = "day" | "week";

/** Encontra o mensalista ativo que ocupa a hora (o endpoint público de slots não expõe quem é). */
type HolderOf = (courtId: string, weekday: Weekday, hour: number) => MonthlyCustomer | undefined;

function useHolderOf(customers: MonthlyCustomer[] | undefined): HolderOf {
  return useMemo(() => {
    const index = new Map<string, MonthlyCustomer>();
    for (const c of customers ?? [])
      if (c.active)
        for (const e of c.schedule)
          for (let h = e.startHour; h < e.endHour; h++) index.set(`${e.courtId}|${e.weekday}|${h}`, c);
    return (courtId, weekday, hour) => index.get(`${courtId}|${weekday}|${hour}`);
  }, [customers]);
}

export default function Agenda() {
  const today = startOfDay(new Date());
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)), [today.getTime()]);
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<Mode>("day");
  const [weekCourtId, setWeekCourtId] = useState<string>();

  const courtsQuery = useCourts(false);
  const { data: hours } = useBusinessHours();
  const { data: customers } = useMonthlyCustomers(false);
  const holderOf = useHolderOf(customers);

  const isOpen = (d: Date) => !!hours?.days.some((w) => w.weekday === weekdayOf(d));
  const weekEnd = addDays(selected, 6);
  const courts = courtsQuery.data ?? [];
  const weekCourt = courts.find((c) => c.id === weekCourtId) ?? courts[0];

  return (
    <>
      <PageHeader
        eyebrow="Ocupação"
        title="Agenda"
        subtitle={
          mode === "day"
            ? longDate(dateKey(selected))
            : `${format(selected, "d 'de' MMM", { locale: ptBR })} a ${format(weekEnd, "d 'de' MMM", { locale: ptBR })}`
        }
        actions={
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: "day", label: <><CalendarDays className="size-4" />Dia</> },
              { value: "week", label: <><CalendarRange className="size-4" />Semana</> },
            ]}
          />
        }
      />

      <div className="mb-6">
        <DayStrip
          days={days}
          selected={selected}
          onSelect={setSelected}
          isOpen={isOpen}
          highlight={mode === "week" ? (d) => d > selected && d <= weekEnd : undefined}
        />
      </div>

      <Legend />

      {courtsQuery.isLoading ? (
        <Spinner />
      ) : courtsQuery.error ? (
        <ErrorState error={courtsQuery.error} onRetry={courtsQuery.refetch} />
      ) : !courts.length ? (
        <EmptyState icon={LandPlot} title="Nenhuma quadra ativa" message="Cadastre ou reative quadras para ver a agenda." />
      ) : mode === "day" ? (
        <DayGrid courts={courts} date={dateKey(selected)} holderOf={holderOf} />
      ) : (
        <>
          <div className="mb-4">
            <Segmented value={weekCourt.id} onChange={setWeekCourtId} options={courts.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          <WeekGrid court={weekCourt} from={dateKey(selected)} to={dateKey(weekEnd)} holderOf={holderOf} />
        </>
      )}
    </>
  );
}

function Legend() {
  return (
    <div className="mb-4 flex items-center gap-5 text-xs font-semibold text-ink-soft">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-white ring-1 ring-sand-300" /> Livre
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-ocean-soft ring-1 ring-ocean/30" /> Mensalista
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-sand-200" /> Indisponível
      </span>
      <span className="ml-auto">Somente consulta · clique num mensalista para abrir o cadastro</span>
    </div>
  );
}

function periodIcon(hour: number) {
  if (hour < 12) return Sunrise;
  if (hour < 17) return Sun;
  return Moon;
}

/** Hora de início de um slot já encerrado (só no dia de hoje). */
function isPast(date: string, hour: number) {
  const now = new Date();
  return date === dateKey(now) && hour < now.getHours();
}

function DayGrid({ courts, date, holderOf }: { courts: Court[]; date: string; holderOf: HolderOf }) {
  const results = useSlotsForCourts(courts.map((c) => c.id), date, date);
  const loading = results.some((r) => r.isLoading);
  const failed = results.find((r) => r.error);

  if (loading) return <Spinner />;
  if (failed) return <ErrorState error={failed.error} onRetry={() => results.forEach((r) => r.refetch())} />;

  const dayByCourt = new Map(results.map((r, i) => [courts[i].id, r.data?.days[0]]));
  const first = [...dayByCourt.values()].find(Boolean);
  if (!first?.open) {
    return <EmptyState icon={CalendarOff} title="Arena fechada neste dia" message="Não há horário de funcionamento para este dia da semana." />;
  }

  const hourSet = new Set<number>();
  for (const d of dayByCourt.values()) d?.slots.forEach((s) => hourSet.add(slotHour(s.start)));
  const hoursList = [...hourSet].sort((a, b) => a - b);
  const weekday = first.weekday;

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[88px] bg-sand-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-soft">Hora</th>
              {courts.map((c) => {
                const slots = dayByCourt.get(c.id)?.slots ?? [];
                const free = slots.filter((s) => s.status === "AVAILABLE" && !isPast(date, slotHour(s.start))).length;
                const busy = slots.filter((s) => s.status !== "AVAILABLE").length;
                return (
                  <th key={c.id} className="min-w-[180px] bg-sand-50 px-3 py-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-extrabold tracking-tight">{c.name}</span>
                      <CourtBadge type={c.type} className="!px-2 !py-0.5 !text-[10px]" />
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                      {free} livre{free === 1 ? "" : "s"} · {busy} ocupado{busy === 1 ? "" : "s"}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hoursList.map((h) => {
              const Icon = periodIcon(h);
              const past = isPast(date, h);
              return (
                <tr key={h} className={past ? "opacity-45" : ""}>
                  <td className="sticky left-0 z-10 border-t border-sand-200 bg-white px-4 py-2">
                    <span className="flex items-center gap-1.5 font-extrabold">
                      <Icon className="size-3.5 text-ink-soft" />
                      {hh(h)}
                    </span>
                  </td>
                  {courts.map((c) => {
                    const slot = dayByCourt.get(c.id)?.slots.find((s) => slotHour(s.start) === h);
                    return (
                      <td key={c.id} className="border-t border-sand-200 p-1.5">
                        <SlotCell slot={slot} holder={slot && slot.status !== "AVAILABLE" ? holderOf(c.id, weekday, h) : undefined} />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeekGrid({ court, from, to, holderOf }: { court: Court; from: string; to: string; holderOf: HolderOf }) {
  const { data, isLoading, error, refetch } = useCourtSlots(court.id, from, to);
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;

  const hourSet = new Set<number>();
  data.days.forEach((d) => d.slots.forEach((s) => hourSet.add(slotHour(s.start))));
  const hoursList = [...hourSet].sort((a, b) => a - b);
  if (!hoursList.length) {
    return <EmptyState icon={CalendarOff} title="Arena fechada nesta semana" message="Nenhum dia do período tem horário de funcionamento." />;
  }

  const slotAt = (d: SlotDay, h: number) => d.slots.find((s) => slotHour(s.start) === h);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="w-[88px] bg-sand-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-soft">Hora</th>
              {data.days.map((d) => {
                const date = parseISO(d.date);
                const free = d.slots.filter((s) => s.status === "AVAILABLE").length;
                return (
                  <th key={d.date} className="bg-sand-50 px-2 py-3 text-left">
                    <p className={`text-[11px] font-bold uppercase tracking-wide ${isSameDay(date, new Date()) ? "text-brand" : "text-ink-soft"}`}>
                      {WEEKDAY_SHORT[d.weekday]}
                    </p>
                    <p className="text-[15px] font-extrabold">{capitalize(format(date, "d MMM", { locale: ptBR }).replace(".", ""))}</p>
                    <p className="text-[11px] font-semibold text-ink-soft">{d.open ? `${free} livre${free === 1 ? "" : "s"}` : "Fechado"}</p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {hoursList.map((h) => (
              <tr key={h}>
                <td className="border-t border-sand-200 bg-white px-4 py-2 font-extrabold">{hh(h)}</td>
                {data.days.map((d) => {
                  const slot = slotAt(d, h);
                  return (
                    <td key={d.date} className={`border-t border-sand-200 p-1 ${isPast(d.date, h) ? "opacity-45" : ""}`}>
                      {slot ? (
                        <SlotCell slot={slot} compact holder={slot.status !== "AVAILABLE" ? holderOf(court.id, d.weekday, h) : undefined} />
                      ) : (
                        <div className="grain h-12 rounded-xl bg-sand-100" aria-label="Fora do horário" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlotCell({ slot, holder, compact }: { slot?: Slot; holder?: MonthlyCustomer; compact?: boolean }) {
  const navigate = useNavigate();
  const height = compact ? "h-12" : "h-14";

  if (!slot) return <div className={`grain ${height} rounded-xl bg-sand-100`} />;

  if (slot.status === "AVAILABLE") {
    return (
      <div className={`flex ${height} flex-col justify-center rounded-xl bg-white px-3 ring-1 ring-sand-200`}>
        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Livre</span>
        {!compact && <span className="text-xs font-semibold text-ink-soft">{money(slot.priceCents)}</span>}
      </div>
    );
  }

  if (slot.status === "MONTHLY") {
    const content = (
      <>
        <span className="truncate text-[13px] font-extrabold">{holder?.name ?? "Mensalista"}</span>
        {!compact && <span className="truncate text-[11px] font-semibold text-ocean/70">{holder?.description || "Mensalista"}</span>}
      </>
    );
    return holder ? (
      <button
        onClick={() => navigate(`/mensalistas?id=${holder.id}`)}
        title={`Abrir ${holder.name}`}
        className={`flex ${height} w-full min-w-0 flex-col justify-center rounded-xl bg-ocean-soft px-3 text-left text-ocean ring-1 ring-ocean/25 transition hover:ring-ocean/60`}
      >
        {content}
      </button>
    ) : (
      <div className={`flex ${height} min-w-0 flex-col justify-center rounded-xl bg-ocean-soft px-3 text-ocean ring-1 ring-ocean/25`}>{content}</div>
    );
  }

  // Qualquer outro status (inclusive futuros) é indisponível.
  return (
    <div className={`flex ${height} flex-col justify-center rounded-xl bg-sand-200/70 px-3 text-ink-soft`}>
      <span className="text-[11px] font-bold uppercase tracking-wide">Indisponível</span>
    </div>
  );
}
