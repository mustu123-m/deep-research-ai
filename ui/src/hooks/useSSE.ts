import { useEffect, useRef } from "react";
import { createEventSource } from "@/lib/api";

type SSEHandlers = {
  onStart?:     (data: any) => void;
  onNodeStart?: (data: any) => void;
  onNodeEnd?:   (data: any) => void;
  onDone?:      (data: any) => void;
  onError?:     (data: any) => void;
};

export function useSSE(runId: string | null, handlers: SSEHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!runId) return;

    let es: EventSource | null = null;
    let cancelled = false;

    // createEventSource is async because it needs to read the token
    // we must await it before calling addEventListener
    createEventSource(runId).then((eventSource) => {
      if (cancelled) {
        eventSource.close();
        return;
      }

      es = eventSource;

      const on = (event: string, key: keyof SSEHandlers) => {
        es!.addEventListener(event, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            handlersRef.current[key]?.(data);
          } catch {
            handlersRef.current[key]?.(e.data);
          }
        });
      };

      on("start",      "onStart");
      on("node_start", "onNodeStart");
      on("node_end",   "onNodeEnd");
      on("done",       "onDone");
      on("error",      "onError");
    });

    return () => {
      cancelled = true;
      es?.close();
    };
  }, [runId]);
}