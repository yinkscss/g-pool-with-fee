import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * An on/off setting that takes effect at once: <Switch checked={on} onCheckedChange={setOn} aria-label="Show closed votes" />.
 * Give it a visible Label (htmlFor / id) or an aria-label. For a choice sent with a form, use a checkbox.
 */
export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  className,
  onClick,
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & { checked?: boolean; defaultChecked?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  const [inner, setInner] = React.useState(defaultChecked);
  const on = checked ?? inner;
  return (
    <button
      type="button"
      {...props}
      role="switch"
      aria-checked={on}
      data-state={on ? "checked" : "unchecked"}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (checked === undefined) setInner(!on);
        onCheckedChange?.(!on);
      }}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50",
        on ? "bg-primary" : "bg-border",
        className,
      )}
    >
      <span className={cn("inline-block size-5 rounded-full bg-background shadow transition-transform", on ? "translate-x-[22px]" : "translate-x-0.5")} />
    </button>
  );
}
