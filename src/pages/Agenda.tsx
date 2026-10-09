import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, CalendarOff, CalendarRange, ChevronRight, LandPlot } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBookings } from "../api/bookings";
import { useBusinessHours } from "../api/businessHours";
import { useCourts } from "../api/courts";
import { useMonthlyCustomers } from "../api/monthlyCustomers";
import { useCourtSlots, useSlotsForCourts } from "../api/slots";
import type { Booking, Court, MonthlyCustomer, Slot, SlotDay, Weekday } from "../api/types";
import { BookingDetails } from "../components/BookingDetails";
import { CourtBadge } from "../components/CourtBadge";
import { DayStrip } from "../components/DayStrip";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { EmptyState, ErrorState, Spinner } from "../components/States";
import { capitalize, dateKey, formatPhone, hh, hourRange, longDate, money, slotHour } from "../lib/format";
import { groupByPeriod, openPeriods, periodOf, type Period, type PeriodId } from "../lib/periods";
import { useNow } from "../lib/useNow";
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

/** Reserva avulsa que cobre a hora de uma quadra numa data. */
type BookingOf = (courtId: string, date: string, hour: number) => Booking | undefined;

function useBookingOf(bookings: Booking[] | null | undefined): BookingOf {
  return useMemo(() => {
    const index = new Map<string, Booking>();
    for (const b of bookings ?? []) for (const s of b.slots) index.set(`${b.courtId}|${b.date}|${slotHour(s.start)}`, b);
    return (courtId, date, hour) => index.get(`${courtId}|${date}|${hour}`);
  }, [bookings]);
}

/** O que cada grade precisa para identificar quem ocupa um horário. */
interface Occupants {
  holderOf: HolderOf;
  bookingOf: BookingOf;
  onOpenBooking: (b: Booking) => void;
}

/** Estado de períodos expandidos compartilhado pelas grades. */
interface PeriodState {
  explicit: Set<PeriodId> | null;
  current: PeriodId;
  onChange: (open: Set<PeriodId>) => void;
}

export default function Agenda() {
  const now = useNow();
  const today = startOfDay(now);
  const days = useMemo(() => Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => addDays(today, i)), [today.getTime()]);
  const [selected, setSelected] = useState(today);
  const [mode, setMode] = useState<Mode>("day");
  const [weekCourtId, setWeekCourtId] = useState<string>();
  const current = periodOf(now.getHours()).id;
  // null = automático (período atual). Volta ao automático ao trocar de período ou de data.
  const [explicit, setExplicit] = useState<Set<PeriodId> | null>(null);
  useEffect(() => setExplicit(null), [current, selected]);
  const periods: PeriodState = { explicit, current, onChange: setExplicit };

  const courtsQuery = useCourts(false);
  const { data: hours } = useBusinessHours();
  const { data: customers } = useMonthlyCustomers(false);
  const holderOf = useHolderOf(customers);
  const [openBooking, setOpenBooking] = useState<Booking | null>(null);

  const isOpen = (d: Date) => !!hours?.days.some((w) => w.weekday === weekdayOf(d));
  const weekEnd = addDays(selected, 6);
  const courts = courtsQuery.data ?? [];
  const weekCourt = courts.find((c) => c.id === weekCourtId) ?? courts[0];
  const { data: bookings } = useBookings(dateKey(selected), dateKey(mode === "day" ? selected : weekEnd));
  const bookingOf = useBookingOf(bookings);
  const occupants: Occupants = { holderOf, bookingOf, onOpenBooking: setOpenBooking };

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
        <DayGrid courts={courts} date={dateKey(selected)} occupants={occupants} now={now} periods={periods} />
      ) : (
        <>
          <div className="mb-4">
            <Segmented value={weekCourt.id} onChange={setWeekCourtId} options={courts.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          <WeekGrid court={weekCourt} from={dateKey(selected)} to={dateKey(weekEnd)} occupants={occupants} now={now} periods={periods} />
        </>
      )}

      <BookingDetails booking={openBooking} onClose={() => setOpenBooking(null)} />
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
        <span className="size-3 rounded bg-night-soft ring-1 ring-night/30" /> Reserva avulsa
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded bg-sand-200" /> Indisponível
      </span>
      <span className="ml-auto">Somente consulta · clique num horário ocupado para ver quem é</span>
    </div>
  );
}

/** Hora de início de um slot já encerrado (só no dia de hoje). */
const isPast = (date: string, hour: number, now: Date) => date === dateKey(now) && hour < now.getHours();

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function periodGroups(hoursList: number[], periods: PeriodState) {
  const groups = groupByPeriod(hoursList);
  const open = openPeriods(periods.explicit, periods.current, groups.map((g) => g.period.id));
  const toggle = (id: PeriodId) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    periods.onChange(next);
  };
  return { groups, open, toggle };
}

function PeriodRow({
  period,
  hours,
  colSpan,
  open,
  current,
  free,
  busy,
  onToggle,
}: {
  period: Period;
  hours: number[];
  colSpan: number;
  open: boolean;
  current: boolean;
  free: number;
  busy: number;
  onToggle: () => void;
}) {
  const Icon = period.icon;
  return (
    <tr>
      <td colSpan={colSpan} className="border-t border-sand-200 bg-sand-50 p-0">
        <button
          onClick={onToggle}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-sand-100"
        >
          <ChevronRight className={`size-4 text-ink-soft transition-transform ${open ? "rotate-90" : ""}`} />
          <Icon className="size-4 text-ink-soft" />
          <span className="text-[15px] font-extrabold tracking-tight">{period.label}</span>
          <span className="text-xs font-semibold text-ink-soft">{hourRange(hours[0], hours[hours.length - 1] + 1)}</span>
          {current && (
            <span className="rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Agora</span>
          )}
          <span className="ml-auto flex items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{plural(free, "livre")}</span>
            <span className="rounded-full bg-ocean-soft px-2.5 py-1 text-ocean">{plural(busy, "ocupado")}</span>
          </span>
        </button>
      </td>
    </tr>
  );
}

function DayGrid({ courts, date, occupants, now, periods }: { courts: Court[]; date: string; occupants: Occupants; now: Date; periods: PeriodState }) {
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
  const { groups, open, toggle } = periodGroups(hoursList, periods);
  const slotOf = (courtId: string, h: number) => dayByCourt.get(courtId)?.slots.find((s) => slotHour(s.start) === h);

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[88px] bg-sand-50 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-ink-soft">Hora</th>
              {courts.map((c) => {
                const slots = dayByCourt.get(c.id)?.slots ?? [];
                const free = slots.filter((s) => s.status === "AVAILABLE" && !isPast(date, slotHour(s.start), now)).length;
                const busy = slots.filter((s) => s.status !== "AVAILABLE").length;
                return (
                  <th key={c.id} className="min-w-[180px] bg-sand-50 px-3 py-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[15px] font-extrabold tracking-tight">{c.name}</span>
                      <CourtBadge type={c.type} className="!px-2 !py-0.5 !text-[10px]" />
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-ink-soft">
                      {plural(free, "livre")} · {plural(busy, "ocupado")}
                    </p>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map(({ period, hours }) => {
              const cells = hours.flatMap((h) => courts.map((c) => ({ h, slot: slotOf(c.id, h) })));
              const free = cells.filter(({ h, slot }) => slot?.status === "AVAILABLE" && !isPast(date, h, now)).length;
              const busy = cells.filter(({ slot }) => slot && slot.status !== "AVAILABLE").length;
              return (
                <Fragment key={period.id}>
                  <PeriodRow
                    period={period}
                    hours={hours}
                    colSpan={courts.length + 1}
                    open={open.has(period.id)}
                    current={date === dateKey(now) && period.id === periods.current}
                    free={free}
                    busy={busy}
                    onToggle={() => toggle(period.id)}
                  />
                  {open.has(period.id) &&
                    hours.map((h) => (
                      <tr key={h} className={isPast(date, h, now) ? "opacity-45" : ""}>
                        <td className="sticky left-0 z-10 border-t border-sand-200 bg-white px-4 py-2 font-extrabold">{hh(h)}</td>
                        {courts.map((c) => {
                          const slot = slotOf(c.id, h);
                          return (
                            <td key={c.id} className="border-t border-sand-200 p-1.5">
                              <SlotCell slot={slot} holder={occupants.holderOf(c.id, weekday, h)} booking={occupants.bookingOf(c.id, date, h)} onOpenBooking={occupants.onOpenBooking} />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WeekGrid({ court, from, to, occupants, now, periods }: { court: Court; from: string; to: string; occupants: Occupants; now: Date; periods: PeriodState }) {
  const { data, isLoading, error, refetch } = useCourtSlots(court.id, from, to);
  const hourSet = new Set<number>();
  data?.days.forEach((d) => d.slots.forEach((s) => hourSet.add(slotHour(s.start))));
  const hoursList = [...hourSet].sort((a, b) => a - b);
  const { groups, open, toggle } = periodGroups(hoursList, periods);

  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
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
            {groups.map(({ period, hours }) => {
              const cells = hours.flatMap((h) => data.days.map((d) => ({ h, d, slot: slotAt(d, h) })));
              const free = cells.filter(({ h, d, slot }) => slot?.status === "AVAILABLE" && !isPast(d.date, h, now)).length;
              const busy = cells.filter(({ slot }) => slot && slot.status !== "AVAILABLE").length;
              return (
                <Fragment key={period.id}>
                  <PeriodRow
                    period={period}
                    hours={hours}
                    colSpan={data.days.length + 1}
                    open={open.has(period.id)}
                    current={period.id === periods.current && data.days.some((d) => d.date === dateKey(now))}
                    free={free}
                    busy={busy}
                    onToggle={() => toggle(period.id)}
                  />
                  {open.has(period.id) &&
                    hours.map((h) => (
                      <tr key={h}>
                        <td className="border-t border-sand-200 bg-white px-4 py-2 font-extrabold">{hh(h)}</td>
                        {data.days.map((d) => {
                          const slot = slotAt(d, h);
                          return (
                            <td key={d.date} className={`border-t border-sand-200 p-1 ${isPast(d.date, h, now) ? "opacity-45" : ""}`}>
                              {slot ? (
                                <SlotCell
                                  slot={slot}
                                  compact
                                  holder={occupants.holderOf(court.id, d.weekday, h)}
                                  booking={occupants.bookingOf(court.id, d.date, h)}
                                  onOpenBooking={occupants.onOpenBooking}
                                />
                              ) : (
                                <div className="grain h-12 rounded-xl bg-sand-100" aria-label="Fora do horário" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlotCell({
  slot,
  holder,
  booking,
  onOpenBooking,
  compact,
}: {
  slot?: Slot;
  holder?: MonthlyCustomer;
  booking?: Booking;
  onOpenBooking: (b: Booking) => void;
  compact?: boolean;
}) {
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

  if (slot.status === "BOOKED") {
    const box = `flex ${height} w-full min-w-0 flex-col justify-center rounded-xl bg-night-soft px-3 text-left text-night ring-1 ring-night/25`;
    if (!booking) {
      return (
        <div className={box}>
          <span className="text-[13px] font-extrabold">Reservado</span>
          {!compact && <span className="text-[11px] font-semibold text-night/70">Reserva avulsa</span>}
        </div>
      );
    }
    return (
      <button onClick={() => onOpenBooking(booking)} title={`Ver reserva de ${booking.name}`} className={`${box} transition hover:ring-night/60`}>
        <span className="truncate text-[13px] font-extrabold">{booking.name}</span>
        {!compact && <span className="truncate text-[11px] font-semibold text-night/70">{formatPhone(booking.whatsapp)}</span>}
      </button>
    );
  }

  // Qualquer outro status (inclusive futuros) é indisponível.
  return (
    <div className={`flex ${height} flex-col justify-center rounded-xl bg-sand-200/70 px-3 text-ink-soft`}>
      <span className="text-[11px] font-bold uppercase tracking-wide">Indisponível</span>
    </div>
  );
}
