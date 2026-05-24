"use client";

import ReservationCard from "@/components/reservations/ReservationCard";
import StatusBadge from "@/components/reservations/StatusBadge";
import type { ReservationListItem } from "@/lib/schemas";

interface Props {
  reservations: ReservationListItem[];
  actionLoadingById: Record<string, "confirm" | "cancel" | undefined>;
  getRemainingTime: (reservation: ReservationListItem) => string;
  onCancel: (reservationId: string) => void;
  onConfirm: (reservationId: string) => void;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ReservationTable({
  reservations,
  actionLoadingById,
  getRemainingTime,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-white/15 bg-neutral-900/85 shadow-xl shadow-black/20 lg:block">
        <table className="w-full table-fixed text-left text-base">
          <thead className="border-b border-white/10 bg-white/[0.06] text-sm uppercase tracking-wide text-neutral-400">
            <tr>
              <th className="w-[13%] px-4 py-3 font-medium">Reservation ID</th>
              <th className="w-[16%] px-4 py-3 font-medium">Product</th>
              <th className="w-[13%] px-4 py-3 font-medium">Warehouse</th>
              <th className="w-[4%] px-3 py-3 font-medium">Qty</th>
              <th className="w-[8%] px-4 py-3 font-medium">Status</th>
              <th className="w-[10%] px-4 py-3 font-medium">Created</th>
              <th className="w-[10%] px-4 py-3 font-medium">Expiry</th>
              <th className="w-[7%] px-4 py-3 font-medium">Remaining</th>
              <th className="w-[19%] px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {reservations.map((reservation) => {
              const actionLoading = actionLoadingById[reservation.id];
              const isPending = reservation.status === "PENDING";

              return (
                <tr key={reservation.id} className="transition-colors hover:bg-white/[0.05]">
                  <td className="px-4 py-4">
                    <span className="block truncate font-mono text-sm text-neutral-300">{reservation.id}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block truncate font-medium text-white">{reservation.productName}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="block truncate text-neutral-200">{reservation.warehouseName}</span>
                  </td>
                  <td className="px-3 py-4 font-mono text-neutral-100">{reservation.quantity}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={reservation.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-neutral-300">{formatDateTime(reservation.createdAt)}</td>
                  <td className="px-4 py-4 text-sm text-neutral-300">{formatDateTime(reservation.expiresAt)}</td>
                  <td className="px-4 py-4 font-mono text-sm font-semibold text-white">{getRemainingTime(reservation)}</td>
                  <td className="px-4 py-4">
                    {isPending ? (
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onConfirm(reservation.id)}
                          disabled={actionLoading !== undefined}
                          className="h-10 min-w-[88px] rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white shadow-md shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                        >
                          {actionLoading === "confirm" ? "Saving" : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onCancel(reservation.id)}
                          disabled={actionLoading !== undefined}
                          className="h-10 min-w-[84px] rounded-lg border border-red-400/45 bg-red-500/15 px-3 text-sm font-bold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-neutral-800 disabled:text-neutral-500"
                        >
                          {actionLoading === "cancel" ? "Saving" : "Cancel"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-600">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
        {reservations.map((reservation) => (
          <ReservationCard
            key={reservation.id}
            actionLoading={actionLoadingById[reservation.id] ?? null}
            reservation={reservation}
            remainingTime={getRemainingTime(reservation)}
            onCancel={onCancel}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </>
  );
}
