import { prisma } from "./prisma";

/**
 * Releases all PENDING reservations that have passed their expiresAt.
 * Called from:
 *  - GET /api/products (lazy cleanup before returning stock levels)
 *  - Vercel Cron: /api/cron/expire (every minute in production)
 */
export async function expireStaleReservations(): Promise<number> {
  const now = new Date();

  // Find expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    select: { id: true, productId: true, warehouseId: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  // Batch update: mark released and return stock
  await prisma.$transaction([
    prisma.reservation.updateMany({
      where: { id: { in: expired.map((r) => r.id) } },
      data: { status: "RELEASED", releasedAt: now },
    }),
    // Decrement reserved count for each stock row
    ...expired.map((r) =>
      prisma.stock.update({
        where: { productId_warehouseId: { productId: r.productId, warehouseId: r.warehouseId } },
        data: { reserved: { decrement: r.quantity } },
      })
    ),
  ]);

  return expired.length;
}
