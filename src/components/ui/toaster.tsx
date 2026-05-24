"use client";

import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts
        .filter((t) => t.open)
        .map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border p-4 shadow-lg backdrop-blur transition-all animate-fade-in-up ${
              t.variant === "destructive"
                ? "bg-red-950/90 border-red-500/40 text-red-100"
                : "bg-neutral-900/90 border-white/20 text-white"
            }`}
          >
            {t.title && <p className="font-semibold text-sm">{t.title}</p>}
            {t.description && <p className="text-xs mt-0.5 opacity-80">{t.description}</p>}
          </div>
        ))}
    </div>
  );
}
