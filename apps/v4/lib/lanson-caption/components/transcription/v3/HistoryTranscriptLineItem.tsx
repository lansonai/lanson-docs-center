/**
 * TranscriptLineItem
 *
 * A single "settled" transcript line — used in history panels, archive drawers,
 * and any other context that needs to render a completed TranscriptItem.
 *
 * For ACTIVE (in-progress) streaming lines, use TranscriptionSlotInk (with TextEffect).
 *
 * Display is fully controllable via boolean props — no visibility logic lives
 * outside this component.
 */
import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TranscriptItem } from '@/components/transcription/types';
import { getTypographyClasses, getTextAreaHeight } from '@/components/transcription/typography';
import { TraceDebugInfoRow } from './TraceDebugInfoRow';
import { computeDiff } from '@/components/transcription/utils';

/**
 * Controls which text lines are rendered.
 * - 'both'        — original + translation (default)
 * - 'transcript'  — original text only
 * - 'translation' — translation only
 */
export type TranscriptDisplayMode = 'both' | 'transcript' | 'translation';

export type TranscriptLineVariant = 'standard' | 'ink';

export interface HistoryTranscriptLineItemProps {
    item: TranscriptItem;

    // ── Display controls ──────────────────────────────────────────────────────
    /**
     * 3-state text display toggle.
     * - 'both'        — original + translation (default)
     * - 'transcript'  — original only
     * - 'translation' — translation only
     */
    displayMode?: TranscriptDisplayMode;
    /** Show ASR → corrected diff block. Default: false */
    showTrace?: boolean;
    /** Show meta row (time + duration; admin-only extras when adminMeta). Default: false */
    showMeta?: boolean;
    /** Admin + Admin Meta on: timing, STT routing, popover. Default false. */
    adminMeta?: boolean;
    /** Session / UI source language; left of `AUTO/EN` in admin language meta. */
    sourceLanguage?: string;

    // ── Visual ────────────────────────────────────────────────────────────────
    /** Visual variant controlling typography and spacing. Default: 'standard' */
    variant?: TranscriptLineVariant;
    /** Additional CSS class on the root element. */
    className?: string;

    /** Text alignment. Default: 'left' */
    align?: 'left' | 'center' | 'right';
    /** Font size preset. Default: 'M' */
    transcriptionSize?: 'S' | 'M' | 'L';
    /**
     * Allow internal wrapping for narrow containers (e.g. sidebar history).
     * Default: false (single-line, truncated).
     */
    wrap?: boolean;
    /** Keep transcript text in the default reading color even when corrections exist. */
    disableCorrectionTint?: boolean;
    /**
     * Disable per-line entrance animations.
     * Used to avoid "double animations" when a parent panel is sliding in (mobile history detail).
     */
    suppressEntranceAnimations?: boolean;
}


// ─────────────────────────────────────────────────────────────────────────────
// Helpers & Inner Components
// ─────────────────────────────────────────────────────────────────────────────

type TraceChangeSegment = {
    oldChanged: string;
    newChanged: string;
};

function extractChangedSegment(oldText: string, newText: string): TraceChangeSegment | null {
    if (!oldText || !newText || oldText === newText) return null;

    let start = 0;
    const oldLen = oldText.length;
    const newLen = newText.length;

    while (start < oldLen && start < newLen && oldText[start] === newText[start]) {
        start++;
    }

    let oldEnd = oldLen - 1;
    let newEnd = newLen - 1;
    while (oldEnd >= start && newEnd >= start && oldText[oldEnd] === newText[newEnd]) {
        oldEnd--;
        newEnd--;
    }

    const oldChanged = oldText.slice(start, oldEnd + 1).trim();
    const newChanged = newText.slice(start, newEnd + 1).trim();

    if (!oldChanged && !newChanged) return null;
    return { oldChanged, newChanged };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function HistoryTranscriptLineItem({
    item,
    displayMode = 'both',
    showTrace = false,
    showMeta = false,
    adminMeta = false,
    sourceLanguage,
    variant = 'standard',
    align = 'left',
    transcriptionSize = 'M',
    wrap = false,
    disableCorrectionTint = false,
    suppressEntranceAnimations = false,
    className,
}: HistoryTranscriptLineItemProps) {
    const isInk = variant === 'ink';

    const wasAutoCorrected = !!(item.transcriptText && item.transcriptText !== item.correctionText);
    const correctionCount = item.correctionData?.words?.length ?? 0;

    const hasTranslationText = !!item.translationText;
    const showOriginal =
        displayMode === 'transcript' ||
        displayMode === 'both' ||
        (displayMode === 'translation' && !hasTranslationText);
    const showTransRow =
        hasTranslationText &&
        (displayMode === 'both' || displayMode === 'translation');
    const showBilingualStack = showOriginal && showTransRow;

    const settledTranscript = item.correctionText || item.transcriptText || '';

    // Use shared typography config
    const originalFontSize = getTypographyClasses(
        transcriptionSize,
        'original',
        settledTranscript
    );
    const translationFontSize = getTypographyClasses(
        transcriptionSize,
        'translation',
        item.translationText || ''
    );
    const traceChange = useMemo(
        () => extractChangedSegment(item.transcriptText || '', settledTranscript),
        [item.transcriptText, settledTranscript],
    );

    return (
        <div
            className={cn(
                'flex flex-col overflow-hidden',
                isInk ? 'py-3 px-4' : 'py-0.5 px-0',
                align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left',
                className,
            )}
        >
            {/* ── Text Container (Fixed Height or Auto) ── */}
            <div
                className={cn(
                    'relative flex w-full flex-col justify-center',
                    wrap && 'gap-1.5',
                )}
                style={{ height: !wrap ? `${getTextAreaHeight(transcriptionSize, displayMode)}px` : 'auto' }}
            >
                {/* ── Original text (Transcript) ── */}
                <div
                    className={cn(
                        "transition-opacity duration-500",
                        showOriginal ? "opacity-100" : "hidden"
                    )}
                >
                    <p
                        className={cn(
                            'text-foreground/92',
                            showBilingualStack && 'font-medium tracking-[-0.01em]',
                            !suppressEntranceAnimations && 'animate-in fade-in slide-in-from-left-2 duration-300 fill-mode-both',
                            wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap truncate',
                            originalFontSize
                        )}
                    >
                        {!disableCorrectionTint && !showTrace && (wasAutoCorrected || correctionCount > 0) ? (
                            computeDiff(item.transcriptText || '', settledTranscript).map((word, idx) => (
                                <span
                                    key={idx}
                                    className={cn(
                                        word.state === 'replacing' && "text-foreground/65 transition-colors duration-300"
                                    )}
                                >
                                    {word.text}
                                </span>
                            ))
                        ) : (
                            settledTranscript
                        )}
                    </p>
                </div>

                {/* ── Translation ── */}
                <div
                    className={cn(
                        "transition-opacity duration-500",
                        showTransRow ? "opacity-100" : "hidden"
                    )}
                >
                    <p
                        className={cn(
                            showBilingualStack ? 'text-foreground/62' : 'text-foreground/88',
                            showBilingualStack && 'tracking-[0.01em]',
                            !suppressEntranceAnimations && 'animate-in fade-in slide-in-from-left-2 duration-300 delay-75 fill-mode-both',
                            wrap ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap truncate',
                            translationFontSize
                        )}
                    >
                        {item.translationText}
                    </p>
                </div>
            </div>

            {/* ── Trace row (Atomic Entrance) ── */}
            <AnimatePresence>
                {showTrace && wasAutoCorrected && !!traceChange && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="w-full mt-1.5 overflow-hidden"
                    >
                        <p className="text-[11px] leading-tight whitespace-nowrap truncate">
                            <span className="text-foreground/30 line-through">
                                {traceChange?.oldChanged || '∅'}
                            </span>
                            <span className="mx-1 text-foreground/20">→</span>
                            <span className="text-foreground/60">
                                {traceChange?.newChanged || '∅'}
                            </span>
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Meta row (Atomic Entrance) ── */}
            <AnimatePresence>
                {showMeta && (
                    <motion.div
                        initial={suppressEntranceAnimations ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={suppressEntranceAnimations ? undefined : { opacity: 0, height: 0 }}
                        className="w-full mt-1 overflow-hidden"
                    >
                        <TraceDebugInfoRow
                            time={item.time}
                            audioDuration={adminMeta ? item.correctionData?.audioDuration : undefined}
                            timing={adminMeta ? item.correctionData?.timing : undefined}
                            align={align}
                            adminMeta={adminMeta}
                            sourceLanguage={sourceLanguage}
                            sttRequestLanguage={item.sttRequestLanguage}
                            detectedLanguage={item.detectedLanguage}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
