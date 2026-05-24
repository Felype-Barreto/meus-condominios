"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "neutral";
type ToastItem = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

declare global {
  interface WindowEventMap {
    "morai:toast": CustomEvent<Omit<ToastItem, "id">>;
  }
}

const toneStyles: Record<ToastTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  error: "border-destructive/25 bg-destructive/10 text-destructive",
  neutral: "border-border bg-card text-foreground",
};

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(event: WindowEventMap["morai:toast"]) {
      const id = Date.now();
      setToasts((current) => [...current.slice(-2), { id, ...event.detail }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, 3600);
    }

    window.addEventListener("morai:toast", onToast);
    return () => window.removeEventListener("morai:toast", onToast);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] z-[60] space-y-2 sm:left-auto sm:right-4 sm:bottom-4 sm:w-96 lg:bottom-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "rounded-xl border p-4 text-sm shadow-xl shadow-black/10",
            toneStyles[toast.tone],
          )}
        >
          <p className="font-semibold">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 leading-5 opacity-80">{toast.description}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function showAppToast(detail: Omit<ToastItem, "id">) {
  window.dispatchEvent(new CustomEvent("morai:toast", { detail }));
}
