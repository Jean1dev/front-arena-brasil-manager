import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Spinner({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-ink-soft">
      <Loader2 className="size-5 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }: { icon: LucideIcon; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="card grain flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-ocean-soft text-ocean">
        <Icon className="size-6" />
      </span>
      <h3 className="mt-4 text-lg font-extrabold tracking-tight">{title}</h3>
      {message && <p className="mt-1 max-w-md text-sm text-ink-soft">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="card flex items-center justify-between gap-4 px-6 py-5">
      <p className="text-sm font-semibold text-danger">{error instanceof Error ? error.message : "Erro ao carregar."}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm font-bold text-brand hover:underline">
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function StatusPill({ active, labels = ["Ativo", "Inativo"] }: { active: boolean; labels?: [string, string] }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-sand-200 text-ink-soft"
      }`}
    >
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-ink-soft/50"}`} />
      {active ? labels[0] : labels[1]}
    </span>
  );
}
