import { useEffect, useState } from "react";

/** Data/hora atual, atualizada a cada `intervalMs` (padrão: 1 minuto). */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
