import "server-only";
import { AppError } from "../errors";
export function createRequestLimiter(now: () => number = Date.now) {
  let active = 0;
  let requests: number[] = [];
  return {
    acquire() {
      const current = now();
      requests = requests.filter((time) => current - time < 60000);
      if (active >= 2 || requests.length >= 20)
        throw new AppError(
          "TOO_MANY_REQUESTS",
          "A few notes are already being read. Please wait a moment and try again.",
          429,
        );
      requests.push(current);
      active++;
      let released = false;
      return () => {
        if (!released) {
          active--;
          released = true;
        }
      };
    },
  };
}
export const requestLimiter = createRequestLimiter();
