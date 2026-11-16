import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import "./ui.css";

interface ModalState {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const ModalContext = React.createContext<ModalState | null>(null);

export function useModal(part: string): ModalState {
  const state = React.useContext(ModalContext);
  if (!state) throw new Error(part + " must be inside <Dialog> or <Sheet>.");
  return state;
}

export interface ModalRootProps {
  /** Controlled: pass open and onOpenChange. Leave both out and the trigger opens it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

/** A window over the page for one focused task: confirm, a short form, details. Not for a whole page. */
export function Dialog({ open, defaultOpen = false, onOpenChange, children }: ModalRootProps) {
  const [inner, setInner] = React.useState(defaultOpen);
  const isOpen = open ?? inner;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setInner(next);
      onOpenChange?.(next);
    },
    [open, onOpenChange],
  );
  const id = React.useId();
  const state = React.useMemo(() => ({ open: isOpen, setOpen, titleId: id + "title", descriptionId: id + "description" }), [isOpen, setOpen, id]);
  return <ModalContext.Provider value={state}>{children}</ModalContext.Provider>;
}

type TriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Use the child (a Button, say) as the trigger instead of wrapping it in another button. */
  asChild?: boolean;
};

/** Opens (or with close, closes) the dialog it is inside. */
function ModalButton({ asChild, children, onClick, to, part, ...props }: TriggerProps & { to: boolean; part: string }) {
  const { open, setOpen } = useModal(part);
  const expanded = to ? { "aria-haspopup": "dialog" as const, "aria-expanded": open } : {};
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent<HTMLElement>) => void }>;
    return React.cloneElement(child, {
      ...expanded,
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        child.props.onClick?.(event);
        if (!event.defaultPrevented) setOpen(to);
      },
    });
  }
  return (
    <button
      type="button"
      {...expanded}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setOpen(to);
      }}
    >
      {children}
    </button>
  );
}

export function DialogTrigger(props: TriggerProps) {
  return <ModalButton {...props} to={true} part="DialogTrigger" />;
}

export function DialogClose(props: TriggerProps) {
  return <ModalButton {...props} to={false} part="DialogClose" />;
}

/**
 * The surface both Dialog and Sheet draw on: the browser's own modal <dialog>. It keeps focus inside,
 * closes on Escape or a tap outside, stops the page behind from scrolling, and gives focus back.
 */
export function ModalSurface({ className, children, showClose = true, part = "DialogContent" }: { className?: string; children: React.ReactNode; showClose?: boolean; part?: string }) {
  const { open, setOpen, titleId, descriptionId } = useModal(part);
  const ref = React.useRef<HTMLDialogElement>(null);
  const pressedOutside = React.useRef(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!open) {
      if (el.open) el.close();
      return;
    }
    if (!el.open) {
      try {
        el.showModal();
      } catch {
        // A very old browser: show it in place, without the backdrop.
        el.setAttribute("open", "");
      }
    }
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Escape: the browser asks to close. Say so to whoever holds the state.
      onCancel={(event) => {
        event.preventDefault();
        setOpen(false);
      }}
      onClose={() => {
        if (open) setOpen(false);
      }}
      // A tap on the dimmed page lands on the dialog element itself, never on what is inside it. Both the
      // press and the release must be out there, so dragging to select text inside doesn't close it.
      onPointerDown={(event) => {
        pressedOutside.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && pressedOutside.current) setOpen(false);
      }}
      className={cn("ui-modal fixed inset-0 overflow-y-auto border border-border bg-card p-0 text-foreground shadow-xl outline-none", className)}
    >
      {open ? (
        <div className="relative flex min-h-full flex-col gap-4 p-6">
          {children}
          {showClose ? (
            <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="absolute right-3 top-3 grid size-9 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40">
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}

/** What the dialog shows. Give it a DialogTitle: screen readers announce the dialog by it. */
export function DialogContent({ className, children, showClose }: { className?: string; children: React.ReactNode; showClose?: boolean }) {
  return (
    <ModalSurface showClose={showClose} className={cn("ui-pop m-auto max-h-[85vh] w-[calc(100%-2rem)] max-w-md rounded-xl", className)}>
      {children}
    </ModalSurface>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 pr-8", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  const { titleId } = useModal("DialogTitle");
  return <h2 id={titleId} className={cn("text-lg font-semibold leading-tight", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId } = useModal("DialogDescription");
  return <p id={descriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

/** The buttons at the bottom: stacked on a phone with the main one first, in a row on wider screens. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />;
}
