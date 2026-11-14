// The page frame every Nolan screen shares. Sizes come from the design, see docs/DESIGN.md.

import Link from "next/link";
import type { ReactNode } from "react";

export function Page({
  sub,
  actions,
  children,
  footer,
}: {
  /** The muted line beside the wordmark: where you are. */
  sub: string;
  actions?: ReactNode;
  children: ReactNode;
  /** The credits line. It names only the tools this screen really used. */
  footer?: string;
}) {
  return (
    <div className="page">
      <header className="header">
        <div className="header-left">
          <Link href="/" className="wordmark">
            Nolan
          </Link>
          <span className="sub">{sub}</span>
        </div>
        {actions && <div className="header-right no-print">{actions}</div>}
      </header>
      {children}
      {footer && <footer className="footer">{footer}</footer>}
    </div>
  );
}

/** Three bouncing dots: something is in progress. Never shown on its own, always beside words. */
export function Dots() {
  return (
    <span aria-hidden="true" className="dots">
      <i />
      <i />
      <i />
    </span>
  );
}

/** Shown while the browser's stored cases are being read, and when a screen has nothing to show. */
export function Empty({ title, text, sub = "Cases" }: { title: string; text: string; sub?: string }) {
  return (
    <Page sub={sub}>
      <div className="hero">
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <main className="panel">
        <section className="card main-col stack" style={{ gap: 16, alignItems: "flex-start" }}>
          <Link href="/" className="pill dark">
            Back to the case file
          </Link>
        </section>
      </main>
    </Page>
  );
}
