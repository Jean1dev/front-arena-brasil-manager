import { useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./client";
import type { Booking } from "./types";

/**
 * Reservas avulsas de `from` a `to` (admin). Enquanto a API não tiver a rota de leitura
 * (404/405), devolve `null` e a agenda mostra só o status "Reservado".
 */
export const useBookings = (from: string, to: string) =>
  useQuery({
    queryKey: ["bookings", from, to],
    queryFn: async () => {
      try {
        return await api<Booking[]>("GET", `/bookings?from=${from}&to=${to}`);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) return null;
        throw err;
      }
    },
    // Reservas chegam pelo app público a qualquer momento.
    refetchInterval: 60_000,
  });
