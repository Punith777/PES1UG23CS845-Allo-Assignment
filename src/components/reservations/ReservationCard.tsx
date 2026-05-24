"use client";

import StatusBadge from "@/components/reservations/StatusBadge";
import type { ReservationListItem } from "@/lib/schemas";

interface Props {
  reservation: ReservationListItem;
  remainingTime: string;
  actionLoading: "confirm" | "cancel" | null;
  onCancel: (reservationId: string) => void;
  onConfirm: (reservationId: string) => void;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export default function ReservationCard({
  reservation,
  remainingTime,
  actionLoading,
  onCancel,
  onConfirm,
}: Props) {
  const isPending = reservation.status === "PENDING";

  return (
    <article className="animate-fade-in-up rounded-2xl border border-white/15 bg-neutral-900/85 p-4 shadow-xl shadow-black/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm text-neutral-300">{reservation.id}</p>
          <h3 className="mt-1 text-lg font-semibold leading-tight">{reservation.productName}</h3>
          <p className="mt-1 text-base text-neutral-300">{reservation.warehouseName}</p>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-sm text-neutral-400">Quantity</p>
          <p className="mt-1 font-mono text-white">{reservation.quantity}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-400">Remaining</p>
          <p className="mt-1 font-mono font-semibold text-white">{remainingTime}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-400">Created</p>
          <p className="mt-1 text-neutral-200">{formatDateTime(reservation.createdAt)}</p>
        </div>
        <div>
          <p className="text-sm text-neutral-400">Expires</p>
          <p className="mt-1 text-neutral-200">{formatDateTime(reservation.expiresAt)}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {isPending ? (
          <>
            <button
              type="button"
              onClick={() => onConfirm(reservation.id)}
              disabled={actionLoading !== null}
              className="h-10 flex-1 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white shadow-md shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {actionLoading === "confirm" ? "Confirming..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => onCancel(reservation.id)}
              disabled={actionLoading !== null}
              className="h-10 flex-1 rounded-lg border border-red-400/45 bg-red-500/15 px-3 text-sm font-bold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              {actionLoading === "cancel" ? "Cancelling..." : "Cancel"}
            </button>
          </>
        ) : (
          <span className="text-xs text-neutral-600">No actions available</span>
        )}
      </div>
    </article>
  );
}
