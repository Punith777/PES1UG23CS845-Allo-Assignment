"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReservationTable from "@/components/reservations/ReservationTable";
import { useToast } from "@/components/ui/use-toast";
import type { ReservationListItem } from "@/lib/schemas";

type StatusFilter = "ALL" | ReservationListItem["status"];

interface Props {
  initialReservations: ReservationListItem[];
}

const filters: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Released", value: "RELEASED" },
];

function getRemainingTime(reservation: ReservationListItem, now: number) {
  if (reservation.status !== "PENDING") return "-";

  const secondsLeft = Math.max(0, Math.floor((new Date(reservation.expiresAt).getTime() - now) / 1000));
  if (secondsLeft === 0) return "Expired";

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ReservationsDashboard({ initialReservations }: Props) {
  const { toast } = useToast();
  const [reservations, setReservations] = useState(initialReservations);
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingById, setActionLoadingById] = useState<Record<string, "confirm" | "cancel" | undefined>>({});
  const [error, setError] = useState<string | null>(null);

  const refreshReservations = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/reservations/all", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not refresh reservations.");

      const data = (await response.json()) as { reservations: ReservationListItem[] };
      setReservations(data.reservations);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh reservations.");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const interval = setInterval(() => {
      if (isMounted) void refreshReservations();
    }, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshReservations]);

  const runReservationAction = useCallback(
    async (reservationId: string, action: "confirm" | "cancel") => {
      setActionLoadingById((current) => ({ ...current, [reservationId]: action }));
      setError(null);

      const endpoint =
        action === "confirm"
          ? `/api/reservations/${reservationId}/confirm`
          : `/api/reservations/${reservationId}/release`;

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers:
            action === "confirm"
              ? { "Idempotency-Key": `admin-confirm-${reservationId}-${Date.now()}` }
              : undefined,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? `Could not ${action} reservation.`);
        }

        toast({
          title: action === "confirm" ? "Purchase confirmed" : "Order cancelled",
          description:
            action === "confirm"
              ? "The reservation is now confirmed and stock was consumed."
              : "The reservation was released and stock returned.",
        });
        await refreshReservations();
      } catch (err) {
        const message = err instanceof Error ? err.message : `Could not ${action} reservation.`;
        setError(message);
        toast({
          title: action === "confirm" ? "Confirmation failed" : "Cancel failed",
          description: message,
          variant: "destructive",
        });
      } finally {
        setActionLoadingById((current) => {
          const next = { ...current };
          delete next[reservationId];
          return next;
        });
      }
    },
    [refreshReservations, toast]
  );

  const filteredReservations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reservations.filter((reservation) => {
      const matchesFilter = filter === "ALL" || reservation.status === filter;
      const matchesSearch =
        term.length === 0 ||
        reservation.productName.toLowerCase().includes(term) ||
        reservation.id.toLowerCase().includes(term);

      return matchesFilter && matchesSearch;
    });
  }, [filter, reservations, search]);

  const counts = useMemo(
    () => ({
      total: reservations.length,
      pending: reservations.filter((reservation) => reservation.status === "PENDING").length,
      confirmed: reservations.filter((reservation) => reservation.status === "CONFIRMED").length,
      released: reservations.filter((reservation) => reservation.status === "RELEASED").length,
    }),
    [reservations]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 animate-fade-in-up">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Reservations</h1>
            <p className="mt-2 text-base text-neutral-300">
              Monitor reserved inventory in real time across every warehouse.
            </p>
          </div>
          <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-neutral-300 shadow-sm">
            {isRefreshing ? "Refreshing..." : "Auto-refreshes every 10s"}
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-white/15 bg-neutral-900/80 p-4 shadow-lg shadow-black/15">
          <p className="text-sm text-neutral-300">Total</p>
          <p className="mt-1 font-mono text-3xl font-bold">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 shadow-lg shadow-black/15">
          <p className="text-sm text-yellow-200">Pending</p>
          <p className="mt-1 font-mono text-3xl font-bold text-yellow-300">{counts.pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-lg shadow-black/15">
          <p className="text-sm text-emerald-200">Confirmed</p>
          <p className="mt-1 font-mono text-3xl font-bold text-emerald-300">{counts.confirmed}</p>
        </div>
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 shadow-lg shadow-black/15">
          <p className="text-sm text-red-200">Released</p>
          <p className="mt-1 font-mono text-3xl font-bold text-red-300">{counts.released}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/15 bg-neutral-900/80 p-3 shadow-lg shadow-black/15 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`rounded-full border px-4 py-2 text-base font-medium transition-colors ${
                filter === item.value
                  ? "border-violet-400/50 bg-violet-500/25 text-white shadow-sm shadow-violet-950/40"
                  : "border-white/15 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product or reservation ID..."
          className="h-12 w-full rounded-xl border border-white/15 bg-neutral-950 px-4 text-base text-white outline-none transition-colors placeholder:text-neutral-500 focus:border-violet-400 md:max-w-sm"
        />
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {isRefreshing && reservations.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-neutral-900/80 p-10 text-center text-neutral-300">
          Loading reservations...
        </div>
      ) : filteredReservations.length > 0 ? (
        <ReservationTable
          actionLoadingById={actionLoadingById}
          reservations={filteredReservations}
          getRemainingTime={(reservation) => getRemainingTime(reservation, now)}
          onCancel={(reservationId) => void runReservationAction(reservationId, "cancel")}
          onConfirm={(reservationId) => void runReservationAction(reservationId, "confirm")}
        />
      ) : (
        <div className="rounded-2xl border border-white/15 bg-neutral-900/80 p-12 text-center">
          <p className="text-lg font-semibold">No reservations found</p>
          <p className="mt-1 text-sm text-neutral-500">
            Try a different filter or search term.
          </p>
        </div>
      )}
    </div>
  );
}
