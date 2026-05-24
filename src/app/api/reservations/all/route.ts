import { NextResponse } from "next/server";
import { getAllReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export async function GET() {
  const reservations = await getAllReservations();

  return NextResponse.json({ reservations });
}
