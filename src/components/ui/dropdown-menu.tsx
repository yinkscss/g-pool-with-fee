import * as React from "react";
import { cn } from "../../lib/utils";
import "./ui.css";

interface MenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
  id: string;
  root: React.RefObject<HTMLSpanElement>;
}

const MenuContext = React.createContext<MenuState | null>(null);

function useMenu(part: string): MenuState {
  const state = React.useContext(MenuContext);
  if (!state) throw new Error(part + " must be inside <DropdownMenu>.");
  return state;
}

const focusTrigger = (root: React.RefObject<HTMLSpanElement>) => root.current?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();

/** A short list of actions behind one button: Edit, Share, Disconnect. For a choice of value use Select. */
export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const root = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const state = React.useMemo(() => ({ open, setOpen, id, root }), [open, id]);
  return (
    <MenuContext.Provider value={state}>
      <span ref={root} className="relative inline-block">
        {children}
      </span>
    </MenuContext.Provider>
  );
}

export function DropdownMenuTrigger({ asChild, children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen, id } = useMenu("DropdownMenuTrigger");
  const aria = { "aria-haspopup": "menu" as const, "aria-expanded": open, "aria-controls": open ? id : undefined };
  const keys = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLElement>) => void; onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void }>;
    return React.cloneElement(child, {
      ...aria,
      onKeyDown: keys,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      },
    });
  }
  return (
    <button
      type="button"
      {...aria}
      {...props}
      onKeyDown={keys}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(!open);
      }}
    >
      {children}
    </button>
  );
}

/** The list. Up and Down arrows move through it, Escape closes it and returns to the button. */
export function DropdownMenuContent({ align = "end", className, children }: { align?: "start" | "end"; className?: string; children: React.ReactNode }) {
  const { open, setOpen, id, root } = useMenu("DropdownMenuContent");
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
  }, [open]);
  if (!open) return null;
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'));
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      focusTrigger(root);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (items.length && ["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    }
  };
  return (
    <div
      ref={ref}
      id={id}
      role="menu"
      onKeyDown={onKeyDown}
      className={cn("ui-fade absolute top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-border bg-card p-1 text-foreground shadow-lg", align === "end" ? "right-0" : "left-0", className)}
    >
      {children}
    </div>
  );
}

export function DropdownMenuItem({ onSelect, className, children, ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> & { onSelect?: () => void }) {
  const { setOpen, root } = useMenu("DropdownMenuItem");
  return (
    <button
      type="button"
      role="menuitem"
      {...props}
      onClick={() => {
        setOpen(false);
        focusTrigger(root);
        onSelect?.();
      }}
      className={cn("flex min-h-9 w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-none hover:bg-muted focus:bg-muted disabled:opacity-50", className)}
    >
      {children}
    </button>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-2.5 py-1.5 text-xs font-medium text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div role="separator" className={cn("my-1 h-px bg-border", className)} />;
}
