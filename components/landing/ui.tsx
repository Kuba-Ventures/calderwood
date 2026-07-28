import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#DCE1FB] bg-[#EEF1FE] px-[14px] py-[7px] text-[13px] font-semibold text-brand">
      {children}
    </span>
  );
}

export function Glow({ style }: { style: CSSProperties }) {
  return <span aria-hidden="true" className="glow" style={style} />;
}

/** Absolute blurred radial blob used behind the hero, stat band, and CTA. */
export function radialGlow(
  color: string,
  size: number,
  pos: CSSProperties
): CSSProperties {
  return {
    width: size,
    height: size,
    background: `radial-gradient(circle, ${color}, transparent 65%)`,
    ...pos,
  };
}

/**
 * Section header: an uppercase eyebrow over a serif display heading. The
 * `pill` prop name is kept for call-site compatibility; it renders as the
 * eyebrow label.
 */
export function SectionHead({
  pill,
  title,
  sub,
  align = "center",
  className = "",
}: {
  pill: string;
  title: ReactNode;
  sub?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const isCenter = align === "center";
  return (
    <Reveal
      className={`${
        isCenter
          ? "mx-auto mb-12 max-w-[660px] text-center"
          : "max-w-[560px] text-left"
      } ${className}`}
    >
      <div className="mb-3 text-[12px] font-bold uppercase tracking-[0.16em] text-brand">
        {pill}
      </div>
      <h2 className="font-serif text-[clamp(30px,4vw,42px)] font-semibold leading-[1.1] tracking-[-0.015em] text-brand-deep [text-wrap:balance]">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[17px] leading-relaxed text-muted">{sub}</p>}
    </Reveal>
  );
}

type Variant = "primary" | "ghost" | "white";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-deep text-white shadow-[0_14px_34px_-14px_rgba(49,46,129,0.65)] hover:-translate-y-0.5 hover:brightness-110",
  ghost:
    "border border-line bg-white text-brand-deep shadow-[0_2px_10px_-6px_rgba(17,24,72,0.25)] hover:-translate-y-0.5 hover:border-[#C8CFEC]",
  white:
    "bg-white text-brand-deep shadow-[0_16px_40px_-14px_rgba(0,0,0,0.5)] hover:-translate-y-0.5",
};

export function Button({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-[9px] rounded-xl px-[22px] py-[13px] text-[15.5px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

/** Arrow that nudges right on parent :hover (wrap the button with `group`). */
export function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-200 group-hover:translate-x-1"
    >
      →
    </span>
  );
}
