import * as React from "react";
import { cn } from "../../lib/utils";

/** Grey shimmer block for loading values. Size it with classes: <Skeleton className="h-6 w-24" /> */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
