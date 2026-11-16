import * as React from "react";
import { cn } from "../../lib/utils";

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function initialsOf(name?: string, address?: string): string {
  if (name?.trim()) {
    const words = name.trim().split(/\s+/);
    return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
  }
  return address ? address.slice(2, 4).toUpperCase() : "";
}

/**
 * A round picture of a person or a wallet. With src it shows the image; without one (or if it fails
 * to load) it shows initials from name, or a colour made from address, the same every time for the
 * same wallet: <Avatar address={account} /> or <Avatar name="Ada Obi" src={url} size={48} />.
 */
export function Avatar({ src, name, address, size = 40, className }: { src?: string; name?: string; address?: string; size?: number; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  const seed = hash((address ?? name ?? "").toLowerCase());
  const hue = seed % 360;
  const label = name ?? (address ? address.slice(0, 6) + "…" + address.slice(-4) : "Avatar");
  const showImage = Boolean(src) && !failed;
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: showImage ? undefined : "linear-gradient(135deg, hsl(" + hue + " 70% 52%), hsl(" + ((hue + 50) % 360) + " 70% 40%))",
      }}
    >
      {showImage ? <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(true)} /> : initialsOf(name, address)}
    </span>
  );
}
