import { Children, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./fx.css";

/** True when the person asked their device for less motion. Effects check it and hold still. */
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * ref for an element, and inView: true once any of it has scrolled onto the screen. It stays true
 * unless once is false. A browser that can't watch for it says true straight away, so nothing
 * that waits on this can stay hidden.
 */
export function useInView<T extends Element = HTMLDivElement>(options: { once?: boolean } = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const once = options.once ?? true;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) io.disconnect();
          } else if (!once) setInView(false);
        }
      },
      // Any part of it counts (a tall section never reaches a share of itself on a short screen),
      // a little above the bottom edge so the movement is seen.
      { threshold: 0, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);
  return { ref, inView };
}

/**
 * True while GoodBuild is taking a picture of the page (it sets data-fx="off" on <html>). Pieces that
 * animate in script, not CSS, use it to show their final state.
 */
export function useFxOff(): boolean {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setOff(root.getAttribute("data-fx") === "off");
    read();
    if (typeof MutationObserver === "undefined") return;
    const watcher = new MutationObserver(read);
    watcher.observe(root, { attributes: true, attributeFilter: ["data-fx"] });
    return () => watcher.disconnect();
  }, []);
  return off;
}

export type RevealFrom = "up" | "down" | "left" | "right" | "scale" | "none";

const FROM: Record<RevealFrom, string> = {
  up: "translate3d(0, 24px, 0)",
  down: "translate3d(0, -24px, 0)",
  left: "translate3d(-32px, 0, 0)",
  right: "translate3d(32px, 0, 0)",
  scale: "scale(0.94)",
  none: "none",
};

/**
 * Fades its children in as they scroll onto the screen, once. from: where they come from
 * ("up" by default). delay and duration are in seconds. blur adds a soft focus-in.
 */
export function Reveal({
  children,
  from = "up",
  delay = 0,
  duration = 0.7,
  blur = false,
  className,
  style,
}: {
  children: ReactNode;
  from?: RevealFrom;
  delay?: number;
  duration?: number;
  blur?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const vars = { "--fx-from": FROM[from], "--fx-delay": delay + "s", "--fx-dur": duration + "s", "--fx-blur": blur ? "blur(10px)" : "none" } as CSSProperties;
  return (
    <div ref={ref} data-shown={inView} className={"fx-reveal" + (className ? " " + className : "")} style={{ ...vars, ...style }}>
      {children}
    </div>
  );
}

/**
 * Reveals each child a moment after the one before it: a row of cards, a list of steps. Each child
 * is wrapped in its own block, so give Stagger the grid or flex classes (className) and it lays the
 * wrapped children out. gap is the seconds between one child and the next.
 */
export function Stagger({
  children,
  gap = 0.08,
  from = "up",
  className,
  itemClassName,
}: {
  children: ReactNode;
  gap?: number;
  from?: RevealFrom;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <div className={className}>
      {Children.toArray(children).map((child, i) => (
        <Reveal key={i} from={from} delay={Math.min(i, 8) * gap} className={itemClassName}>
          {child}
        </Reveal>
      ))}
    </div>
  );
}
