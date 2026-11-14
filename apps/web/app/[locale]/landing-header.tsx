"use client";

import { useEffect, useState } from "react";

/** Sticky landing header: blends into the hero at the top of the page, gains a bottom border once the page scrolls. */
export function LandingHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 0);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <header data-scrolled={scrolled} className={`sticky top-0 z-40 border-b bg-canvas transition-colors ${scrolled ? "border-border" : "border-transparent"}`}>
      {children}
    </header>
  );
}
