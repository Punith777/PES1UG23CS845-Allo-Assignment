import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withLock } from "@/lib/redis";
import { withIdempotency } from "@/lib/idempotency";
import { ReserveSchema } from "@/lib/schemas";
import type { ReservationResponse } from "@/lib/schemas";

const RESERVATION_TTL_MINUTES = 10;

function formatReservation(r: {
  id: string;
  productId: string;
  product: { name: string; imageUrl: string | null };
  warehouseId: string;
  warehouse: { name: string };
  quantity: number;
  status: string;
  expiresAt: Date;
  confirmedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
}): ReservationResponse {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.product.name,
    productImageUrl: r.product.imageUrl,
    warehouseId: r.warehouseId,
    warehouseName: r.warehouse.name,
    quantity: r.quantity,
    status: r.status as ReservationResponse["status"],
    expiresAt: r.expiresAt.toISOString(),
    confirmedAt: r.confirmedAt?.toISOString() ?? null,
    releasedAt: r.releasedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReserveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { productId, warehouseId, quantity } = parsed.data;

  const { body: responseBody, status, fromCache } = await withIdempotency<ReservationResponse | { error: string }>(
    idempotencyKey,
    "POST:/api/reservations",
    async () => {
      // Distributed lock per (product, warehouse) pair — guarantees exactly-once stock decrement
      const lockKey = `stock:${productId}:${warehouseId}`;

      try {
        const result = await withLock(lockKey, async () => {
          // Read stock inside the lock
          const stock = await prisma.stock.findUnique({
            where: { productId_warehouseId: { productId, warehouseId } },
          });

          if (!stock) {
            return { body: { error: "Stock record not found" }, status: 404 };
          }

          const available = stock.total - stock.reserved;
          if (available < quantity) {
            return {
              body: {
                error: `Insufficient stock. Requested ${quantity}, available ${available}.`,
                available,
              },
              status: 409,
            };
          }

          const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

          // Atomic: create reservation + increment reserved count
          const [reservation] = await prisma.$transaction([
            prisma.reservation.create({
              data: { productId, warehouseId, quantity, expiresAt, status: "PENDING" },
              include: {
                product: { select: { name: true, imageUrl: true } },
                warehouse: { select: { name: true } },
              },
            }),
            prisma.stock.update({
              where: { productId_warehouseId: { productId, warehouseId } },
              data: { reserved: { increment: quantity } },
            }),
          ]);

          return { body: formatReservation(reservation), status: 201 };
        });

        return result;
      } catch (err) {
        if (err instanceof Error && err.message.includes("Could not acquire lock")) {
          return { body: { error: "Service busy, please retry." }, status: 503 };
        }
        throw err;
      }
    }
  );

  const response = NextResponse.json(responseBody, { status });
  if (fromCache) response.headers.set("Idempotent-Replayed", "true");
  return response;
}
