import { prisma } from "@/lib/prisma";
import { expireStaleReservations } from "@/lib/expiry";
import ProductCard from "@/components/ProductCard";
import type { ProductWithStock } from "@/lib/schemas";
import { Decimal } from "@prisma/client/runtime/library";

export const revalidate = 0;

async function getProducts(): Promise<ProductWithStock[]> {
  await expireStaleReservations();

  const products = await prisma.product.findMany({
    include: {
      stock: { include: { warehouse: true }, orderBy: { warehouse: { name: "asc" } } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: (p.price as Decimal).toString(),
    sku: p.sku,
    stock: p.stock.map((s) => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      total: s.total,
      reserved: s.reserved,
      available: Math.max(0, s.total - s.reserved),
    })),
  }));
}

async function getWarehouses() {
  return prisma.warehouse.findMany({ orderBy: { name: "asc" } });
}

export default async function HomePage() {
  const [products, warehouses] = await Promise.all([getProducts(), getWarehouses()]);

  const totalAvailable = products.reduce(
    (sum, p) => sum + p.stock.reduce((s, st) => s + st.available, 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Page header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Product Inventory</h1>
            <p className="mt-2 text-base text-neutral-300">
              Real-time stock across {warehouses.length} warehouses ·{" "}
              <span className="text-emerald-400 font-medium">{totalAvailable} units</span> available
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {warehouses.map((w) => (
              <div
                key={w.id}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-neutral-200 shadow-sm"
              >
                📦 {w.name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product, i) => (
          <div
            key={product.id}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <ProductCard product={product} warehouses={warehouses} />
          </div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-24 text-neutral-500">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm mt-1">Run the seed script to populate inventory.</p>
        </div>
      )}
    </div>
  );
}
