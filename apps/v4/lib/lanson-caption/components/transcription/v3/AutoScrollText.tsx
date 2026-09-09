import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AutoScrollTextProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  enabled?: boolean;
}

const STYLE_ID = "transcription-auto-scroll-styles";
const STYLES = `
@keyframes transcription-auto-scroll {
  0%, 12% { transform: translateX(0); }
  100% { transform: translateX(calc(-1 * var(--scroll-distance, 0px))); }
}
`;

function ensureStyles() {
  if (typeof document === "undefined") return;
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_ID;
    document.head.appendChild(tag);
  }
  if (tag.textContent !== STYLES) {
    tag.textContent = STYLES;
  }
}

export function AutoScrollText({
  children,
  className,
  contentClassName,
  enabled = true,
}: AutoScrollTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    ensureStyles();
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      setOverflowPx(0);
      return;
    }

    const measure = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const nextOverflow = Math.max(
        0,
        Math.ceil(content.scrollWidth - container.clientWidth),
      );
      setOverflowPx(nextOverflow > 8 ? nextOverflow : 0);
    };

    measure();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;

    if (containerRef.current) resizeObserver?.observe(containerRef.current);
    if (contentRef.current) resizeObserver?.observe(contentRef.current);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [children, enabled]);

  if (!enabled) {
    return (
      <div ref={containerRef} className={cn("w-full overflow-hidden", className)}>
        <div ref={contentRef} className={cn("block w-full", contentClassName)}>
          {children}
        </div>
      </div>
    );
  }

  const durationSec = Math.max(2.2, overflowPx / 72);

  return (
    <div ref={containerRef} className={cn("w-full overflow-hidden", className)}>
      <div
        ref={contentRef}
        className={cn(
          "inline-block min-w-full whitespace-nowrap will-change-transform",
          contentClassName,
        )}
        style={
          overflowPx > 0
            ? {
                ["--scroll-distance" as string]: `${overflowPx}px`,
                animation: `transcription-auto-scroll ${durationSec}s ease-out 1 forwards`,
              }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
