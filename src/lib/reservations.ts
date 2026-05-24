import { prisma } from "@/lib/prisma";
import { expireStaleReservations } from "@/lib/expiry";
import type { ReservationListItem } from "@/lib/schemas";

export async function getAllReservations(): Promise<ReservationListItem[]> {
  await expireStaleReservations();

  const reservations = await prisma.reservation.findMany({
    include: {
      product: { select: { name: true } },
      warehouse: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return reservations.map((reservation) => ({
    id: reservation.id,
    productName: reservation.product.name,
    warehouseName: reservation.warehouse.name,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt.toISOString(),
    createdAt: reservation.createdAt.toISOString(),
  }));
}
