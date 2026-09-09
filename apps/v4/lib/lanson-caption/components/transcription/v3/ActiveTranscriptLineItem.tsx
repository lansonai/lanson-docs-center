import { useIsMobile } from "@/hooks/useMobile";
import { cn } from "@/lib/utils";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getWordsTypographyClasses } from '@/components/transcription/typography';
import {
  isCjkText,
  type DiffWord
} from '@/components/transcription/utils';

const TRANSCRIPTION_DEBUG_ENABLED = import.meta.env.DEV;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActiveTranscriptLineItemProps {
  words: DiffWord[];
  className?: string;
  showTrace?: boolean;
  transcriptionSize?: "S" | "M" | "L";
}

// ─── computeDiff ──────────────────────────────────────────────────────────────
// [The Lanson Way] Replaced with shared implementation in ./utils.ts
// for consistency between live and history views.

// ─── Style injection ──────────────────────────────────────────────────────────

const STYLE_TAG_ID = "live-diff-text-styles";

function useInjectStyles() {
  useEffect(() => {
    let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_TAG_ID;
      document.head.appendChild(tag);
    }
    // 关键：始终覆盖 textContent，确保 HMR (热重载) 和样式变动能即时生效
    if (tag.textContent !== STYLES) {
      tag.textContent = STYLES;
    }

    return () => {
      // Optional: Clean up could be problematic if multiple components use it
    };
  }, []);
}

// ─── ActiveTranscriptLineItem ─────────────────────────────────────────────────────────────

export const ActiveTranscriptLineItem: React.FC<
  ActiveTranscriptLineItemProps
> = ({ words, className, showTrace = true, transcriptionSize = "M" }) => {
  useInjectStyles();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflowPx, setOverflowPx] = useState(0);

  useEffect(() => {
    if (!TRANSCRIPTION_DEBUG_ENABLED) return;
    const newCount = words.filter((w) => w.state === "new").length;
    if (newCount <= 0) return;
    const ids = words.map((w) => String(w.id));
    const unique = new Set(ids).size;
    console.log("[LiveTranscriptionDebug] lineItem", {
      total: words.length,
      newCount,
      replacingCount: words.filter((w) => w.state === "replacing").length,
      stableCount: words.filter((w) => w.state === "stable").length,
      uniqueIds: unique,
      sampleIds: ids.slice(0, 20),
    });
  }, [words]);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const content = contentRef.current;
      if (!container || !content) return;
      const nextOverflow = Math.max(
        0,
        Math.ceil(content.scrollWidth - container.clientWidth),
      );
      setOverflowPx(nextOverflow > 1 ? nextOverflow : 0);
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
  }, [words, transcriptionSize, showTrace]);

  const isMobile = useIsMobile();

  // Get typography configuration using centralized function
  const fontSize = getWordsTypographyClasses(transcriptionSize, words, isMobile);

  // Memoize word rendering classes and styles for performance
  const renderedWords = useMemo(() => {
    return words.map((word, idx) => {
      const isReplacing = word.state === "replacing";
      const isNew = word.state === "new";
      const isChinese = isCjkText(word.text);

      return (
        <span
          key={word.id}
          data-wid={word.id}
          className={cn(
            "diff-word group/word",
            isReplacing
              ? "diff-word--correcting"
              : isNew
                ? "diff-word--new"
                : "diff-word--stable",
            isReplacing && showTrace && "diff-word--trace",
            isChinese && "lang-zh",
          )}
          style={
            {
              animationDelay: isNew ? `${idx * 40}ms` : "0ms",
            } as React.CSSProperties
          }
        >
          {isReplacing && word.replacedText && showTrace && (
            <span
              className="diff-old diff-old--trace-enter select-none"
              aria-hidden="true"
            >
              {word.replacedText}
            </span>
          )}

          <span
            className={cn(
              "diff-current",
              isReplacing && !showTrace && "diff-current--in",
              isReplacing && "diff-current--corrected",
            )}
          >
            {word.text}
          </span>

          {/* [The Lanson Way] Aesthetics: Removed the amber pulse effect for a quieter 'settled' look */}
        </span>
      );
    });
  }, [words, showTrace]);

  const isLineCjk = useMemo(
    () => isCjkText(words.map((w) => w.text).join("")),
    [words],
  );
  const durationSec = Math.max(2.2, overflowPx / 72);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        ref={contentRef}
        className={cn(
          "inline-flex max-w-full flex-wrap md:flex-nowrap items-baseline whitespace-normal md:whitespace-nowrap overflow-hidden md:max-h-none will-change-transform",
          isLineCjk ? "gap-[0.2ch]" : "gap-[0.4ch]",
          fontSize,
          className,
        )}
        style={
          overflowPx > 0
            ? {
              ["--scroll-distance" as string]: `${overflowPx}px`,
              animation: `subtitle-line-auto-scroll ${durationSec}s ease-out 1 forwards`,
            }
            : undefined
        }
      >
        {renderedWords}
      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
@keyframes subtitle-line-auto-scroll {
  0%, 12% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-1 * var(--scroll-distance, 0px)));
  }
}

.diff-word {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr;
  max-width: 0;
  flex-shrink: 0;
  transition: max-width 600ms cubic-bezier(0.16, 1, 0.3, 1);
  align-items: baseline;
  overflow: hidden;
  will-change: max-width, opacity, transform;
}

.diff-word--stable,
.diff-word--new,
.diff-word--correcting {
  max-width: 100vw;
}

.diff-old,
.diff-current {
  grid-area: 1 / 1;
  white-space: pre;
  min-width: 0;
}

/* Trace 显示：旧词+新词并排，不做 overlay 替换动画 */
.diff-word--trace {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35ch;
  overflow: visible;
  max-width: none;
}

.diff-word--trace .diff-old,
.diff-word--trace .diff-current {
  grid-area: auto;
}

.diff-word--trace .diff-old {
  display: inline-block;
  overflow: hidden;
  animation: trace-old-reveal 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transform: none;
  filter: none;
  opacity: 0.6;
}

.diff-word--trace .diff-old::after {
  animation: line-grow 220ms cubic-bezier(0.16, 1, 0.3, 1) both;
  transform: scaleX(0);
}

/* ── SYSTEM 1: New Word (首次出现) ── */
.diff-word--new {
  animation: word-reveal 700ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* ── Stable Word (已存在且未变化) ── */
.diff-word--stable {
  /* 不播放动画，只保持展开状态 */
}

/* ── SYSTEM 2: Correction ── */
.diff-word--correcting {
  /* 移除 opacity: 1，继承父容器透明度 */
}

.diff-old {
  position: relative;
  color: hsl(var(--muted-foreground));
  opacity: 0.28;
  pointer-events: none;
  user-select: none;
  will-change: opacity, transform;
  animation: strike-out 500ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* 纠错划线：更细、更淡 */
.diff-old::after {
  content: "";
  position: absolute;
  left: 0;
  top: 55%;
  width: 100%;
  height: 0.85px;
  background: currentColor;
  opacity: 0.7;
  transform: scaleX(0);
  transform-origin: left;
  animation: line-grow 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.diff-current--corrected {
  /* [The Lanson Way] Aesthetics: Use desaturated, dimmed white for 'settled' corrections */
  color: rgba(255, 255, 255, 0.65);
  text-shadow: none;
  transition: color 300ms ease;
}

.diff-current--in {
  opacity: 0;
  will-change: opacity, transform;
  animation: slide-up-reveal 500ms cubic-bezier(0.16, 1, 0.3, 1) 150ms both;
}

@keyframes word-reveal {
  0% {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
    filter: blur(4px);
  }
  100% {
    opacity: inherit; /* 继承父容器透明度 */
    transform: translateY(0) scale(1);
    filter: blur(0px);
  }
}

@keyframes line-grow {
  to { transform: scaleX(1); }
}

@keyframes trace-old-reveal {
  0% {
    max-width: 0;
    opacity: 0;
  }
  100% {
    max-width: 100vw;
    opacity: 0.6;
  }
}

@keyframes strike-out {
  0% {
    opacity: 0.8;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-6px) scale(0.95);
    filter: blur(3px);
  }
}

@keyframes slide-up-reveal {
  0% {
    opacity: 0;
    transform: translateY(6px);
    filter: blur(2px);
  }
  100% {
    opacity: inherit; /* 继承父容器透明度 */
    transform: translateY(0);
    filter: blur(0px);
  }
}
`;
