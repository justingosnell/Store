import { useState, useCallback } from "react";

export type ToastActionElement = React.ReactNode;

export interface Toast {
  open: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
}

const TOAST_LIMIT = 1;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (props: Omit<Toast, "open">) => {
      const id = new Date().getTime();

      const newToast: Toast = {
        open: true,
        ...props,
      };

      setToasts((prevToasts) => {
        const updated = [newToast, ...prevToasts].slice(0, TOAST_LIMIT);
        return updated;
      });

      // Auto dismiss after 3 seconds
      setTimeout(() => {
        setToasts((prevToasts) =>
          prevToasts.filter((t) => !(t.title === props.title && t.description === props.description))
        );
      }, 3000);
    },
    []
  );

  return { toasts, toast };
}