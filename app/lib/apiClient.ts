// The only place the app talks to the network for third-party JSON APIs.
// Provider adapters (quranApi, prayerApi) build URLs and validate payloads on top of it.

export type ApiErrorKind = "offline" | "network" | "timeout" | "rate-limit" | "server" | "not-found" | "bad-request" | "invalid-response";

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
  }
}

// English strings double as i18n keys.
const MESSAGES: Record<ApiErrorKind, string> = {
  offline: "You appear to be offline. Check your connection and try again.",
  network: "The service could not be reached. Check your connection and try again.",
  timeout: "The request took too long. Please try again.",
  "rate-limit": "Too many requests right now. Please wait a moment and try again.",
  server: "The provider is having problems right now. Please try again later.",
  "not-found": "The requested content was not found.",
  "bad-request": "The provider did not accept this request.",
  "invalid-response": "The provider returned data in an unexpected format.",
};

export function apiErrorMessage(error: unknown): string {
  return error instanceof ApiError ? MESSAGES[error.kind] : "Something went wrong. Please try again.";
}

/** Transient failures are worth retrying automatically; the rest need the visitor or a fix. */
export function isRetryable(error: unknown) {
  return error instanceof ApiError && (error.kind === "network" || error.kind === "timeout" || error.kind === "server");
}

export function invalid(message: string): never {
  throw new ApiError("invalid-response", message);
}

export async function getJson(url: string, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<unknown> {
  const { signal, timeoutMs = 15000 } = options;
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ApiError("offline", MESSAGES.offline);
  const controller = new AbortController();
  const forward = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", forward);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(url, { signal: controller.signal });
    } catch (error) {
      if (timedOut) throw new ApiError("timeout", MESSAGES.timeout);
      if (signal?.aborted) throw error; // cancelled by the caller: not a failure to report
      throw new ApiError("network", MESSAGES.network);
    }
    if (!response.ok) {
      const kind: ApiErrorKind = response.status === 429 ? "rate-limit" : response.status === 404 ? "not-found" : response.status >= 500 ? "server" : "bad-request";
      throw new ApiError(kind, MESSAGES[kind], response.status);
    }
    try {
      return await response.json();
    } catch (error) {
      if (timedOut) throw new ApiError("timeout", MESSAGES.timeout);
      if (signal?.aborted) throw error;
      throw new ApiError("invalid-response", MESSAGES["invalid-response"], response.status);
    }
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forward);
  }
}
