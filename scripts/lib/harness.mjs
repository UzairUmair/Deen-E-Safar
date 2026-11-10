// Shared Playwright plumbing for the browser checks in this folder.
import { chromium } from "playwright-core";
import { resolveProviderRequest } from "../../tests/fixtures/providers.mjs";

export const BASE = process.env.BASE || "http://127.0.0.1:3000";
export const launchOptions = { args: ["--no-sandbox", "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"] };
if (process.env.CHROME_PATH) launchOptions.executablePath = process.env.CHROME_PATH;
else launchOptions.channel = "chrome";

export const launch = (extraArgs = []) => chromium.launch({ ...launchOptions, args: [...launchOptions.args, ...extraArgs] });

/**
 * Answers every request to the Quran, prayer and audio providers from recorded
 * responses, so the checks never depend on third-party availability.
 * `fail(url)` may return true to simulate an unreachable provider.
 */
export async function mockProviders(context, { fail } = {}) {
  const requests = [];
  await context.route(/^https:\/\/(api\.alquran\.cloud|api\.aladhan\.com|cdn\.islamic\.network)\//, async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (fail?.(url)) return route.abort("failed");
    const answer = resolveProviderRequest(url);
    await route.fulfill({ status: answer.status, contentType: answer.contentType, body: answer.body, headers: { "access-control-allow-origin": "*" } });
  });
  return requests;
}

/** Saved guest preferences, in the envelope the app's storage layer writes. */
export const preferences = (data) => ({ "deen-v2:guest:preferences": JSON.stringify({ v: 1, data }) });

const results = [];
const problems = [];
export async function test(name, fn) {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (error) {
    results.push(`FAIL  ${name}`);
    problems.push(`${name}: ${String(error.message).split("\n").slice(0, 3).join(" | ")}`);
  }
}
export function report() {
  console.log(results.join("\n"));
  if (problems.length) {
    console.error("\n" + problems.join("\n"));
    process.exit(1);
  }
  console.log(`\nAll ${results.length} browser checks passed.`);
}

export const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
