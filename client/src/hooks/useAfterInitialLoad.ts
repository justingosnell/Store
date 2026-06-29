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

export function useAfterInitialLoadOrInteraction(delay = 4500) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isReady) return;

    let timeoutId: number | undefined;
    const events: Array<keyof WindowEventMap> = ["click", "keydown", "pointerdown", "scroll", "touchstart"];

    const markReady = () => {
      setIsReady(true);
    };

    const scheduleReady = () => {
      timeoutId = window.setTimeout(markReady, delay);
    };

    events.forEach((eventName) => window.addEventListener(eventName, markReady, { once: true, passive: true }));

    if (document.readyState === "complete") {
      scheduleReady();
    } else {
      window.addEventListener("load", scheduleReady, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleReady);
      events.forEach((eventName) => window.removeEventListener(eventName, markReady));
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [delay, isReady]);

  return isReady;
}
