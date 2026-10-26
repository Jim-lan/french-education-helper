import "server-only";
import { getStore, type LearningStore } from "./store";
import { calendarKeys } from "./calendar";
import { prepareQuiz } from "./quiz-service";
import { createProvider } from "@/server/llm/provider-factory";
import { requestLimiter } from "@/server/homework/limits";
import type { LLMProvider } from "@/server/llm/types";

export async function catchUpMonthly(
  store: LearningStore,
  provider: () => LLMProvider = createProvider,
  now = new Date(),
) {
  const current = calendarKeys(now).monthKey;
  for (const month of store
    .months()
    .filter((month) => month < current)
    .reverse()) {
    if (store.latestQuiz("monthly", month) || store.jobStatus(month)?.pending)
      continue;
    // Failed jobs back off for six hours; an explicit retry can clear the backoff.
    if (store.jobStatus(month)?.error) {
      const row = store.db
        .prepare("SELECT lease_until FROM monthly_jobs WHERE month_key=?")
        .get(month);
      if (row && Number(row.lease_until) > now.getTime()) continue;
    }
    let release: (() => void) | undefined;
    try {
      release = requestLimiter.acquire();
      await prepareQuiz(
        store,
        { kind: "monthly", month },
        provider,
        AbortSignal.timeout(60000),
      );
    } catch {
      /* Safe failure is persisted by prepareQuiz; try again after backoff. */
    } finally {
      release?.();
    }
  }
}
const state = globalThis as typeof globalThis & {
  frenchMonthlyTimer?: ReturnType<typeof setInterval>;
};
export function startMonthlyScheduler() {
  if (state.frenchMonthlyTimer || process.env.NODE_ENV === "test") return;
  const run = () => {
    try {
      void catchUpMonthly(getStore()).catch(() => {});
    } catch {
      /* UI reports storage errors. */
    }
  };
  setTimeout(run, 15000).unref();
  state.frenchMonthlyTimer = setInterval(run, 60 * 60 * 1000);
  state.frenchMonthlyTimer.unref();
}
