import * as React from "react";
import { cn } from "../../lib/utils";
import "./ui.css";

const sides = {
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
  left: "right-full top-1/2 mr-2 -translate-y-1/2",
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
};

/**
 * A short hint for the thing it wraps, shown on hover and on keyboard focus:
 * <Tooltip content="Copy address"><button>...</button></Tooltip>. Phones have no hover, so never put
 * something a person needs only in a tooltip, and give an icon-only button an aria-label as well.
 */
export function Tooltip({ content, side = "top", className, children }: { content: React.ReactNode; side?: keyof typeof sides; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const child = React.isValidElement(children) ? React.cloneElement(children as React.ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": open ? id : undefined }) : children;
  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {child}
      {open ? (
        <span id={id} role="tooltip" className={cn("ui-fade pointer-events-none absolute z-50 w-max max-w-[14rem] rounded-md bg-foreground px-2 py-1 text-xs text-background shadow", sides[side], className)}>
          {content}
        </span>
      ) : null}
    </span>
  );
}
