import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { ToastContext } from "../app/components/ui/states";
import { resolveProviderRequest } from "./fixtures/providers.mjs";

type Override = (url: string) => Response | Promise<Response> | undefined;

/**
 * Replaces fetch with the recorded provider responses. `override` can answer first
 * (to simulate failures); `calls` lists every requested URL.
 */
export function mockProviders(override?: Override) {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const custom = await override?.(url);
    if (custom) return custom;
    if (url.startsWith("/content/")) {
      const { readFileSync } = await import("node:fs");
      return new Response(readFileSync(`public${url}`, "utf8"), { status: 200, headers: { "content-type": "application/json" } });
    }
    const answer = resolveProviderRequest(url);
    if (!answer) throw new TypeError(`Unexpected request: ${url}`);
    return new Response(answer.body as BodyInit, { status: answer.status, headers: { "content-type": answer.contentType } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

export const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Renders with the providers application screens expect. Queries do not retry, so failures surface immediately. */
export function renderScreen(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  const toasts: string[] = [];
  const view = render(
    <QueryClientProvider client={client}>
      <ToastContext.Provider value={(message) => toasts.push(message)}>{ui}</ToastContext.Provider>
    </QueryClientProvider>,
  );
  return { ...view, toasts, client };
}
