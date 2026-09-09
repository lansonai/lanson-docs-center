import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
import type { InkAlign } from "./TranscriptionHeaderInk";
import { TextEffect } from "@/components/ui/TextEffect";
import { getDiffSegments } from '@/components/transcription/diagnostics/utils';
import type { CorrectionData } from '@/components/transcription/types';
import type { TranscriptDisplayMode } from './HistoryTranscriptLineItem';
import { getSlotLayoutConfig, getTypographyClasses } from '@/components/transcription/typography';

/** 将毫秒转为可读时长：如 1797 → "1.8秒"，430851 → "7分10秒" */
function formatMsReadable(ms: number): string {
  if (ms >= 60_000) {
    const min = Math.floor(ms / 60_000);
    const sec = Math.round((ms % 60_000) / 1000);
    return sec > 0 ? `${min}分${sec}秒` : `${min}分`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(1)}秒`;
  }
  return ms >= 100 ? `${(ms / 1000).toFixed(2)}秒` : `${ms}毫秒`;
}

export interface TranscriptionSlotInkProps {
  correctionText: string;
  translationText: string;
  correction?:
  | CorrectionData
  | {
    original: [string, string] | null;
    translationText: [string, string] | null;
  }
  | null;
  debugTiming?: {
    vadEndTime: number;
    transcriptionStartTime: number;
    transcriptionEndTime?: number;
    correctionStartTime?: number;
    correctionFirstTokenTime?: number;
    correctionEndTime?: number;
  };
  /** 本段音频时长，用于调试时直观判断耗时是否合理，如 "2.3s" */
  segmentAudioDuration?: string;
  showVerboseMode?: boolean;
  isActive?: boolean;
  showTrace?: boolean;
  onComplete?: () => void;
  status?:
  | "pending"
  | "transcribing"
  | "completed"
  | "error"
  | "capturing"
  | "listening";
  instant?: boolean;
  align?: InkAlign;
  theme?: "mica" | "ebony" | "inkstone" | "ink";
  index?: number;
  total?: number;
  displayMode?: TranscriptDisplayMode;
  showMeta?: boolean;
  /** With {@link showVerboseMode}, gates ink slot timing strip (dev or admin). */
  transcriptionDebugEligible?: boolean;
}

export const TranscriptionSlotInk: React.FC<TranscriptionSlotInkProps> = ({
  correctionText,
  translationText,
  correction,
  debugTiming,
  segmentAudioDuration,
  showVerboseMode = false,
  isActive,
  showTrace = false,
  onComplete,
  status = "completed",
  instant = false,
  align = "center",
  theme,
  index,
  total,
  displayMode = 'both',
  showMeta = true,
  transcriptionDebugEligible = false,
}) => {
  // Convert correction data into TextEffect's expected HTML format
  const processedText = useMemo(() => {
    const wrapCorrection = (text: string, prev?: string) => {
      if (!prev || text === prev) return text;
      const segments = getDiffSegments(text, prev);
      return segments
        .map((seg) => {
          if (seg.type === "equal") return seg.text;
          if (seg.type === "insert") {
            // Find the corresponding delete in segments if it exists (very simplified)
            // For now, TextEffect just needs the insert wrapped in correction class
            // with data-original for the strikethrough hint.
            const prevText =
              segments.find((s) => s.type === "delete")?.text || "";
            return `<span class='correction' data-original='${prevText}'>${seg.text}</span>`;
          }
          return ""; // skip delete segments as they are handled via 'data-original' in TextEffect
        })
        .join("");
    };

    let textHtml = correctionText;
    let transHtml = translationText;

    if (showTrace && correction) {
      if (
        "previousCorrectionText" in correction ||
        "previousOriginal" in correction
      ) {
        // Handle CorrectionData
        const meta = correction as CorrectionData;
        textHtml = wrapCorrection(correctionText, meta.previousCorrectionText);
        transHtml = wrapCorrection(
          translationText,
          meta.previousTranslationText,
        );
      } else {
        // Handle [wrong, right] tuples
        const legacy = correction as {
          original: [string, string] | null;
          translationText: [string, string] | null;
        };
        if (legacy.original) {
          const [wrong, right] = legacy.original;
          textHtml = correctionText.replace(
            wrong,
            `<span class='correction' data-original='${wrong}'>${right}</span>`,
          );
        }
        if (legacy.translationText) {
          const [wrong, right] = legacy.translationText;
          transHtml = translationText.replace(
            wrong,
            `<span class='correction' data-original='${wrong}'>${right}</span>`,
          );
        }
      }
    }

    return { text: textHtml, trans: transHtml };
  }, [correctionText, translationText, correction, showTrace]);

  // 1. Get authoritative layout config
  const layout = getSlotLayoutConfig(
    "M", // Ink theme currently uses M metrics for balance
    displayMode,
    showMeta,
    showVerboseMode,
    1,
    false,
  );
  const statusFontSizeClass = getTypographyClasses("M", "original", "Listening");

  return (
    <div
      className={cn("slot group relative isolate w-full overflow-hidden", isActive && "active-slot")}
      data-theme={theme}
      style={{
        height: `${layout.totalHeight}px`,
        transform: "translateZ(0)",
        contain: "content",
      }}
    >
      {/* Slot Sequence Indicator */}
      {typeof index === "number" && typeof total === "number" && (
        <div
          className="absolute left-3 w-4 flex flex-col items-center justify-center opacity-20 select-none transition-opacity group-hover:opacity-50"
          style={{
            top: `${layout.originalOffset}px`,
            height: `${layout.lineHeight}px`
          }}
        >
          <span className="text-[9px] leading-none text-[var(--ink-sub)]">
            {(index + 1).toString().padStart(2, "0")}
          </span>
        </div>
      )}

      <div
        className={cn(
          "relative w-full h-full transition-all duration-500",
          !correctionText && translationText && !isActive && "opacity-30",
        )}
      >
        {/* ── Original/Correction Text (Absolute Pos) ── */}
        {layout.originalOffset >= 0 && (
          <div
            className={cn(
              "absolute inset-x-6 flex items-center transition-all duration-500",
              align === "left" && "justify-start text-left",
              align === "center" && "justify-center text-center",
              align === "right" && "justify-end text-right",
              isActive && !correctionText ? "opacity-50" : "opacity-80"
            )}
            style={{
              top: `${layout.originalOffset}px`,
              height: `${layout.lineHeight}px`,
              willChange: "transform, opacity"
            }}
          >
            {isActive && !correctionText ? (
              <span className={cn(statusFontSizeClass, "tracking-wide italic animate-pulse")}>
                Listening...
              </span>
            ) : correctionText ? (
              <TextEffect
                key={`${correctionText}-${translationText}-${correction ? "c" : "n"}`}
                slot={{ ...processedText }}
                isStatic={instant}
                className="block w-full"
                onComplete={onComplete}
              />
            ) : null}
          </div>
        )}

        {/* ── Translation Text (Absolute Pos - Reserved Space) ── */}
        {layout.translationOffset >= 0 && (
          <div
            className={cn(
              "absolute inset-x-6 flex items-center transition-all duration-500",
              align === "left" && "justify-start text-left",
              align === "center" && "justify-center text-center",
              align === "right" && "justify-end text-right",
              "text-[var(--ink-sub)] italic trans-subtle"
            )}
            style={{
              top: `${layout.translationOffset}px`,
              height: `${layout.lineHeight}px`,
            }}
          >
            {translationText ? (
              <TextEffect
                key={`trans-${translationText}`}
                slot={{ text: processedText.trans, trans: "" }}
                isStatic={instant}
                className="block w-full"
              />
            ) : (
              // Reserved space indicator
              <div className="w-1/4 h-1 bg-[var(--ink-sub)]/10 rounded-full animate-pulse" />
            )}
          </div>
        )}

        {/* ── Meta Info (Absolute Pos) ── */}
        {layout.metaOffset >= 0 && (
          <div
            className={cn(
              "absolute inset-x-0 px-6 py-1 text-[8px] font-mono",
              "text-[var(--ink-sub)]",
              "flex items-center",
              align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end",
            )}
            style={{
              top: `${layout.metaOffset}px`,
              height: `${layout.META_HEIGHT}px`,
              zIndex: 10,
              pointerEvents: "none",
              transform: "translate3d(0, 0, 0.1px)",
            }}
          >
            {showMeta && showVerboseMode && transcriptionDebugEligible && debugTiming && (() => {
              const transcribeMs = debugTiming.transcriptionStartTime != null && debugTiming.transcriptionEndTime != null
                ? Math.round(debugTiming.transcriptionEndTime - debugTiming.transcriptionStartTime)
                : null;
              const correctionFirstCharMs = debugTiming.transcriptionEndTime != null && debugTiming.correctionFirstTokenTime != null
                ? Math.round(debugTiming.correctionFirstTokenTime - debugTiming.transcriptionEndTime)
                : null;
              const correctionTotalMs = debugTiming.transcriptionEndTime != null && debugTiming.correctionEndTime != null
                ? Math.round(debugTiming.correctionEndTime - debugTiming.transcriptionEndTime)
                : null;
              const delayMs = transcribeMs != null && correctionFirstCharMs != null ? transcribeMs + correctionFirstCharMs : null;

              const infoItems: { label: string; value: string }[] = [];
              if (transcribeMs != null) infoItems.push({ label: "转录", value: formatMsReadable(transcribeMs) });
              if (correctionFirstCharMs != null) infoItems.push({ label: "纠错首字", value: formatMsReadable(correctionFirstCharMs) });
              if (correctionTotalMs != null) infoItems.push({ label: "纠错完成", value: formatMsReadable(correctionTotalMs) });
              if (delayMs != null) infoItems.push({ label: "延迟", value: formatMsReadable(delayMs) });
              if (segmentAudioDuration) infoItems.push({ label: "音频", value: segmentAudioDuration });

              return (
                <div className={cn("flex items-center gap-3", align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end")}>
                  {infoItems.map(({ label, value }, i) => (
                    <span key={i} className="shrink-0 whitespace-nowrap">
                      <span className="opacity-70">{label}</span>
                      <span className={i === 0 ? "font-semibold text-[var(--ink-color)] ml-1" : "ml-1"}>{value}</span>
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
