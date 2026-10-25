import { expect, it } from "vitest";
import { createRequestLimiter } from "@/server/homework/limits";
it("releases concurrency slots once and expires the rate window", () => {
  let now = 0;
  const limiter = createRequestLimiter(() => now);
  const release1 = limiter.acquire();
  const release2 = limiter.acquire();
  expect(() => limiter.acquire()).toThrow();
  release1();
  release1();
  release2();
  for (let i = 0; i < 18; i++) limiter.acquire()();
  expect(() => limiter.acquire()).toThrow();
  now = 60001;
  expect(() => limiter.acquire()()).not.toThrow();
});
