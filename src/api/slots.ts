import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { CourtSlots } from "./types";

const fetchSlots = (courtId: string, from: string, to: string) =>
  api<CourtSlots>("GET", `/courts/${courtId}/slots?from=${from}&to=${to}`);

export const useCourtSlots = (courtId: string | undefined, from: string, to: string) =>
  useQuery({
    queryKey: ["slots", courtId, from, to],
    queryFn: () => fetchSlots(courtId!, from, to),
    enabled: !!courtId,
    refetchInterval: 60_000,
  });

export const useSlotsForCourts = (courtIds: string[], from: string, to: string) =>
  useQueries({
    queries: courtIds.map((id) => ({
      queryKey: ["slots", id, from, to],
      queryFn: () => fetchSlots(id, from, to),
      refetchInterval: 60_000,
    })),
  });
