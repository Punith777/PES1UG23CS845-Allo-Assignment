import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CheckoutClient from "@/components/CheckoutClient";
import { Decimal } from "@prisma/client/runtime/library";

interface Props {
  params: Promise<{ id: string }>;
}

async function getReservation(id: string) {
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: {
      product: true,
      warehouse: true,
    },
  });
  return reservation;
}

export default async function CheckoutPage({ params }: Props) {
  const { id } = await params;
  const reservation = await getReservation(id);

  if (!reservation) notFound();

  // Serialize for client
  const data = {
    id: reservation.id,
    productId: reservation.productId,
    productName: reservation.product.name,
    productImageUrl: reservation.product.imageUrl,
    productPrice: (reservation.product.price as Decimal).toString(),
    warehouseId: reservation.warehouseId,
    warehouseName: reservation.warehouse.name,
    warehouseLocation: reservation.warehouse.location,
    quantity: reservation.quantity,
    status: reservation.status as "PENDING" | "CONFIRMED" | "RELEASED",
    expiresAt: reservation.expiresAt.toISOString(),
    confirmedAt: reservation.confirmedAt?.toISOString() ?? null,
    releasedAt: reservation.releasedAt?.toISOString() ?? null,
    createdAt: reservation.createdAt.toISOString(),
  };

  return <CheckoutClient initialData={data} />;
}
