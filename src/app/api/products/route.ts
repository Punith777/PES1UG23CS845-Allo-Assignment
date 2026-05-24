import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { expireStaleReservations } from "@/lib/expiry";
import type { ProductWithStock } from "@/lib/schemas";

export const revalidate = 0; // no caching for stock levels

export async function GET() {
  // Lazy cleanup: release expired reservations before reporting stock
  await expireStaleReservations();

  const products = await prisma.product.findMany({
    include: {
      stock: {
        include: { warehouse: true },
        orderBy: { warehouse: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  const response: ProductWithStock[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price.toString(),
    sku: p.sku,
    stock: p.stock.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      total: s.total,
      reserved: s.reserved,
      available: Math.max(0, s.total - s.reserved),
    })),
  }));

  return NextResponse.json(response);
}
