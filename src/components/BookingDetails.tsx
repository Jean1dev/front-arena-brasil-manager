import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { Booking, Sport } from "../api/types";
import { formatPhone, hourRange, longDate, money, slotHour, whatsappLink } from "../lib/format";
import { Modal } from "./Overlay";

const SPORT_LABEL: Record<Sport, string> = {
  BEACH_TENNIS: "🎾 Beach tennis",
  FOOTVOLLEY: "⚽ Futevôlei",
  BEACH_VOLLEYBALL: "🏐 Vôlei de praia",
};

/** "[17, 18, 20]" → "17h–19h · 20h–21h". */
function hoursLabel(booking: Booking) {
  const ranges: [number, number][] = [];
  for (const h of booking.slots.map((s) => slotHour(s.start)).sort((a, b) => a - b)) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === h) last[1] = h + 1;
    else ranges.push([h, h + 1]);
  }
  return ranges.map(([a, b]) => hourRange(a, b)).join(" · ");
}

export function BookingDetails({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  return (
    <Modal open={!!booking} onClose={onClose} title={booking?.name ?? ""} subtitle="Reserva avulsa feita pelo app">
      {booking && (
        <div className="space-y-5">
          <a
            href={whatsappLink(booking.whatsapp)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-100"
          >
            <span>
              <span className="block text-[11px] font-bold uppercase tracking-wide text-emerald-700">WhatsApp</span>
              <span className="text-base font-extrabold">{formatPhone(booking.whatsapp)}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm font-bold">
              <MessageCircle className="size-4" />
              Conversar
            </span>
          </a>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <Item label="Quadra">{booking.courtName}</Item>
            <Item label="Data">{longDate(booking.date)}</Item>
            <Item label="Horário">{hoursLabel(booking)}</Item>
            <Item label="Valor">{money(booking.totalPriceCents)}</Item>
            <Item label="Esporte">{booking.sport ? SPORT_LABEL[booking.sport] : "Não informado"}</Item>
            <Item label="Jogadores">{booking.players ?? "Não informado"}</Item>
          </dl>

          {booking.notes && (
            <div>
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-soft">Observações</p>
              <p className="whitespace-pre-wrap rounded-2xl bg-white p-3 text-sm ring-1 ring-sand-200">{booking.notes}</p>
            </div>
          )}

          <p className="text-xs text-ink-soft">
            Reservado em {format(parseISO(booking.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      )}
    </Modal>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-0.5 font-bold">{children}</dd>
    </div>
  );
}
