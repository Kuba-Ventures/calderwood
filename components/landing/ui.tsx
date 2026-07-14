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
      className={`max-w-[660px] ${
        isCenter ? "mx-auto mb-[54px] text-center" : "text-left"
      } ${className}`}
    >
      <Pill>{pill}</Pill>
      <h2 className="mt-4 font-display text-[clamp(30px,4vw,46px)] font-extrabold leading-[1.08] tracking-[-0.02em] text-heading">
        {title}
      </h2>
      {sub && <p className="mt-4 text-[17px] text-muted">{sub}</p>}
    </Reveal>
  );
}

type Variant = "primary" | "ghost" | "white";

const variants: Record<Variant, string> = {
  primary:
    "bg-grad-brand text-white shadow-[0_14px_34px_-12px_rgba(30,47,209,0.7)] hover:-translate-y-0.5 hover:brightness-105",
  ghost:
    "border border-line bg-white text-heading shadow-[0_2px_10px_-6px_rgba(17,24,72,0.25)] hover:-translate-y-0.5 hover:border-[#C8CFEC]",
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
      className={`group inline-flex items-center justify-center gap-[9px] rounded-xl px-6 py-[14px] text-[15.5px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${variants[variant]} ${className}`}
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
