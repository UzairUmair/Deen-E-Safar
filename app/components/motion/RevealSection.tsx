"use client";
import type { ReactNode } from "react";
import { motion } from "motion/react";

/** Fades a block up into place the first time it scrolls into view. */
export function RevealSection({ children, className, delay = 0, as = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </Tag>
  );
}
