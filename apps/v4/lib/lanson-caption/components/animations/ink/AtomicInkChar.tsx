import React from "react";
import { cn } from "@/lib/utils";

export type InkAnimationStyle = "reveal" | "rise";

export interface AtomicInkCharProps {
  char: string;
  delay?: number;
  duration?: number;
  style?: InkAnimationStyle;
  className?: string;
}

/**
 * AtomicInkChar animates a single character with an ink-like effect.
 * Requires <InkFilter /> to be present in the document.
 */
export const AtomicInkChar: React.FC<AtomicInkCharProps> = React.memo(
  ({ char, delay = 0, duration = 800, style = "reveal", className }) => {
    const isSpace = char === " " || char === "\u00A0";
    const displayChar = isSpace ? "\u00A0" : char;

    return (
      <span
        className={cn(
          "inline-block align-baseline will-change-[opacity,filter,transform]",
          style === "reveal" ? "animate-ink-reveal" : "animate-ink-rise",
          className,
        )}
        style={{
          animationDelay: `${delay}ms`,
          animationDuration: `${duration}ms`,
          animationFillMode: "forwards",
          opacity: 0,
        }}
      >
        {displayChar}
      </span>
    );
  },
);

AtomicInkChar.displayName = "AtomicInkChar";
