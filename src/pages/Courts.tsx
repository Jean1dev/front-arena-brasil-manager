import { motion } from "framer-motion";
import { LandPlot, Pencil, Plus, Sun, Umbrella } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "../api/client";
import { useCourts, useSaveCourt } from "../api/courts";
import type { Court, CourtType } from "../api/types";
import { Button } from "../components/Button";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CourtBadge } from "../components/CourtBadge";
import { CourtIllustration } from "../components/CourtIllustration";
import { Field } from "../components/Field";
import { Modal } from "../components/Overlay";
import { PageHeader } from "../components/PageHeader";
import { Segmented } from "../components/Segmented";
import { EmptyState, ErrorState, Spinner, StatusPill } from "../components/States";
import { useToast } from "../components/Toast";
import { fieldErrorsOf, type FieldErrors } from "../lib/fieldErrors";
import { centsToInput, money, parseMoney } from "../lib/format";

export default function Courts() {
  const { data: courts, isLoading, error, refetch } = useCourts(true);
  const [editing, setEditing] = useState<Court | "new" | null>(null);
  const [toggling, setToggling] = useState<Court | null>(null);
  const save = useSaveCourt();
  const toast = useToast();

  async function toggleActive(court: Court) {
    try {
      await save.mutateAsync({ id: court.id, data: { active: !court.active } });
      toast(court.active ? `${court.name} desativada` : `${court.name} reativada`);
      setToggling(null);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }

  const active = courts?.filter((c) => c.active).length ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Quadras"
        subtitle={courts ? `${active} ativa${active === 1 ? "" : "s"} de ${courts.length}` : undefined}
        actions={
          <Button variant="brand" onClick={() => setEditing("new")}>
            <Plus className="size-4" />
            Nova quadra
          </Button>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !courts?.length ? (
        <EmptyState
          icon={LandPlot}
          title="Nenhuma quadra cadastrada"
          message="Cadastre as quadras da arena para montar a agenda e os mensalistas."
          action={<Button onClick={() => setEditing("new")}>Cadastrar quadra</Button>}
        />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {courts.map((c) => (
            <motion.article key={c.id} layout className={`card overflow-hidden ${c.active ? "" : "opacity-70"}`}>
              <div className={`relative h-32 ${c.active ? "" : "grayscale"}`}>
                <CourtIllustration type={c.type} className="absolute inset-0 size-full" />
                <CourtBadge type={c.type} className="absolute left-3 top-3 shadow-sm" />
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-extrabold tracking-tight">{c.name}</h3>
                    <p className="mt-0.5 text-sm">
                      <span className="text-ink-soft">a partir de </span>
                      <span className="font-extrabold">{money(c.minHourlyPriceCents)}</span>
                      <span className="text-ink-soft">/h</span>
                    </p>
                  </div>
                  <StatusPill active={c.active} labels={["Ativa", "Inativa"]} />
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                    <Pencil className="size-3.5" />
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => (c.active ? setToggling(c) : toggleActive(c))}>
                    {c.active ? "Desativar" : "Reativar"}
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      )}

      <CourtForm court={editing} onClose={() => setEditing(null)} />

      <ConfirmDialog
        open={!!toggling}
        title={`Desativar ${toggling?.name}?`}
        message="A quadra some da agenda e não pode receber novos mensalistas. Os mensalistas que já usam essa quadra continuam cadastrados. Você pode reativá-la depois."
        confirmLabel="Desativar"
        danger
        loading={save.isPending}
        onConfirm={() => toggling && toggleActive(toggling)}
        onClose={() => setToggling(null)}
      />
    </>
  );
}

function CourtForm({ court, onClose }: { court: Court | "new" | null; onClose: () => void }) {
  const open = court !== null;
  const existing = court && court !== "new" ? court : null;
  return (
    <Modal open={open} onClose={onClose} title={existing ? `Editar ${existing.name}` : "Nova quadra"} subtitle="Quadras nunca são excluídas; desative para tirar de uso.">
      {open && <CourtFormBody key={existing?.id ?? "new"} court={existing} onClose={onClose} />}
    </Modal>
  );
}

function CourtFormBody({ court, onClose }: { court: Court | null; onClose: () => void }) {
  const [name, setName] = useState(court?.name ?? "");
  const [type, setType] = useState<CourtType>(court?.type ?? "INDOOR");
  const [price, setPrice] = useState(court ? centsToInput(court.minHourlyPriceCents) : "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useSaveCourt();
  const toast = useToast();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cents = parseMoney(price);
    const local: FieldErrors = {};
    if (!name.trim()) local.name = "Campo obrigatório.";
    if (!(cents > 0)) local.minHourlyPriceCents = "Informe um preço maior que zero.";
    setErrors(local);
    if (Object.keys(local).length) return;

    try {
      await save.mutateAsync({ id: court?.id, data: { name: name.trim(), type, minHourlyPriceCents: cents } });
      toast(court ? "Quadra atualizada" : "Quadra cadastrada");
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "COURT_NAME_ALREADY_EXISTS") setErrors({ name: err.message });
      else {
        setErrors(fieldErrorsOf(err));
        toast((err as Error).message, "error");
      }
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="Nome" htmlFor="court-name" error={errors.name}>
        <input id="court-name" className="input" maxLength={100} autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Quadra 1" aria-invalid={!!errors.name} />
      </Field>
      <Field label="Tipo" error={errors.type}>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "INDOOR", label: <><Umbrella className="size-4" />Coberta</> },
            { value: "OUTDOOR", label: <><Sun className="size-4" />Ao ar livre</> },
          ]}
        />
      </Field>
      <Field label="Preço mínimo por hora" htmlFor="court-price" error={errors.minHourlyPriceCents} hint="Valor cobrado por hora nos horários livres.">
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-soft">R$</span>
          <input id="court-price" className="input !pl-10" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d,.]/g, ""))} placeholder="90,00" aria-invalid={!!errors.minHourlyPriceCents} />
        </div>
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {court ? "Salvar" : "Cadastrar"}
        </Button>
      </div>
    </form>
  );
}
