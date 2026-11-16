import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

interface AccordionState {
  open: string[];
  toggle: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionState | null>(null);
const ItemContext = React.createContext<{ value: string; open: boolean; id: string } | null>(null);

function useItem(part: string) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(ItemContext);
  if (!accordion || !item) throw new Error(part + " must be inside <AccordionItem> inside <Accordion>.");
  return { ...item, toggle: accordion.toggle };
}

/**
 * Sections that open and close: an FAQ, details most people skip. type="single" keeps one open at a
 * time (the default), "multiple" lets several stay open. defaultValue is the value (or values) open at first.
 */
export function Accordion({
  type = "single",
  collapsible = true,
  defaultValue,
  className,
  children,
}: {
  type?: "single" | "multiple";
  /** With type="single": whether the open one can be closed again. */
  collapsible?: boolean;
  defaultValue?: string | string[];
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState<string[]>(() => (defaultValue === undefined ? [] : Array.isArray(defaultValue) ? defaultValue : [defaultValue]));
  const toggle = React.useCallback(
    (value: string) =>
      setOpen((now) => {
        const isOpen = now.includes(value);
        if (type === "multiple") return isOpen ? now.filter((v) => v !== value) : [...now, value];
        return isOpen ? (collapsible ? [] : now) : [value];
      }),
    [type, collapsible],
  );
  const state = React.useMemo(() => ({ open, toggle }), [open, toggle]);
  return (
    <AccordionContext.Provider value={state}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const accordion = React.useContext(AccordionContext);
  const id = React.useId();
  const item = React.useMemo(() => ({ value, open: accordion?.open.includes(value) ?? false, id }), [value, accordion, id]);
  return (
    <ItemContext.Provider value={item}>
      <div className={cn("border-b border-border", className)}>{children}</div>
    </ItemContext.Provider>
  );
}

export function AccordionTrigger({ className, children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const item = useItem("AccordionTrigger");
  return (
    <h3 className="flex">
      <button
        type="button"
        id={item.id + "trigger"}
        aria-expanded={item.open}
        aria-controls={item.id + "panel"}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) item.toggle(item.value);
        }}
        className={cn("flex min-h-11 flex-1 items-center justify-between gap-4 py-3 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40", className)}
      >
        {children}
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", item.open && "rotate-180")} aria-hidden />
      </button>
    </h3>
  );
}

export function AccordionContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const item = useItem("AccordionContent");
  return (
    // Closed content is invisible, not just short, so a link inside it can't be reached by Tab.
    <div
      id={item.id + "panel"}
      role="region"
      aria-labelledby={item.id + "trigger"}
      className={cn("grid transition-[grid-template-rows,visibility] duration-200 motion-reduce:transition-none", item.open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]")}
    >
      <div className="overflow-hidden">
        <div className={cn("pb-4 text-sm text-muted-foreground", className)}>{children}</div>
      </div>
    </div>
  );
}
