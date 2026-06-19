"use client"

import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={`${toast.title}-${toast.description}`}
          className={`pointer-events-auto p-4 rounded-lg shadow-lg text-white ${
            toast.variant === "destructive"
              ? "bg-red-500"
              : "bg-green-500"
          }`}
        >
          {toast.title && <div className="font-semibold">{toast.title}</div>}
          {toast.description && (
            <div className="text-sm">{toast.description}</div>
          )}
        </div>
      ))}
    </div>
  );
}