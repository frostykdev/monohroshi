import { useQuery } from "@tanstack/react-query";
import { fetchFxConvert } from "./fx.api";

export const useFxConvert = (amount: number, from: string, to: string) =>
  useQuery({
    queryKey: ["fx", "convert", amount, from, to],
    queryFn: () => fetchFxConvert(amount, from, to),
    enabled: amount > 0 && from !== to && Boolean(from) && Boolean(to),
    staleTime: 5 * 60 * 1000,
  });
