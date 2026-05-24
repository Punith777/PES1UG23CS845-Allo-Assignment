import { prisma } from "./prisma";

const KEY_TTL_HOURS = 24;

export async function withIdempotency<T>(
  idempotencyKey: string | null,
  endpoint: string,
  fn: () => Promise<{ body: T; status: number }>
): Promise<{ body: T; status: number; fromCache: boolean }> {
  if (!idempotencyKey) {
    const result = await fn();
    return { ...result, fromCache: false };
  }

  // Check for existing key
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key: `${endpoint}:${idempotencyKey}` },
  });

  if (existing && existing.expiresAt > new Date()) {
    return {
      body: existing.responseBody as T,
      status: existing.statusCode,
      fromCache: true,
    };
  }

  const result = await fn();

  const expiresAt = new Date(Date.now() + KEY_TTL_HOURS * 60 * 60 * 1000);
  await prisma.idempotencyKey.upsert({
    where: { key: `${endpoint}:${idempotencyKey}` },
    update: {
      responseBody: result.body as object,
      statusCode: result.status,
      expiresAt,
    },
    create: {
      key: `${endpoint}:${idempotencyKey}`,
      endpoint,
      responseBody: result.body as object,
      statusCode: result.status,
      expiresAt,
    },
  });

  return { ...result, fromCache: false };
}
