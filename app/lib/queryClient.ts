import { QueryClient } from "@tanstack/react-query";
import { isRetryable } from "./apiClient";

/** Shared cache for provider data. Transient failures retry twice; everything else surfaces at once. */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failures, error) => failures < 2 && isRetryable(error),
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 6000),
      },
    },
  });
}
