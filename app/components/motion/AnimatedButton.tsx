"use client";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { ArrowRight } from "lucide-react";

type Common = {
  variant?: "primary" | "secondary" | "outline";
  size?: "md" | "sm";
  /** Appends an arrow that nudges forward on hover. */
  arrow?: boolean;
  children: ReactNode;
  className?: string;
};
type AsButton = Common & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className">;
type AsLink = Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "href">;

/**
 * Site-wide button with the diagonal sweep hover. The effect itself lives in
 * styles/animations.css on `.btn`, so legacy `className="btn"` markup gets it too.
 */
export function AnimatedButton(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", arrow = false, children, className = "", ...rest } = props;
  const classes = ["btn", variant === "primary" ? "" : variant, size === "sm" ? "btn-sm" : "", className].filter(Boolean).join(" ");
  const content = (
    <>
      {children}
      {arrow && <ArrowRight className="btn-arrow" size={size === "sm" ? 15 : 18} aria-hidden="true" />}
    </>
  );
  if (rest.href !== undefined) {
    return (
      <a className={classes} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {content}
      </a>
    );
  }
  const { type = "button", ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
