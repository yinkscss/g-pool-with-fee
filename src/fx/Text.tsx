import { createElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./fx.css";
import { prefersReducedMotion, useFxOff, useInView } from "./Reveal";

type TextTag = "h1" | "h2" | "h3" | "p" | "span" | "div";

/**
 * A headline that arrives word by word (or letter by letter), each piece fading up out of a blur.
 * Use it once per page, on the hero headline. Screen readers hear the whole sentence once.
 */
export function SplitText({
  text,
  as = "h1",
  by = "word",
  gap = 0.06,
  delay = 0,
  className,
}: {
  text: string;
  as?: TextTag;
  by?: "word" | "letter";
  /** Seconds between one piece and the next. */
  gap?: number;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  const words = text.split(" ");
  let n = 0;
  const piece = (content: string, key: string) => {
    const style = { display: "inline-block", "--fx-delay": delay + Math.min(n++, 40) * gap + "s", "--fx-from": "translate3d(0, 0.35em, 0)", "--fx-blur": "blur(8px)", "--fx-dur": "0.6s" } as CSSProperties;
    return (
      <span key={key} data-shown={inView} className="fx-reveal" style={style}>
        {content}
      </span>
    );
  };
  // A plain space between the words, so the line wraps where a sentence would.
  const children: ReactNode[] = [];
  words.forEach((word, w) => {
    if (w > 0) children.push(" ");
    children.push(
      // Letters stay inside their word, so a line never breaks in the middle of one.
      <span key={w} aria-hidden="true" style={{ display: "inline-block", whiteSpace: "nowrap" }}>
        {by === "letter" ? Array.from(word).map((letter, l) => piece(letter, w + ":" + l)) : piece(word, String(w))}
      </span>,
    );
  });
  return createElement(as, { ref, className, "aria-label": text }, children);
}

/**
 * Text filled with a slow moving gradient. from and to are CSS colours; they default to the theme's
 * accent and primary. For a few words inside a headline, not a paragraph.
 */
export function GradientText({
  children,
  from = "var(--color-accent, #7c3aed)",
  to = "var(--color-primary, #0f172a)",
  seconds = 6,
  className,
}: {
  children: string;
  from?: string;
  to?: string;
  seconds?: number;
  className?: string;
}) {
  const style = { "--fx-a": from, "--fx-b": to, "--fx-dur": seconds + "s" } as CSSProperties;
  return (
    <span className={"fx-gradient-text" + (className ? " " + className : "")} style={style}>
      {children}
    </span>
  );
}

/**
 * One word of a sentence that changes every few seconds: "Save with <RotatingText words={["friends",
 * "family", "your team"]} />". Screen readers get the first word and are not interrupted.
 */
export function RotatingText({ words, seconds = 2.4, className }: { words: string[]; seconds?: number; className?: string }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (words.length < 2 || prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % words.length);
    }, seconds * 1000);
    return () => window.clearInterval(timer);
  }, [words.length, seconds]);
  const word = words[index % Math.max(words.length, 1)] ?? "";
  return (
    <span className={className} aria-label={words[0]}>
      <span key={word} aria-hidden="true" className="fx-rotating">
        {word}
      </span>
    </span>
  );
}

/**
 * A number that counts up to its value when it scrolls onto the screen. Give it a REAL number (from
 * the contract or the app's data), never one made up to look good. format turns the running number
 * into text (for example compact amounts); the default groups thousands.
 */
export function CountUp({
  to,
  from = 0,
  seconds = 1.6,
  decimals = 0,
  prefix = "",
  suffix = "",
  format,
  className,
}: {
  to: number;
  from?: number;
  seconds?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: (value: number) => string;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(from);
  const shown = useRef(from);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion() || seconds <= 0) {
      shown.current = to;
      setValue(to);
      return;
    }
    // From wherever it stands now, so a number that updates later glides instead of restarting.
    const start = shown.current;
    let raf = 0;
    let began = 0;
    const tick = (now: number) => {
      began ||= now;
      const t = Math.min((now - began) / (seconds * 1000), 1);
      const eased = 1 - Math.pow(1 - t, 4);
      shown.current = start + (to - start) * eased;
      setValue(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, seconds]);
  const still = useFxOff();
  const final = format ? format(to) : to.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  // In a picture of the page the number is the real one, not wherever the count had got to.
  const text = still ? final : format ? format(value) : value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }} aria-label={prefix + final + suffix}>
      <span aria-hidden="true">
        {prefix}
        {text}
        {suffix}
      </span>
    </span>
  );
}
