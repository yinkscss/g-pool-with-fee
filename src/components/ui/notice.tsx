import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const tones = {
  info: { box: "bg-accent/5 text-foreground", icon: Info, iconClass: "text-accent" },
  success: { box: "bg-success/10 text-foreground", icon: CheckCircle2, iconClass: "text-success" },
  warning: { box: "bg-warning/10 text-foreground", icon: AlertTriangle, iconClass: "text-warning" },
  danger: { box: "bg-danger/10 text-foreground", icon: XCircle, iconClass: "text-danger" },
};

/** Inline message: errors, success after a transaction, "deploy to go live" hints. */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof tones;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-lg p-4 text-sm", t.box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", t.iconClass)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="break-words text-muted-foreground">{children}</div>}
      </div>
      {action}
    </div>
  );
}
