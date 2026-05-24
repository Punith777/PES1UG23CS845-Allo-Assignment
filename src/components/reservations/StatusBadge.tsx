import type { ReservationListItem } from "@/lib/schemas";

const statusStyles: Record<ReservationListItem["status"], string> = {
  PENDING: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  CONFIRMED: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  RELEASED: "border-red-500/30 bg-red-500/10 text-red-300",
};

export default function StatusBadge({ status }: { status: ReservationListItem["status"] }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
