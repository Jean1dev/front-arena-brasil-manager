import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { MonthlyCustomer, MonthlyCustomerInput, MonthlyCustomerPatch } from "./types";

export const useMonthlyCustomers = (includeInactive = false) =>
  useQuery({
    queryKey: ["monthly-customers", { includeInactive }],
    queryFn: () => api<MonthlyCustomer[]>("GET", `/monthly-customers${includeInactive ? "?includeInactive=true" : ""}`),
  });

export function useSaveMonthlyCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: MonthlyCustomerInput | MonthlyCustomerPatch }) =>
      id
        ? api<MonthlyCustomer>("PATCH", `/monthly-customers/${id}`, data)
        : api<MonthlyCustomer>("POST", "/monthly-customers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["monthly-customers"] });
      qc.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}
