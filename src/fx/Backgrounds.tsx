import type { CSSProperties } from "react";
import "./fx.css";

/**
 * Soft blurred colour that drifts slowly behind a hero or a call-to-action band. Put it first inside
 * a section that has "relative overflow-hidden", and give the content after it "relative". colors are
 * up to three CSS colours; they default to the theme's accent and a softer tint of it (a near-black
 * primary would only make a grey smudge). strength is its opacity.
 */
export function Aurora({
  colors = ["var(--color-accent, #7c3aed)", "color-mix(in srgb, var(--color-accent, #7c3aed) 45%, var(--color-background, #ffffff))", "var(--color-accent, #7c3aed)"],
  strength = 0.3,
  seconds = 18,
  className,
}: {
  colors?: string[];
  strength?: number;
  seconds?: number;
  className?: string;
}) {
  const style = { "--fx-a": colors[0], "--fx-b": colors[1] ?? colors[0], "--fx-c": colors[2] ?? colors[0], "--fx-strength": String(strength), "--fx-dur": seconds + "s" } as CSSProperties;
  return (
    <div aria-hidden="true" className={"fx-aurora" + (className ? " " + className : "")} style={style}>
      <span />
      <span />
      <span />
    </div>
  );
}

/**
 * A faint grid of dots or lines that fades out toward the edges, behind a hero. Same placing as
 * Aurora: first child of a "relative overflow-hidden" section. It does not move.
 */
export function GridPattern({
  variant = "dots",
  size = 28,
  color = "color-mix(in srgb, var(--color-foreground, #0f172a) 16%, transparent)",
  className,
}: {
  variant?: "dots" | "lines";
  size?: number;
  color?: string;
  className?: string;
}) {
  const image =
    variant === "dots"
      ? "radial-gradient(" + color + " 1px, transparent 1px)"
      : "linear-gradient(to right, " + color + " 1px, transparent 1px), linear-gradient(to bottom, " + color + " 1px, transparent 1px)";
  return <div aria-hidden="true" className={"fx-grid" + (className ? " " + className : "")} style={{ backgroundImage: image, backgroundSize: size + "px " + size + "px" }} />;
}
