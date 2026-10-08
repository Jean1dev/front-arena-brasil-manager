import { Info, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { useBusinessHours, useSaveBusinessHours } from "../api/businessHours";
import type { BusinessHours as Hours, Weekday, Window } from "../api/types";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { ErrorState, Spinner } from "../components/States";
import { Toggle } from "../components/Toggle";
import { useToast } from "../components/Toast";
import { errorUnder, fieldErrorsOf } from "../lib/fieldErrors";
import { hh } from "../lib/format";
import { WEEKDAY_LABEL, WEEKDAYS } from "../lib/weekdays";

interface DayState {
  open: boolean;
  openHour: number;
  closeHour: number;
}

type Week = Record<Weekday, DayState>;

function toWeek(hours: Hours): Week {
  return Object.fromEntries(
    WEEKDAYS.map((wd) => {
      const w = hours.days.find((d) => d.weekday === wd);
      return [wd, w ? { open: true, openHour: w.openHour, closeHour: w.closeHour } : { open: false, openHour: 8, closeHour: 22 }];
    }),
  ) as Week;
}

const toWindows = (week: Week): Window[] =>
  WEEKDAYS.filter((wd) => week[wd].open).map((wd) => ({ weekday: wd, openHour: week[wd].openHour, closeHour: week[wd].closeHour }));

export default function BusinessHours() {
  const { data, isLoading, error, refetch } = useBusinessHours();
  if (isLoading) return <Spinner />;
  if (error || !data) return <ErrorState error={error} onRetry={refetch} />;
  return <Editor key={JSON.stringify(data)} hours={data} />;
}

function Editor({ hours }: { hours: Hours }) {
  const initial = useMemo(() => toWeek(hours), [hours]);
  const [week, setWeek] = useState<Week>(initial);
  const [errors, setErrors] = useState<Partial<Record<Weekday, string>>>({});
  const save = useSaveBusinessHours();
  const toast = useToast();

  const dirty = JSON.stringify(toWindows(week)) !== JSON.stringify(toWindows(initial));
  const update = (wd: Weekday, patch: Partial<DayState>) => {
    setWeek((w) => ({ ...w, [wd]: { ...w[wd], ...patch } }));
    setErrors((e) => ({ ...e, [wd]: undefined }));
  };

  async function submit() {
    const local: Partial<Record<Weekday, string>> = {};
    for (const wd of WEEKDAYS) if (week[wd].open && week[wd].openHour >= week[wd].closeHour) local[wd] = "O fechamento deve ser depois da abertura.";
    setErrors(local);
    if (Object.keys(local).length) return;

    const windows = toWindows(week);
    try {
      await save.mutateAsync(windows);
      toast("Horários salvos");
    } catch (err) {
      const fields = fieldErrorsOf(err);
      setErrors(Object.fromEntries(windows.map((w, i) => [w.weekday, errorUnder(fields, `days[${i}]`)])));
      toast((err as Error).message, "error");
    }
  }

  const openDays = WEEKDAYS.filter((wd) => week[wd].open).length;

  return (
    <>
      <PageHeader
        eyebrow="Configuração"
        title="Horário de funcionamento"
        subtitle={`Vale para todas as quadras · fuso ${hours.timezone} · ${openDays} dia${openDays === 1 ? "" : "s"} aberto${openDays === 1 ? "" : "s"}`}
        actions={
          <>
            {dirty && (
              <Button variant="ghost" onClick={() => { setWeek(initial); setErrors({}); }}>
                <RotateCcw className="size-4" />
                Descartar
              </Button>
            )}
            <Button variant="brand" disabled={!dirty} loading={save.isPending} onClick={submit}>
              Salvar horários
            </Button>
          </>
        }
      />

      <div className="card divide-y divide-sand-200 overflow-hidden">
        <div className="grid grid-cols-[180px_200px_1fr] items-center gap-6 bg-sand-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
          <span>Dia</span>
          <span>Horário</span>
          <span className="flex justify-between">
            {[0, 6, 12, 18, 24].map((h) => (
              <span key={h}>{hh(h)}</span>
            ))}
          </span>
        </div>
        {WEEKDAYS.map((wd) => {
          const d = week[wd];
          return (
            <div key={wd} className="grid grid-cols-[180px_200px_1fr] items-center gap-6 px-6 py-4">
              <Toggle checked={d.open} onChange={(open) => update(wd, { open })} label={WEEKDAY_LABEL[wd]} />
              <div>
                {d.open ? (
                  <div className="flex items-center gap-2">
                    <HourSelect label={`Abertura de ${WEEKDAY_LABEL[wd]}`} value={d.openHour} from={0} to={23} onChange={(openHour) => update(wd, { openHour })} invalid={!!errors[wd]} />
                    <span className="text-sm font-bold text-ink-soft">às</span>
                    <HourSelect label={`Fechamento de ${WEEKDAY_LABEL[wd]}`} value={d.closeHour} from={1} to={24} onChange={(closeHour) => update(wd, { closeHour })} invalid={!!errors[wd]} />
                  </div>
                ) : (
                  <span className="text-sm font-semibold text-ink-soft">Fechado</span>
                )}
                {errors[wd] && <p className="mt-1 text-xs font-semibold text-danger">{errors[wd]}</p>}
              </div>
              <HoursBar day={d} />
            </div>
          );
        })}
      </div>

      <p className="mt-5 flex items-start gap-2 text-sm text-ink-soft">
        <Info className="mt-0.5 size-4 shrink-0" />
        Alterar o horário não muda os mensalistas cadastrados, mas horas fora da nova janela deixam de aparecer na agenda.
        Fechamento às 24h significa meia-noite.
      </p>
    </>
  );
}

function HourSelect({ label, value, from, to, onChange, invalid }: { label: string; value: number; from: number; to: number; onChange: (v: number) => void; invalid?: boolean }) {
  return (
    <select aria-label={label} className="input !w-[88px]" value={value} onChange={(e) => onChange(Number(e.target.value))} aria-invalid={invalid}>
      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((h) => (
        <option key={h} value={h}>
          {hh(h)}
        </option>
      ))}
    </select>
  );
}

function HoursBar({ day }: { day: DayState }) {
  const valid = day.open && day.openHour < day.closeHour;
  return (
    <div className="relative h-3 rounded-full bg-sand-200/70">
      {valid && (
        <div
          className="absolute inset-y-0 rounded-full bg-brand-gradient transition-all"
          style={{ left: `${(day.openHour / 24) * 100}%`, width: `${((day.closeHour - day.openHour) / 24) * 100}%` }}
        />
      )}
    </div>
  );
}
