import { apiClient } from "@services/api";

type ApiResponse<TData> = { success: boolean; data: TData };

export type FxConvertResult = {
  amount: number;
  from: string;
  to: string;
  date: string;
  converted: number;
};

export const fetchFxConvert = async (
  amount: number,
  from: string,
  to: string,
  date?: string,
): Promise<FxConvertResult> => {
  const params = new URLSearchParams({
    amount: String(amount),
    from,
    to,
    ...(date ? { date } : {}),
  });
  const res = await apiClient.get<ApiResponse<FxConvertResult>>(
    `/v1/fx/convert?${params.toString()}`,
  );
  return res.data.data;
};
