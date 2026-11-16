import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import "./fx.css";
import { prefersReducedMotion } from "./Reveal";

/**
 * A card with a soft light that follows the pointer. Put the card's own classes in className
 * (rounded-2xl border border-border bg-card p-6). glow is a CSS colour; it defaults to a faint accent.
 */
export function SpotlightCard({
  children,
  className,
  glow = "color-mix(in srgb, var(--color-accent, #7c3aed) 22%, transparent)",
  size = 320,
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
  size?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--fx-x", e.clientX - box.left + "px");
    el.style.setProperty("--fx-y", e.clientY - box.top + "px");
  };
  const style = { "--fx-glow": glow, "--fx-size": size + "px" } as CSSProperties;
  return (
    <div ref={ref} onPointerMove={move} className={"fx-spotlight" + (className ? " " + className : "")} style={style}>
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

/**
 * A card that leans toward the pointer. For one or two showcase pieces (a product shot, an NFT, a
 * membership card), not a whole grid. It stays flat on touch screens. max is the lean in degrees.
 */
export function TiltCard({ children, className, max = 8 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const box = el.getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width - 0.5;
    const y = (e.clientY - box.top) / box.height - 0.5;
    el.style.setProperty("--fx-ry", x * 2 * max + "deg");
    el.style.setProperty("--fx-rx", -y * 2 * max + "deg");
  };
  const rest = () => {
    ref.current?.style.setProperty("--fx-ry", "0deg");
    ref.current?.style.setProperty("--fx-rx", "0deg");
  };
  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={rest} className={"fx-tilt" + (className ? " " + className : "")}>
      {children}
    </div>
  );
}

/**
 * Pulls what is inside it a little toward the pointer: wrap the page's ONE main button in it.
 * strength is how far it follows, from 0 to 1.
 */
export function Magnetic({ children, strength = 0.3, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const move = (e: PointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const box = el.getBoundingClientRect();
    el.style.setProperty("--fx-mx", (e.clientX - (box.left + box.width / 2)) * strength + "px");
    el.style.setProperty("--fx-my", (e.clientY - (box.top + box.height / 2)) * strength + "px");
  };
  const rest = () => {
    ref.current?.style.setProperty("--fx-mx", "0px");
    ref.current?.style.setProperty("--fx-my", "0px");
  };
  return (
    <span ref={ref} onPointerMove={move} onPointerLeave={rest} className={"fx-magnetic" + (className ? " " + className : "")}>
      {children}
    </span>
  );
}

/**
 * A row that scrolls sideways for ever: names, features, tags, or the user's own uploaded logos.
 * Never invent partner or customer logos to fill it. seconds is one full pass; hover pauses it.
 */
export function Marquee({
  children,
  seconds = 30,
  reverse = false,
  pauseOnHover = true,
  gap = "3rem",
  className,
}: {
  children: ReactNode;
  seconds?: number;
  reverse?: boolean;
  pauseOnHover?: boolean;
  gap?: string;
  className?: string;
}) {
  const style = { "--fx-dur": seconds + "s", "--fx-gap": gap } as CSSProperties;
  return (
    <div className={"fx-marquee" + (className ? " " + className : "")} data-reverse={reverse} data-pause={pauseOnHover} style={style}>
      <div className="fx-marquee-track">{children}</div>
      {/* The second copy makes the loop seamless; screen readers hear the row once. */}
      <div className="fx-marquee-track" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}
