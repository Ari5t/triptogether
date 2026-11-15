"use client";

import { MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Entrance easing from DESIGN.md motion notes: quick start, soft landing. */
export const EASE = [0.2, 0, 0, 1] as const;

/** Landing-only: transform animations are skipped when the visitor prefers reduced motion. */
export function LandingMotion({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

const TAGS = { div: motion.div, li: motion.li, article: motion.article } as const;

/** Fade-up once when scrolled into view. */
export function Reveal({ children, delay = 0, className, as = "div" }: { children: ReactNode; delay?: number; className?: string; as?: keyof typeof TAGS }) {
  const Tag = TAGS[as];
  return (
    <Tag className={className} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.4, ease: EASE, delay }}>
      {children}
    </Tag>
  );
}

/** Green 2 px rule that fills left to right over the neutral border of its (relative) parent. */
export function RuleFill({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span
      aria-hidden
      className="absolute -top-0.5 left-0 h-0.5 w-full origin-left bg-primary"
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    />
  );
}

/**
 * Cycles 0..steps-1 every `ms` while the element is on screen and the tab is visible.
 * With reduced motion it never cycles and holds `restStep` (a representative still frame).
 */
export function useLoop<T extends Element>(steps: number, ms: number, restStep = 0) {
  const ref = useRef<T>(null);
  const inView = useInView(ref);
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduced) {
      setStep(restStep);
      return;
    }
    if (!inView) return;
    const id = setInterval(() => {
      if (!document.hidden) setStep((s) => (s + 1) % steps);
    }, ms);
    return () => clearInterval(id);
  }, [inView, reduced, steps, ms, restStep]);
  return { ref, step };
}
