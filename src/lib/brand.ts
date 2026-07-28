/**
 * Brand colour tokens — change colours here only.
 *
 * Applied as CSS variables on `<html>` in the root layout, and exposed to
 * Tailwind as `brand` / `brand-hover` / `brand-mint` / `brand-ink`.
 */
export const brand = {
  /** Primary brand green (PWA icon). */
  green: "#064e3b",
  /** Hover / pressed green. */
  greenHover: "#053528",
  /** Soft mint accent (icon subtitle). */
  mint: "#6ee7b7",
  /** Deep ink used in icon gradient / splash. */
  ink: "#020617",
  /** Text on brand fills. */
  foreground: "#ffffff",
} as const;

/** CSS custom properties derived from {@link brand}. */
export const brandCssVars = {
  "--brand": brand.green,
  "--brand-hover": brand.greenHover,
  "--brand-mint": brand.mint,
  "--brand-ink": brand.ink,
  "--brand-foreground": brand.foreground,
} as const;
