import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface Props {
  days: Date[];
  selected: Date;
  onSelect: (d: Date) => void;
  isOpen: (d: Date) => boolean;
  /** Dias destacados junto do selecionado (visão semanal). */
  highlight?: (d: Date) => boolean;
}

export function DayStrip({ days, selected, onSelect, isOpen, highlight }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-active=true]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [selected]);

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * 480, behavior: "smooth" });

  return (
    <div className="relative flex items-center gap-2">
      <ArrowButton onClick={() => scroll(-1)} label="Dias anteriores">
        <ChevronLeft className="size-4" />
      </ArrowButton>
      <div ref={ref} className="no-scrollbar flex flex-1 snap-x gap-2 overflow-x-auto py-1">
        {days.map((d) => {
          const active = isSameDay(d, selected);
          const lit = !active && highlight?.(d);
          const open = isOpen(d);
          const label = isToday(d) ? "Hoje" : isTomorrow(d) ? "Amanhã" : WEEKDAYS[d.getDay()];
          return (
            <button
              key={d.toISOString()}
              data-active={active}
              onClick={() => onSelect(d)}
              className={`relative flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl py-2.5 transition-colors ${
                active ? "text-white" : lit ? "bg-ocean-soft text-ink ring-1 ring-ocean/20" : "bg-white text-ink ring-1 ring-sand-200 hover:ring-sand-300"
              }`}
            >
              {active && <motion.span layoutId="day-pill" className="absolute inset-0 rounded-2xl bg-ink" transition={{ type: "spring", bounce: 0.25, duration: 0.45 }} />}
              <span className={`relative text-[11px] font-semibold capitalize ${active ? "text-white/70" : "text-ink-soft"}`}>{label}</span>
              <span className="relative text-xl font-extrabold leading-tight">{format(d, "d")}</span>
              <span className={`relative text-[10px] font-semibold capitalize ${active ? "text-white/70" : "text-ink-soft"}`}>
                {format(d, "MMM", { locale: ptBR }).replace(".", "")}
              </span>
              <span className={`relative mt-1 size-1.5 rounded-full ${open ? "bg-emerald-400" : "bg-sand-300"}`} title={open ? "Aberto" : "Fechado"} />
            </button>
          );
        })}
      </div>
      <ArrowButton onClick={() => scroll(1)} label="Próximos dias">
        <ChevronRight className="size-4" />
      </ArrowButton>
    </div>
  );
}

function ArrowButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="grid size-9 shrink-0 place-items-center rounded-full bg-white ring-1 ring-sand-200 hover:bg-sand-50">
      {children}
    </button>
  );
}
