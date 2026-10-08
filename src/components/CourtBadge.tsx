import { Sun, Umbrella } from "lucide-react";
import type { CourtType } from "../api/types";

export const COURT_TYPE_LABEL: Record<CourtType, string> = { INDOOR: "Coberta", OUTDOOR: "Ao ar livre" };

export function CourtBadge({ type, className = "" }: { type: CourtType; className?: string }) {
  const covered = type === "INDOOR";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
        covered ? "bg-ocean text-white" : "bg-white text-[#C2601C] ring-1 ring-sand-200"
      } ${className}`}
    >
      {covered ? <Umbrella className="size-3.5" /> : <Sun className="size-3.5" />}
      {COURT_TYPE_LABEL[type]}
    </span>
  );
}
