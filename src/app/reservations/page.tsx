import ReservationsDashboard from "@/components/reservations/ReservationsDashboard";
import { getAllReservations } from "@/lib/reservations";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  const reservations = await getAllReservations();

  return <ReservationsDashboard initialReservations={reservations} />;
}
