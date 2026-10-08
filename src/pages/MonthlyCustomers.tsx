import { AlertCircle, Plus, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useBusinessHours } from "../api/businessHours";
import { ApiError } from "../api/client";
import { useCourts } from "../api/courts";
import { useMonthlyCustomers, useSaveMonthlyCustomer } from "../api/monthlyCustomers";
import type { Court, MonthlyCustomer, ScheduleEntry, Weekday, Window } from "../api/types";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { Field } from "../components/Field";
import { Drawer } from "../components/Overlay";
import { PageHeader } from "../components/PageHeader";
import { EmptyState, ErrorState, Spinner, StatusPill } from "../components/States";
import { Toggle } from "../components/Toggle";
import { useToast } from "../components/Toast";
import { errorUnder, fieldErrorsOf, type FieldErrors } from "../lib/fieldErrors";
import { hh, hourRange } from "../lib/format";
import { WEEKDAY_LABEL, WEEKDAY_SHORT, WEEKDAYS } from "../lib/weekdays";

export default function MonthlyCustomers() {
  const [showInactive, setShowInactive] = useState(false);
  const [query, setQuery] = useState("");
  const [params, setParams] = useSearchParams();
  const [toggling, setToggling] = useState<MonthlyCustomer | null>(null);
  const { data: customers, isLoading, error, refetch } = useMonthlyCustomers(true);
  const { data: courts = [] } = useCourts(true);
  const save = useSaveMonthlyCustomer();
  const toast = useToast();

  const editingId = params.get("id");
  const editing = editingId === "new" ? "new" : (customers?.find((c) => c.id === editingId) ?? null);
  const openEditor = (id: string | null) => setParams(id ? { id } : {}, { replace: true });

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return (customers ?? []).filter(
      (c) => (showInactive || c.active) && (!q || `${c.name} ${c.description}`.toLocaleLowerCase("pt-BR").includes(q)),
    );
  }, [customers, showInactive, query]);

  async function toggleActive(c: MonthlyCustomer) {
    try {
      await save.mutateAsync({ id: c.id, data: { active: !c.active } });
      toast(c.active ? `${c.name} encerrado` : `${c.name} reativado`);
      setToggling(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  const activeCount = customers?.filter((c) => c.active).length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Mensalistas"
        subtitle={customers ? `${activeCount} ativo${activeCount === 1 ? "" : "s"} · horários fixos toda semana` : undefined}
        actions={
          <Button variant="brand" onClick={() => openEditor("new")}>
            <Plus className="size-4" />
            Novo mensalista
          </Button>
        }
      />

      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="relative w-[360px]">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input className="input !pl-10" placeholder="Buscar por nome ou descrição" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar mensalista" />
        </div>
        <Toggle checked={showInactive} onChange={setShowInactive} label="Mostrar encerrados" />
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !visible.length ? (
        <EmptyState
          icon={Users}
          title={customers?.length ? "Nenhum mensalista encontrado" : "Nenhum mensalista cadastrado"}
          message={customers?.length ? "Ajuste a busca ou mostre os encerrados." : "Cadastre quem joga sempre no mesmo horário para reservar essas horas toda semana."}
          action={!customers?.length && <Button onClick={() => openEditor("new")}>Cadastrar mensalista</Button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-sand-50 text-[11px] font-bold uppercase tracking-widest text-ink-soft">
              <tr>
                <th className="px-6 py-3">Mensalista</th>
                <th className="px-6 py-3">Horários</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-200">
              {visible.map((c) => (
                <tr key={c.id} className="cursor-pointer align-top transition-colors hover:bg-sand-50" onClick={() => openEditor(c.id)}>
                  <td className="px-6 py-4">
                    <p className="font-extrabold">{c.name}</p>
                    {c.description && <p className="mt-0.5 line-clamp-2 max-w-[320px] text-ink-soft">{c.description}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <ScheduleSummary schedule={c.schedule} courts={courts} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusPill active={c.active} labels={["Ativo", "Encerrado"]} />
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => (c.active ? setToggling(c) : toggleActive(c))}>
                      {c.active ? "Encerrar" : "Reativar"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={editing !== null}
        onClose={() => openEditor(null)}
        title={editing && editing !== "new" ? editing.name : "Novo mensalista"}
        subtitle="Horas reservadas toda semana, em blocos de hora cheia."
      >
        {editing !== null && <CustomerForm key={editing === "new" ? "new" : editing.id} customer={editing === "new" ? null : editing} courts={courts} onClose={() => openEditor(null)} />}
      </Drawer>

      <ConfirmDialog
        open={!!toggling}
        title={`Encerrar ${toggling?.name}?`}
        message="Os horários dele ficam livres na agenda a partir de agora. O cadastro é mantido e pode ser reativado depois, se os horários ainda estiverem livres."
        confirmLabel="Encerrar"
        danger
        loading={save.isPending}
        onConfirm={() => toggling && toggleActive(toggling)}
        onClose={() => setToggling(null)}
      />
    </>
  );
}

function ScheduleSummary({ schedule, courts }: { schedule: ScheduleEntry[]; courts: Court[] }) {
  const byCourt = new Map<string, ScheduleEntry[]>();
  for (const e of schedule) byCourt.set(e.courtId, [...(byCourt.get(e.courtId) ?? []), e]);
  return (
    <ul className="space-y-1.5">
      {[...byCourt].map(([courtId, entries]) => (
        <li key={courtId} className="flex flex-wrap items-center gap-1.5">
          <span className="font-bold">{courts.find((c) => c.id === courtId)?.name ?? "Quadra removida"}</span>
          {entries.map((e, i) => (
            <span key={i} className="rounded-full bg-ocean-soft px-2 py-0.5 text-xs font-bold text-ocean">
              {WEEKDAY_SHORT[e.weekday]} {hourRange(e.startHour, e.endHour)}
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}

interface Row extends ScheduleEntry {
  key: number;
}

let rowKey = 0;
const newRow = (entry: ScheduleEntry): Row => ({ ...entry, key: ++rowKey });

function validateRows(rows: Row[], windows: Window[]): FieldErrors {
  const errors: FieldErrors = {};
  rows.forEach((r, i) => {
    const prefix = `schedule[${i}]`;
    const w = windows.find((x) => x.weekday === r.weekday);
    if (!r.courtId) errors[`${prefix}.courtId`] = "Escolha a quadra.";
    else if (r.startHour >= r.endHour) errors[`${prefix}.endHour`] = "O fim deve ser depois do início.";
    else if (!w) errors[prefix] = "A arena está fechada neste dia.";
    else if (r.startHour < w.openHour || r.endHour > w.closeHour) errors[prefix] = `Fora do horário de funcionamento (${hh(w.openHour)}–${hh(w.closeHour)}).`;
    else {
      const j = rows.findIndex((o, k) => k < i && o.courtId === r.courtId && o.weekday === r.weekday && o.startHour < r.endHour && r.startHour < o.endHour);
      if (j >= 0) errors[prefix] = `Sobrepõe o horário ${j + 1} (mesma quadra e dia).`;
    }
  });
  return errors;
}

function CustomerForm({ customer, courts, onClose }: { customer: MonthlyCustomer | null; courts: Court[]; onClose: () => void }) {
  const { data: hours } = useBusinessHours();
  const windows = hours?.days ?? [];
  const activeCourts = courts.filter((c) => c.active);
  const firstOpen = windows[0];
  const blank = (): ScheduleEntry => ({
    courtId: activeCourts[0]?.id ?? "",
    weekday: firstOpen?.weekday ?? "MONDAY",
    startHour: firstOpen ? Math.max(firstOpen.openHour, Math.min(18, firstOpen.closeHour - 1)) : 18,
    endHour: firstOpen ? Math.max(firstOpen.openHour, Math.min(18, firstOpen.closeHour - 1)) + 1 : 19,
  });

  const [name, setName] = useState(customer?.name ?? "");
  const [description, setDescription] = useState(customer?.description ?? "");
  const [rows, setRows] = useState<Row[]>(() => (customer?.schedule.length ? customer.schedule : [blank()]).map(newRow));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [conflict, setConflict] = useState("");
  const save = useSaveMonthlyCustomer();
  const toast = useToast();

  const updateRow = (key: number, patch: Partial<ScheduleEntry>) => {
    setRows((rs) =>
      rs.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        if (patch.startHour !== undefined && next.endHour <= next.startHour) next.endHour = next.startHour + 1;
        return next;
      }),
    );
    setErrors({});
    setConflict("");
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setConflict("");
    const local = validateRows(rows, windows);
    if (!name.trim()) local.name = "Campo obrigatório.";
    if (!rows.length) local.schedule = "Adicione pelo menos um horário.";
    setErrors(local);
    if (Object.keys(local).length) return;

    const schedule = rows.map(({ courtId, weekday, startHour, endHour }) => ({ courtId, weekday, startHour, endHour }));
    try {
      await save.mutateAsync({ id: customer?.id, data: { name: name.trim(), description: description.trim(), schedule } });
      toast(customer ? "Mensalista atualizado" : "Mensalista cadastrado");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "MONTHLY_SCHEDULE_CONFLICT") setConflict(err.message);
      else {
        setErrors(fieldErrorsOf(err));
        toast((err as Error).message, "error");
      }
    }
  }

  if (!activeCourts.length || !windows.length) {
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {!activeCourts.length ? "Cadastre ao menos uma quadra ativa antes de criar mensalistas." : "Defina o horário de funcionamento antes de criar mensalistas."}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {customer && !customer.active && (
        <p className="rounded-2xl bg-sand-200/70 px-4 py-3 text-sm font-semibold text-ink-soft">
          Mensalista encerrado: os horários abaixo não estão reservados na agenda.
        </p>
      )}
      <Field label="Nome" htmlFor="mc-name" error={errors.name}>
        <input id="mc-name" className="input" maxLength={100} autoFocus={!customer} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vitor Rabelo" aria-invalid={!!errors.name} />
      </Field>
      <Field label="Descrição" htmlFor="mc-desc" error={errors.description} hint="Opcional. Ex.: professor de beach tennis, turma de terça.">
        <textarea id="mc-desc" className="input" rows={2} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      </Field>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[13px] font-bold">Horários semanais</h3>
          <span className="text-xs text-ink-soft">{rows.length}/50</span>
        </div>
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <ScheduleRow
              key={r.key}
              index={i}
              row={r}
              courts={courts}
              windows={windows}
              error={errorUnder(errors, `schedule[${i}]`)}
              onChange={(patch) => updateRow(r.key, patch)}
              onRemove={rows.length > 1 ? () => setRows((rs) => rs.filter((x) => x.key !== r.key)) : undefined}
            />
          ))}
        </div>
        {errors.schedule && <p className="mt-1.5 text-xs font-semibold text-danger">{errors.schedule}</p>}
        <Button type="button" size="sm" variant="ghost" className="mt-3" disabled={rows.length >= 50} onClick={() => setRows((rs) => [...rs, newRow(rs.length ? { ...rs[rs.length - 1] } : blank())])}>
          <Plus className="size-3.5" />
          Adicionar horário
        </Button>
      </div>

      {conflict && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {conflict} Confira a agenda e escolha outro horário ou quadra.
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-sand-200 pt-5">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {customer ? "Salvar alterações" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}

function ScheduleRow({
  index,
  row,
  courts,
  windows,
  error,
  onChange,
  onRemove,
}: {
  index: number;
  row: Row;
  courts: Court[];
  windows: Window[];
  error?: string;
  onChange: (patch: Partial<ScheduleEntry>) => void;
  onRemove?: () => void;
}) {
  const w = windows.find((x) => x.weekday === row.weekday);
  const range = (from: number, to: number) => Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);
  // Mantém visível o valor atual mesmo se ficou fora do horário (cadastro antigo).
  const withCurrent = (list: number[], v: number) => (list.includes(v) ? list : [...list, v].sort((a, b) => a - b));
  const starts = withCurrent(w ? range(w.openHour, w.closeHour - 1) : [], row.startHour);
  const ends = withCurrent(w ? range(Math.max(row.startHour + 1, w.openHour + 1), w.closeHour) : [], row.endHour);
  const selectable = courts.filter((c) => c.active || c.id === row.courtId);

  const changeWeekday = (weekday: Weekday) => {
    const nw = windows.find((x) => x.weekday === weekday);
    if (!nw) return onChange({ weekday });
    const startHour = Math.min(Math.max(row.startHour, nw.openHour), nw.closeHour - 1);
    const endHour = Math.min(Math.max(row.endHour, startHour + 1), nw.closeHour);
    onChange({ weekday, startHour, endHour });
  };

  return (
    <div className={`rounded-2xl bg-white p-3 ring-1 ${error ? "ring-danger" : "ring-sand-200"}`}>
      <div className="grid grid-cols-[24px_1fr_140px_84px_84px_36px] items-center gap-2">
        <span className="text-center text-xs font-bold text-ink-soft">{index + 1}</span>
        <select aria-label={`Quadra do horário ${index + 1}`} className="input" value={row.courtId} onChange={(e) => onChange({ courtId: e.target.value })}>
          {!row.courtId && <option value="">Quadra…</option>}
          {selectable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.active ? "" : " (inativa)"}
            </option>
          ))}
        </select>
        <select aria-label={`Dia do horário ${index + 1}`} className="input" value={row.weekday} onChange={(e) => changeWeekday(e.target.value as Weekday)}>
          {WEEKDAYS.map((wd) => {
            const open = windows.some((x) => x.weekday === wd);
            return (
              <option key={wd} value={wd} disabled={!open && wd !== row.weekday}>
                {WEEKDAY_LABEL[wd]}
                {open ? "" : " (fechado)"}
              </option>
            );
          })}
        </select>
        <select aria-label={`Início do horário ${index + 1}`} className="input" value={row.startHour} onChange={(e) => onChange({ startHour: Number(e.target.value) })}>
          {starts.map((h) => (
            <option key={h} value={h}>
              {hh(h)}
            </option>
          ))}
        </select>
        <select aria-label={`Fim do horário ${index + 1}`} className="input" value={row.endHour} onChange={(e) => onChange({ endHour: Number(e.target.value) })}>
          {ends.map((h) => (
            <option key={h} value={h}>
              {hh(h)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onRemove}
          disabled={!onRemove}
          aria-label={`Remover horário ${index + 1}`}
          className="grid size-9 place-items-center rounded-full text-ink-soft transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-soft"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {error && <p className="mt-2 pl-8 text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
