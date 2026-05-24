import { z } from "zod";

export const ReserveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive().max(100),
});

export const ConfirmSchema = z.object({
  id: z.string().min(1),
});

export const ReleaseSchema = z.object({
  id: z.string().min(1),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;

// API response types
export interface ProductWithStock {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: string;
  sku: string;
  stock: {
    warehouseId: string;
    warehouseName: string;
    total: number;
    reserved: number;
    available: number;
  }[];
}

export interface WarehouseResponse {
  id: string;
  name: string;
  location: string;
}

export interface ReservationResponse {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface ReservationListItem {
  id: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  createdAt: string;
}
