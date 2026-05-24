import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
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

  // Lazy expiry check
  if (reservation.status === "PENDING" && reservation.expiresAt < new Date()) {
    const updated = await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data: { status: "RELEASED", releasedAt: new Date() },
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

    const rel = updated[0];
    return NextResponse.json({
      id: rel.id,
      productId: rel.productId,
      productName: rel.product.name,
      productImageUrl: rel.product.imageUrl,
      warehouseId: rel.warehouseId,
      warehouseName: rel.warehouse.name,
      quantity: rel.quantity,
      status: rel.status,
      expiresAt: rel.expiresAt.toISOString(),
      confirmedAt: rel.confirmedAt?.toISOString() ?? null,
      releasedAt: rel.releasedAt?.toISOString() ?? null,
      createdAt: rel.createdAt.toISOString(),
    });
  }

  return NextResponse.json({
    id: reservation.id,
    productId: reservation.productId,
    productName: reservation.product.name,
    productImageUrl: reservation.product.imageUrl,
    warehouseId: reservation.warehouseId,
    warehouseName: reservation.warehouse.name,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
  });
}
