import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ReservationResponse } from "@/lib/schemas";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: { select: { name: true, imageUrl: true } },
      warehouse: { select: { name: true } },
    },
  });

  if (!reservation) {
    return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
  }

  if (reservation.status === "RELEASED") {
    // Idempotent — already released
    return NextResponse.json({
      id: reservation.id,
      productId: reservation.productId,
      productName: reservation.product.name,
      productImageUrl: reservation.product.imageUrl,
      warehouseId: reservation.warehouseId,
      warehouseName: reservation.warehouse.name,
      quantity: reservation.quantity,
      status: "RELEASED" as const,
      expiresAt: reservation.expiresAt.toISOString(),
      confirmedAt: null,
      releasedAt: reservation.releasedAt?.toISOString() ?? null,
      createdAt: reservation.createdAt.toISOString(),
    } satisfies ReservationResponse);
  }

  if (reservation.status === "CONFIRMED") {
    return NextResponse.json(
      { error: "Cannot release a confirmed reservation." },
      { status: 409 }
    );
  }

  const now = new Date();
  const [released] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: { status: "RELEASED", releasedAt: now },
      include: {
        product: { select: { name: true, imageUrl: true } },
        warehouse: { select: { name: true } },
      },
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

  return NextResponse.json({
    id: released.id,
    productId: released.productId,
    productName: released.product.name,
    productImageUrl: released.product.imageUrl,
    warehouseId: released.warehouseId,
    warehouseName: released.warehouse.name,
    quantity: released.quantity,
    status: "RELEASED" as const,
    expiresAt: released.expiresAt.toISOString(),
    confirmedAt: null,
    releasedAt: released.releasedAt?.toISOString() ?? null,
    createdAt: released.createdAt.toISOString(),
  } satisfies ReservationResponse);
}
