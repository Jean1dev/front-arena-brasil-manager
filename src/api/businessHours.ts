import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { BusinessHours, Window } from "./types";

export const useBusinessHours = () =>
  useQuery({ queryKey: ["business-hours"], queryFn: () => api<BusinessHours>("GET", "/business-hours") });

export function useSaveBusinessHours() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: Window[]) => api<BusinessHours>("PUT", "/business-hours", { days }),
    onSuccess: (data) => {
      qc.setQueryData(["business-hours"], data);
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
