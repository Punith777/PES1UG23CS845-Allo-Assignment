"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { ProductWithStock } from "@/lib/schemas";
import { useToast } from "@/components/ui/use-toast";

interface Warehouse {
  id: string;
  name: string;
  location: string;
}

interface Props {
  product: ProductWithStock;
  warehouses: Warehouse[];
}

const stockBadge = (available: number) => {
  if (available === 0) return { label: "Out of stock", cls: "bg-red-500/15 text-red-200 border-red-500/30" };
  if (available <= 3) return { label: `Only ${available} left`, cls: "bg-amber-500/15 text-amber-200 border-amber-500/35" };
  return { label: `${available} available`, cls: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" };
};

export default function ProductCard({ product, warehouses }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    product.stock.find((s) => s.available > 0)?.warehouseId ?? product.stock[0]?.warehouseId ?? ""
  );
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const selectedStock = product.stock.find((s) => s.warehouseId === selectedWarehouseId);
  const maxQty = selectedStock?.available ?? 0;
  const canReserve = maxQty > 0 && quantity > 0 && quantity <= maxQty;

  const handleReserve = async () => {
    if (!canReserve) return;
    setLoading(true);

    try {
      const idempotencyKey = `${product.id}-${selectedWarehouseId}-${Date.now()}`;
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId: selectedWarehouseId,
          quantity,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        toast({
          title: "Not enough stock",
          description: data.error ?? "Someone else just grabbed that stock. Please try a lower quantity.",
          variant: "destructive",
        });
        return;
      }

      if (!res.ok) {
        toast({
          title: "Reservation failed",
          description: data.error ?? "Something went wrong.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to checkout page
      router.push(`/checkout/${data.id}`);
    } catch {
      toast({
        title: "Network error",
        description: "Could not reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-white/15 bg-neutral-900/80 shadow-xl shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-neutral-900">
      {/* Product image */}
      <div className="relative h-44 overflow-hidden bg-neutral-950">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl">📦</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/60 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <span className="rounded bg-black/65 px-2 py-0.5 font-mono text-sm text-neutral-100 ring-1 ring-white/10">
            {product.sku}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Title and price */}
        <div>
          <h2 className="line-clamp-2 text-lg font-semibold leading-tight text-white">{product.name}</h2>
          {product.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-neutral-300">{product.description}</p>
          )}
          <p className="mt-2 text-xl font-bold text-violet-300">
            ₹{Number(product.price).toLocaleString("en-IN")}
          </p>
        </div>

        {/* Warehouse stock badges */}
        <div className="flex flex-wrap gap-1.5">
          {product.stock.map((s) => {
            const badge = stockBadge(s.available);
            return (
              <span
                key={s.warehouseId}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.cls}`}
              >
                {s.warehouseName}: {badge.label}
              </span>
            );
          })}
        </div>

        {/* Warehouse selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-300">Ship from</label>
          <select
            value={selectedWarehouseId}
            onChange={(e) => {
              setSelectedWarehouseId(e.target.value);
              setQuantity(1);
            }}
            className="w-full rounded-lg border border-white/15 bg-neutral-950 px-3 py-2.5 text-base text-white transition-colors focus:border-violet-400 focus:outline-none"
          >
            {product.stock.map((s) => (
              <option key={s.warehouseId} value={s.warehouseId} disabled={s.available === 0} className="bg-neutral-900">
                {warehouses.find((w) => w.id === s.warehouseId)?.name ?? s.warehouseName} —{" "}
                {s.available > 0 ? `${s.available} available` : "Out of stock"}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-300">Quantity</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 text-base font-bold transition hover:bg-white/15 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-9 text-center font-mono text-base text-white">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
              disabled={quantity >= maxQty}
              className="h-9 w-9 rounded-lg border border-white/15 bg-white/10 text-base font-bold transition hover:bg-white/15 disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleReserve}
          disabled={!canReserve || loading}
          className="w-full rounded-xl py-3 text-base font-semibold shadow-lg shadow-violet-950/30 transition-all duration-150
            bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500
            disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Reserving…
            </span>
          ) : maxQty === 0 ? (
            "Out of Stock"
          ) : (
            "Reserve · 10 min hold"
          )}
        </button>
      </div>
    </div>
  );
}
