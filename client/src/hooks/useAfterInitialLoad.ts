import { useEffect, useState } from "react";

export function useAfterInitialLoad(delay = 800) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let timeoutId: number | undefined;

    const scheduleReady = () => {
      timeoutId = window.setTimeout(() => setIsReady(true), delay);
    };

    if (document.readyState === "complete") {
      scheduleReady();
    } else {
      window.addEventListener("load", scheduleReady, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleReady);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [delay]);

  return isReady;
}
