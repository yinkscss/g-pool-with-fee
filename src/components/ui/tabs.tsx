import * as React from "react";
import { cn } from "../../lib/utils";

interface TabsState {
  value: string;
  setValue: (value: string) => void;
  id: string;
}

const TabsContext = React.createContext<TabsState | null>(null);

function useTabs(part: string): TabsState {
  const state = React.useContext(TabsContext);
  if (!state) throw new Error(part + " must be inside <Tabs>.");
  return state;
}

/** Views of one thing that share a place on the page: Buy / Sell, Overview / Activity. Not for pages (use routes). */
export function Tabs({
  value,
  defaultValue = "",
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [inner, setInner] = React.useState(defaultValue);
  const current = value ?? inner;
  const id = React.useId();
  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setInner(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );
  const state = React.useMemo(() => ({ value: current, setValue, id }), [current, setValue, id]);
  return (
    <TabsContext.Provider value={state}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/** The row of tabs. Left and Right arrows move between them, Home and End jump to the ends. */
export function TabsList({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
    if (!tabs.length) return;
    event.preventDefault();
    const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (at + step + tabs.length) % tabs.length;
    tabs[next].focus();
    tabs[next].click();
  };
  return (
    <div role="tablist" onKeyDown={onKeyDown} className={cn("inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1", className)} {...props}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className, children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const tabs = useTabs("TabsTrigger");
  const active = tabs.value === value;
  return (
    <button
      type="button"
      role="tab"
      id={tabs.id + "tab" + value}
      aria-selected={active}
      aria-controls={tabs.id + "panel" + value}
      tabIndex={active ? 0 : -1}
      data-state={active ? "active" : "inactive"}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) tabs.setValue(value);
      }}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** What one tab shows. Only the chosen tab's content is on the page. */
export function TabsContent({ value, className, children, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const tabs = useTabs("TabsContent");
  if (tabs.value !== value) return null;
  return (
    <div role="tabpanel" id={tabs.id + "panel" + value} aria-labelledby={tabs.id + "tab" + value} tabIndex={0} className={cn("mt-4 outline-none", className)} {...props}>
      {children}
    </div>
  );
}
