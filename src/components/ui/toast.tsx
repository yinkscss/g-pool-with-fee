import * as React from "react";
import { createRoot } from "react-dom/client";
import { CheckCircle2, X, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import "./ui.css";

type Tone = "default" | "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  description?: string;
  tone: Tone;
}

export interface ToastOptions {
  description?: string;
  /** Milliseconds before it goes away by itself. 0 keeps it until it is closed. Default 4000. */
  duration?: number;
}

let items: ToastItem[] = [];
let nextId = 1;
let mounted = 0;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function dismiss(id?: number) {
  items = id === undefined ? [] : items.filter((item) => item.id !== id);
  emit();
}

function show(message: string, options: ToastOptions = {}, tone: Tone = "default"): number {
  // No <Toaster /> on the page: put one there, so a toast is never silently lost.
  if (!mounted && typeof document !== "undefined") {
    const host = document.createElement("div");
    document.body.appendChild(host);
    createRoot(host).render(<Toaster />);
    mounted++;
  }
  const item = { id: nextId++, message, description: options.description, tone };
  // Three at most: more than that is noise.
  items = [...items.slice(-2), item];
  emit();
  const duration = options.duration ?? 4000;
  if (duration > 0) window.setTimeout(() => dismiss(item.id), duration);
  return item.id;
}

/**
 * A message that appears for a few seconds and goes: "Copied", "Saved", "Vote sent".
 * toast("Copied"), toast.success("Saved"), toast.error("Couldn't save", { description: "Try again." }).
 * For something the person must read or act on (a failed transaction, a form error) use a Notice
 * on the page instead: a toast is gone before a slow reader has read it.
 */
export const toast = Object.assign((message: string, options?: ToastOptions) => show(message, options), {
  success: (message: string, options?: ToastOptions) => show(message, options, "success"),
  error: (message: string, options?: ToastOptions) => show(message, options, "error"),
  dismiss,
});

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Where toasts appear. Optional: toast() adds one to the page if there is none. */
export function Toaster({ className }: { className?: string }) {
  const list = React.useSyncExternalStore(subscribe, () => items, () => items);
  React.useEffect(() => {
    mounted++;
    return () => {
      mounted--;
    };
  }, []);
  return (
    // At the top on a phone: the bottom corner there belongs to a published app's "Built with GoodBuild"
    // badge and to the thumb. Bottom right on wider screens.
    <div role="region" aria-label="Notifications" aria-live="polite" className={cn("pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-0 sm:top-auto sm:items-end", className)}>
      {list.map((item) => (
        <div key={item.id} role={item.tone === "error" ? "alert" : "status"} className="ui-pop pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-border bg-card p-3 pr-2 text-sm text-foreground shadow-lg">
          {item.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden /> : null}
          {item.tone === "error" ? <XCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> : null}
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.message}</p>
            {item.description ? <p className="mt-0.5 text-muted-foreground">{item.description}</p> : null}
          </div>
          <button type="button" aria-label="Dismiss" onClick={() => dismiss(item.id)} className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40">
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ))}
    </div>
  );
}
