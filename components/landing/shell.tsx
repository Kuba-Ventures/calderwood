import type { ReactNode } from "react";
import { LandingNav } from "./nav";
import { Footer } from "./footer";

/** Marketing-site chrome: the landing nav + footer around page content. */
export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-paper font-sans text-body">
      <LandingNav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
