import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Court, CourtInput, CourtPatch } from "./types";

export const useCourts = (includeInactive = false) =>
  useQuery({
    queryKey: ["courts", { includeInactive }],
    queryFn: () => api<Court[]>("GET", `/courts${includeInactive ? "?includeInactive=true" : ""}`),
  });

export function useSaveCourt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CourtInput | CourtPatch }) =>
      id ? api<Court>("PATCH", `/courts/${id}`, data) : api<Court>("POST", "/courts", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courts"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
