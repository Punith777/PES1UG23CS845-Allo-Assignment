import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";
import type { ReservationResponse } from "@/lib/schemas";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idempotencyKey = request.headers.get("Idempotency-Key");

  const { body: responseBody, status, fromCache } = await withIdempotency<
    ReservationResponse | { error: string }
  >(
    idempotencyKey,
    `POST:/api/reservations/${id}/confirm`,
    async () => {
      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
          product: { select: { name: true, imageUrl: true } },
          warehouse: { select: { name: true } },
        },
      });

      if (!reservation) {
        return { body: { error: "Reservation not found" }, status: 404 };
      }

      if (reservation.status === "CONFIRMED") {
        return {
          body: {
            id: reservation.id,
            productId: reservation.productId,
            productName: reservation.product.name,
            productImageUrl: reservation.product.imageUrl,
            warehouseId: reservation.warehouseId,
            warehouseName: reservation.warehouse.name,
            quantity: reservation.quantity,
            status: "CONFIRMED" as const,
            expiresAt: reservation.expiresAt.toISOString(),
            confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
            releasedAt: null,
            createdAt: reservation.createdAt.toISOString(),
          },
          status: 200,
        };
      }

      if (reservation.status === "RELEASED") {
        return { body: { error: "Reservation has already been released." }, status: 410 };
      }

      // Check expiry
      if (reservation.expiresAt < new Date()) {
        // Release stock and mark expired
        await prisma.$transaction([
          prisma.reservation.update({
            where: { id },
            data: { status: "RELEASED", releasedAt: new Date() },
          }),
          prisma.stock.update({
            where: {
              productId_warehouseId: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId,
              },
            },
            data: { reserved: { decrement: reservation.quantity } },
          }),
        ]);
        return { body: { error: "Reservation has expired. Please start a new checkout." }, status: 410 };
      }

      // Confirm: mark confirmed, decrement total (stock is now permanently consumed)
      const now = new Date();
      const [confirmed] = await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data: { status: "CONFIRMED", confirmedAt: now },
          include: {
            product: { select: { name: true, imageUrl: true } },
            warehouse: { select: { name: true } },
          },
        }),
        // Permanently decrement both total and reserved
        prisma.stock.update({
          where: {
            productId_warehouseId: {
              productId: reservation.productId,
              warehouseId: reservation.warehouseId,
            },
          },
          data: {
            total: { decrement: reservation.quantity },
            reserved: { decrement: reservation.quantity },
          },
        }),
      ]);

      return {
        body: {
          id: confirmed.id,
          productId: confirmed.productId,
          productName: confirmed.product.name,
          productImageUrl: confirmed.product.imageUrl,
          warehouseId: confirmed.warehouseId,
          warehouseName: confirmed.warehouse.name,
          quantity: confirmed.quantity,
          status: "CONFIRMED" as const,
          expiresAt: confirmed.expiresAt.toISOString(),
          confirmedAt: confirmed.confirmedAt?.toISOString() ?? null,
          releasedAt: null,
          createdAt: confirmed.createdAt.toISOString(),
        },
        status: 200,
      };
    }
  );

  const response = NextResponse.json(responseBody, { status });
  if (fromCache) response.headers.set("Idempotent-Replayed", "true");
  return response;
}
