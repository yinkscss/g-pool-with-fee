import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * A choice from a list: the browser's own <select>, styled. On a phone it opens the system picker.
 * Use it like a select: <Select value={v} onChange={(e) => setV(e.target.value)}><option value="a">A</option></Select>.
 * Pair it with a Label (htmlFor / id).
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <span className="relative block">
      <select
        ref={ref}
        className={cn("h-9 w-full appearance-none rounded-md border border-border bg-background pl-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </span>
  );
});
