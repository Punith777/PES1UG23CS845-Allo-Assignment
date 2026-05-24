// import { Redis } from "@upstash/redis";

// export const redis = new Redis({
//   url: process.env.UPSTASH_REDIS_REST_URL!,
//   token: process.env.UPSTASH_REDIS_REST_TOKEN!,
// });

// // Distributed lock helpers
// const LOCK_TTL = 10; // seconds

// export async function acquireLock(key: string): Promise<string | null> {
//   const lockId = `${Date.now()}-${Math.random()}`;
//   const lockKey = `lock:${key}`;
//   // SET NX EX — atomic
//   const result = await redis.set(lockKey, lockId, { nx: true, ex: LOCK_TTL });
//   return result === "OK" ? lockId : null;
// }

// export async function releaseLock(key: string, lockId: string): Promise<void> {
//   const lockKey = `lock:${key}`;
//   // Only release if we own it — Lua script ensures atomicity
//   const script = `
//     if redis.call("GET", KEYS[1]) == ARGV[1] then
//       return redis.call("DEL", KEYS[1])
//     else
//       return 0
//     end
//   `;
//   await redis.eval(script, [lockKey], [lockId]);
// }

// export async function withLock<T>(
//   key: string,
//   fn: () => Promise<T>,
//   retries = 5,
//   retryDelayMs = 100
// ): Promise<T> {
//   for (let i = 0; i < retries; i++) {
//     const lockId = await acquireLock(key);
//     if (lockId) {
//       try {
//         return await fn();
//       } finally {
//         await releaseLock(key, lockId);
//       }
//     }
//     if (i < retries - 1) {
//       await new Promise((r) => setTimeout(r, retryDelayMs * (i + 1)));
//     }
//   }
//   throw new Error("Could not acquire lock after retries");
// }

import Redis from "ioredis";

export const redis = new Redis(
  process.env.REDIS_URL!,
  {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    lazyConnect: true,
  }
);

// shorter lock duration
const LOCK_TTL = 3;

export async function acquireLock(
  key: string
): Promise<string | null> {

  const lockId =
    `${Date.now()}-${Math.random()}`;

  const lockKey = `lock:${key}`;

  const result = await redis.set(
    lockKey,
    lockId,
    "EX",
    LOCK_TTL,
    "NX"
  );

  return result === "OK"
    ? lockId
    : null;
}

export async function releaseLock(
  key: string,
  lockId: string
): Promise<void> {

  const lockKey = `lock:${key}`;

  const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1]
    then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;

  await redis.eval(
    script,
    1,
    lockKey,
    lockId
  );
}

export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  retries = 3,
  retryDelayMs = 50
): Promise<T> {

  for (let i = 0; i < retries; i++) {

    const lockId =
      await acquireLock(key);

    if (lockId) {

      try {
        return await fn();

      } finally {

        await releaseLock(
          key,
          lockId
        );
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, retryDelayMs)
    );
  }

  throw new Error(
    "Could not acquire lock"
  );
}