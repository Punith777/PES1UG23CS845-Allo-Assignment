"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";

interface ReservationData {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  productPrice: string;
  warehouseId: string;
  warehouseName: string;
  warehouseLocation: string;
  quantity: number;
  status: "PENDING" | "CONFIRMED" | "RELEASED";
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

interface Props {
  initialData: ReservationData;
}

function useCountdown(expiresAt: string, status: "PENDING" | "CONFIRMED" | "RELEASED") {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  );

  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    }, 500);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return { secondsLeft, minutes, seconds };
}

const StatusBanner = ({ status }: { status: ReservationData["status"] }) => {
  if (status === "CONFIRMED") {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center animate-fade-in-up">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-2xl font-bold text-emerald-400">Order Confirmed!</h2>
        <p className="text-neutral-400 text-sm mt-2">
          Your payment was accepted and the items are reserved for you.
        </p>
      </div>
    );
  }
  if (status === "RELEASED") {
    return (
      <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-6 text-center animate-fade-in-up">
        <div className="text-5xl mb-3">❌</div>
        <h2 className="text-2xl font-bold text-red-400">Reservation Released</h2>
        <p className="text-neutral-400 text-sm mt-2">
          This reservation was cancelled or expired. The stock is now available again.
        </p>
      </div>
    );
  }
  return null;
};

export default function CheckoutClient({ initialData }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [reservation, setReservation] = useState(initialData);
  const [loading, setLoading] = useState<"confirm" | "cancel" | null>(null);
  const expiredToastShown = useRef(false);

  const { secondsLeft, minutes, seconds } = useCountdown(reservation.expiresAt, reservation.status);

  const isUrgent = secondsLeft <= 60 && secondsLeft > 0 && reservation.status === "PENDING";
  const hasExpiredLocally = secondsLeft === 0 && reservation.status === "PENDING";

  // Poll for status updates (e.g. server-side expiry) every 5s if pending
  const pollStatus = useCallback(async () => {
    if (reservation.status !== "PENDING") return;
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.status !== reservation.status) {
          setReservation((prev) => ({ ...prev, status: data.status, releasedAt: data.releasedAt }));
        }
      }
    } catch {
      // ignore
    }
  }, [reservation.id, reservation.status]);

  useEffect(() => {
    const interval = setInterval(pollStatus, 5000);
    return () => clearInterval(interval);
  }, [pollStatus]);

  // Show expired toast once
  useEffect(() => {
    if (hasExpiredLocally && !expiredToastShown.current) {
      expiredToastShown.current = true;
      toast({
        title: "Reservation expired",
        description: "Your 10-minute hold has ended. The stock has been released.",
        variant: "destructive",
      });
    }
  }, [hasExpiredLocally, toast]);

  const handleConfirm = async () => {
    if (hasExpiredLocally) {
      toast({ title: "Reservation expired", description: "Please go back and start a new checkout.", variant: "destructive" });
      return;
    }
    setLoading("confirm");
    try {
      const idempotencyKey = `confirm-${reservation.id}-${Date.now()}`;
      const res = await fetch(`/api/reservations/${reservation.id}/confirm`, {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
      });
      const data = await res.json();

      if (res.status === 410) {
        toast({ title: "Reservation expired", description: data.error, variant: "destructive" });
        setReservation((prev) => ({ ...prev, status: "RELEASED" }));
        return;
      }

      if (!res.ok) {
        toast({ title: "Confirmation failed", description: data.error ?? "Something went wrong.", variant: "destructive" });
        return;
      }

      setReservation((prev) => ({
        ...prev,
        status: "CONFIRMED",
        confirmedAt: data.confirmedAt,
      }));
      toast({ title: "Payment confirmed!", description: "Your order is placed." });
    } finally {
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading("cancel");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}/release`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Could not cancel", description: data.error, variant: "destructive" });
        return;
      }

      setReservation((prev) => ({
        ...prev,
        status: "RELEASED",
        releasedAt: data.releasedAt,
      }));
      toast({ title: "Reservation cancelled", description: "Units returned to inventory." });
    } finally {
      setLoading(null);
    }
  };

  const totalPrice = Number(reservation.productPrice) * reservation.quantity;
  const isPending = reservation.status === "PENDING";

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg space-y-5">
        {/* Back */}
        <button
          onClick={() => router.push("/")}
          className="text-neutral-500 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Back to products
        </button>

        {/* Status banner */}
        {reservation.status !== "PENDING" && <StatusBanner status={reservation.status} />}

        {/* Main card */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden animate-fade-in-up animate-delay-100">
          {/* Product info */}
          <div className="flex gap-4 p-5 border-b border-white/10">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-neutral-900 flex-shrink-0">
              {reservation.productImageUrl ? (
                <Image
                  src={reservation.productImageUrl}
                  alt={reservation.productName}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-2xl">📦</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-base leading-tight">{reservation.productName}</h2>
              <p className="text-neutral-400 text-xs mt-1">
                Ships from <span className="text-white">{reservation.warehouseName}</span>
                <br />
                <span className="text-neutral-600">{reservation.warehouseLocation}</span>
              </p>
              <p className="text-violet-400 font-bold mt-2">
                ₹{Number(reservation.productPrice).toLocaleString("en-IN")} × {reservation.quantity}
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="p-5 space-y-3 border-b border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Subtotal</span>
              <span>₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Shipping</span>
              <span className="text-emerald-400">Free</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Reservation ID</span>
              <span className="font-mono text-xs text-neutral-500 truncate max-w-32">{reservation.id}</span>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-violet-400">₹{totalPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Countdown */}
          {isPending && (
            <div className={`p-5 flex items-center justify-between border-b border-white/10 ${isUrgent ? "countdown-urgent" : ""}`}>
              <div>
                <p className="text-xs text-neutral-400 font-medium">Hold expires in</p>
                <p className={`text-3xl font-mono font-bold mt-0.5 ${
                  hasExpiredLocally ? "text-red-400" :
                  isUrgent ? "text-amber-400" : "text-white"
                }`}>
                  {hasExpiredLocally ? "EXPIRED" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
                </p>
              </div>
              {/* Radial progress ring */}
              <svg width="56" height="56" viewBox="0 0 56 56" className="rotate-[-90deg]">
                <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="22"
                  fill="none"
                  stroke={hasExpiredLocally ? "#f87171" : isUrgent ? "#fbbf24" : "#a78bfa"}
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={`${2 * Math.PI * 22 * (1 - secondsLeft / 600)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />
              </svg>
            </div>
          )}

          {/* Confirmed / Released timestamps */}
          {reservation.status === "CONFIRMED" && reservation.confirmedAt && (
            <div className="px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/20">
              <p className="text-xs text-emerald-400">
                Confirmed at {new Date(reservation.confirmedAt).toLocaleTimeString()}
              </p>
            </div>
          )}
          {reservation.status === "RELEASED" && reservation.releasedAt && (
            <div className="px-5 py-3 bg-red-500/5 border-b border-red-500/20">
              <p className="text-xs text-red-400">
                Released at {new Date(reservation.releasedAt).toLocaleTimeString()}
              </p>
            </div>
          )}

          {/* CTA buttons */}
          <div className="p-5 space-y-3">
            {isPending && (
              <>
                <button
                  onClick={handleConfirm}
                  disabled={loading !== null || hasExpiredLocally}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-all
                    bg-violet-600 hover:bg-violet-500 disabled:bg-neutral-800 disabled:text-neutral-500
                    disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  {loading === "confirm" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Processing…
                    </span>
                  ) : hasExpiredLocally ? (
                    "Reservation expired"
                  ) : (
                    "Confirm purchase"
                  )}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading !== null}
                  className="w-full py-2.5 rounded-xl font-medium text-sm border border-white/10
                    text-neutral-400 hover:text-white hover:border-white/20 transition-all
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading === "cancel" ? "Cancelling…" : "Cancel reservation"}
                </button>
              </>
            )}

            {reservation.status !== "PENDING" && (
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 transition border border-white/10"
              >
                Browse more products
              </button>
            )}
          </div>
        </div>

        {/* Info note */}
        {isPending && !hasExpiredLocally && (
          <p className="text-center text-xs text-neutral-600 animate-fade-in-up animate-delay-200">
            Units are held for 10 minutes. Unclaimed holds are released automatically.
          </p>
        )}
      </div>
    </div>
  );
}
