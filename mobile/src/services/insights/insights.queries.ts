import { useMutation } from "@tanstack/react-query";
import { sendInsightsMessage, type SendMessagePayload } from "./insights.api";

export const useSendInsightsMessage = () =>
  useMutation({
    mutationFn: (payload: SendMessagePayload) => sendInsightsMessage(payload),
  });
