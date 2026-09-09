import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useMobile';
import React from 'react';
import {
    TranscriptLineDiffRenderer,
    TranscriptLineInkRenderer,
    TranscriptLinePushRenderer,
    type TranscriptLineStatus,
} from './renderers';
import { TraceDebugInfoRow } from './TraceDebugInfoRow';
import { TranscriptStatusIndicator } from '@/components/transcription/TranscriptStatusIndicator';
import { TranslationText } from './TranslationText';
import type { TranscriptItem } from '@/components/transcription/types';
import { getSlotLayoutConfig, getTypographyClasses } from '@/components/transcription/typography';
import type { PipelineSttDebugLabel } from '@/lib/realtime-transcription/buildTranscriptionFromImeDevPreset';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActiveTranscriptSlotProps {
    /**
     * The complete TranscriptItem. The slot component reads what it needs internally.
     * Callers pass the full object — no pre-filtering required.
     */
    item: TranscriptItem;

    // ── UI / Context config (not item data) ───────────────────────────────────

    /**
     * Forced renderer variant for the transcript line.
     * - 'push': Mobile-optimized vertical push
     * - 'diff': Desktop segment-level word diff
     * - 'ink': Premium ink-reveal (corrected only)
     * - 'auto': Device-based routing (default)
     */
    variant?: 'push' | 'diff' | 'ink' | 'auto';

    textAlign?: 'left' | 'center' | 'right';
    transcriptionSize?: 'S' | 'M' | 'L';

    /**
     * Controls visibility of transcript vs translation regions.
     * - 'both': transcript (dimmed) + translation (full opacity)
     * - 'transcript': transcript only
     * - 'translation': translation only
     */
    displayMode?: 'both' | 'transcript' | 'translation';

    showMeta?: boolean;
    showVerboseMode?: boolean;
    /** Enables STT routing / latency row with verbose controls (live admin). */
    isAdmin?: boolean;
    /** Same as live stream: default authenticated STT path label when `timing.sttUsed` is absent. */
    pipelineSttDebugLabel?: PipelineSttDebugLabel;

    /** Triggers "Finalizing..." copy in the status indicator. */
    isLongWait?: boolean;

    /** Debug mode: overlays dashed colored borders on each layout region. */
    debugBounds?: boolean;

    /** User-selected source language for admin `AUTO/EN` meta. */
    sourceLanguage?: string;

    className?: string;
}

// ─── Status mapping ───────────────────────────────────────────────────────────

function getRendererStatus(item: TranscriptItem): TranscriptLineStatus {
    if (item.status === 'completed') return 'final';
    if (item.correctionText && item.correctionText !== item.transcriptText) return 'correcting';
    if (item.status === 'pending') return 'pausing';
    return 'streaming';
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ActiveTranscriptSlot — Slot-level component (The Lanson Way)
 *
 * Accepts a full TranscriptItem and renders a complete transcription slot:
 *
 *   1. Status indicator   — listening / capturing / transcribing / error
 *                           shown only when there is no transcript text yet
 *   2. Transcript line    — routed to Push / Diff / Ink based on `variant`
 *   3. Translation line   — always InkRenderer + final (arrives complete, no streaming)
 *
 * Callers provide the full TranscriptItem. This component decides what to render.
 */
export const ActiveTranscriptSlot: React.FC<ActiveTranscriptSlotProps> = ({
    item,
    variant = 'auto',
    textAlign = 'left',
    transcriptionSize = 'M',
    displayMode = 'both',
    showMeta = false,
    showVerboseMode = false,
    isAdmin = false,
    pipelineSttDebugLabel,
    isLongWait = false,
    debugBounds = false,
    sourceLanguage,
    className,
}) => {
    const isMobile = useIsMobile();
    const hasTranscriptText = !!(item.transcriptText || item.correctionText);
    const hasTranslation = !!item.translationText;
    const showStatusIndicator = !hasTranscriptText && item.status && item.status !== 'completed';

    // 1. Get the authoritative layout config (Source of Truth)
    const layout = getSlotLayoutConfig(
        transcriptionSize,
        displayMode,
        showMeta,
        false,
        1,
        false,
    );

    // 2. Resolve renderer variant
    let activeVariant: 'push' | 'diff' | 'ink' = 'diff';
    if (variant !== 'auto') {
        activeVariant = variant as 'push' | 'diff' | 'ink';
    } else {
        activeVariant = isMobile ? 'push' : 'diff';
    }

    const rendererStatus = getRendererStatus(item);

    // Shared props for all text renderers
    const baseRendererProps = {
        asrText: item.transcriptText || '',
        correctedText: item.correctionText || '',
        status: rendererStatus,
        textAlign,
        transcriptionSize,
        showMeta,
        showVerboseMode,
        isAdmin,
        time: item.time,
        audioDuration: item.correctionData?.audioDuration,
        timing: item.correctionData?.timing,
        detectedLanguage: item.detectedLanguage,
        sttRequestLanguage: item.sttRequestLanguage,
        sourceLanguage,
    };

    const translationFontSizeClass = getTypographyClasses(transcriptionSize, 'translation', item.translationText || '');
    const adminMeta = isAdmin && showMeta && showVerboseMode;

    return (
        <div
            className={cn('w-full relative px-10 overflow-hidden', className)}
            style={{ height: `${layout.totalHeight}px` }}
        >
            {/* ── Debug Bounds Overlay ── */}
            {debugBounds && (
                <>
                    {/* Slot total boundary */}
                    <div
                        className="absolute inset-x-0 pointer-events-none z-50"
                        style={{
                            top: 0,
                            height: `${layout.totalHeight}px`,
                            border: '1px dashed rgba(148,163,184,0.5)',
                            borderRadius: 2,
                        }}
                    >
                        <span className="absolute top-0 left-1 text-[9px] font-mono text-slate-400/70 leading-none -translate-y-[1px]">slot {layout.totalHeight}px</span>
                    </div>
                    {/* Transcript line */}
                    {layout.originalOffset >= 0 && (
                        <div
                            className="absolute inset-x-10 pointer-events-none z-50"
                            style={{
                                top: `${layout.originalOffset}px`,
                                height: `${layout.lineHeight}px`,
                                border: '1px dashed rgba(96,165,250,0.7)',
                                borderRadius: 2,
                                backgroundColor: 'rgba(96,165,250,0.05)',
                            }}
                        >
                            <span className="absolute top-0 left-1 text-[9px] font-mono text-blue-400/80 leading-none">asr {layout.lineHeight}px</span>
                        </div>
                    )}
                    {/* Translation line */}
                    {layout.translationOffset >= 0 && (
                        <div
                            className="absolute inset-x-10 pointer-events-none z-50"
                            style={{
                                top: `${layout.translationOffset}px`,
                                height: `${layout.lineHeight}px`,
                                border: '1px dashed rgba(52,211,153,0.7)',
                                borderRadius: 2,
                                backgroundColor: 'rgba(52,211,153,0.05)',
                            }}
                        >
                            <span className="absolute top-0 left-1 text-[9px] font-mono text-emerald-400/80 leading-none">translation {layout.lineHeight}px</span>
                        </div>
                    )}
                    {/* Meta line */}
                    {layout.metaOffset >= 0 && (
                        <div
                            className="absolute inset-x-10 pointer-events-none z-50"
                            style={{
                                top: `${layout.metaOffset}px`,
                                height: `${layout.META_HEIGHT}px`,
                                border: '1px dashed rgba(251,146,60,0.7)',
                                borderRadius: 2,
                                backgroundColor: 'rgba(251,146,60,0.05)',
                            }}
                        >
                            <span className="absolute top-0 left-1 text-[9px] font-mono text-orange-400/80 leading-none">meta {layout.META_HEIGHT}px</span>
                        </div>
                    )}
                </>
            )}
            {/* ── Status Indicator (Reserved Space) ── */}
            {showStatusIndicator && (
                <div
                    className="absolute inset-x-10 z-10 flex flex-col justify-center"
                    style={{
                        top: `${layout.originalOffset}px`,
                        height: `${displayMode === 'both' ? layout.lineHeight * 2 + 4 : layout.lineHeight}px`
                    }}
                >
                    <TranscriptStatusIndicator
                        status={item.status!}
                        isLongWait={isLongWait}
                        align={textAlign}
                        transcriptionSize={transcriptionSize}
                    />
                </div>
            )}

            <div
                className={cn(
                    'transition-opacity duration-300 w-full relative h-full',
                    showStatusIndicator && 'opacity-0'
                )}
            >
                {/* ── Transcript Line (Absolute Pos) ── */}
                {layout.originalOffset >= 0 && (
                    <div
                        className="absolute inset-x-10 flex items-center"
                        style={{
                            top: `${layout.originalOffset}px`,
                            height: `${layout.lineHeight}px`
                        }}
                    >
                        <div
                            className={cn(
                                'w-full',
                                displayMode === 'both' && hasTranslation ? 'opacity-60' : 'opacity-100'
                            )}
                        >
                            {hasTranscriptText && (
                                <>
                                    {activeVariant === 'push' && <TranscriptLinePushRenderer {...baseRendererProps} showMeta={false} showVerboseMode={false} />}
                                    {activeVariant === 'ink' && <TranscriptLineInkRenderer {...baseRendererProps} showMeta={false} showVerboseMode={false} />}
                                    {activeVariant === 'diff' && <TranscriptLineDiffRenderer {...baseRendererProps} showMeta={false} showVerboseMode={false} />}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Translation Line (Absolute Pos - Reserved Space) ── */}
                {layout.translationOffset >= 0 && (
                    <div
                        className={cn(
                            "absolute inset-x-10 flex items-center",
                            textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-end' : 'justify-start',
                            translationFontSizeClass
                        )}
                        style={{
                            top: `${layout.translationOffset}px`,
                            height: `${layout.lineHeight}px`
                        }}
                    >
                        {hasTranslation ? (
                            <TranslationText
                                key={item.translationText}
                                text={item.translationText!}
                                staggerDelay={15}
                                className="text-foreground whitespace-nowrap overflow-hidden"
                            />
                        ) : (
                            // Stable placeholder for pending translation (Reserved Space)
                            <div className="w-1/3 h-1.5 bg-foreground/5 rounded-full animate-pulse" />
                        )}
                    </div>
                )}

                {/* ── Meta Line (Absolute Pos) ── */}
                {layout.metaOffset >= 0 && (
                    <div
                        className="absolute inset-x-10 flex items-center"
                        style={{
                            top: `${layout.metaOffset}px`,
                            height: `${layout.META_HEIGHT}px`
                        }}
                    >
                        <TraceDebugInfoRow
                            align={textAlign}
                            time={baseRendererProps.time}
                            audioDuration={adminMeta ? baseRendererProps.audioDuration : undefined}
                            timing={adminMeta ? baseRendererProps.timing : undefined}
                            pipelineSttDebugLabel={adminMeta ? pipelineSttDebugLabel : undefined}
                            adminMeta={adminMeta}
                            sourceLanguage={sourceLanguage}
                            sttRequestLanguage={baseRendererProps.sttRequestLanguage}
                            detectedLanguage={baseRendererProps.detectedLanguage}
                            className="w-full"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
