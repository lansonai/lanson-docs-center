import { cn } from '@/lib/utils';
import React, { useEffect } from 'react';
import { TraceDebugInfoRow } from '../TraceDebugInfoRow';
import { getPushLineViewportHeightPx, getTypographyClasses } from '@/components/transcription/typography';
import type { TranscriptLineBaseProps } from './types';

/**
 * TranscriptLinePushRenderer
 *
 * Full-line vertical push animation. Designed for mobile and low-end devices
 * where performance predictability matters most.
 *
 * Mechanism: overflow:hidden container + translateY(-100%/100%) so the old
 * line is physically "pushed out" by the incoming correction. No opacity fade.
 * Runs entirely on GPU compositor — zero layout recalculation during animation.
 */

export const TranscriptLinePushRenderer: React.FC<TranscriptLineBaseProps> = ({
    asrText,
    correctedText = '',
    status,
    transcriptionSize = 'M',
    textAlign = 'left',
    time,
    audioDuration,
    timing,
    detectedLanguage,
    sttRequestLanguage,
    sourceLanguage,
    showMeta = false,
    showVerboseMode = false,
    isAdmin = false,
    className,
}) => {
    const adminMeta = isAdmin && showMeta && showVerboseMode;
    const isStreaming = status === 'streaming';
    const isCorrecting = status === 'correcting';
    const isFinal = status === 'final';
    const showOld = isStreaming || status === 'pausing' || isCorrecting;
    const showNew = isCorrecting || isFinal;

    // IMPORTANT: Always use asrText for language detection to ensure consistent font size throughout the slot's lifecycle
    const fontSizeClass = getTypographyClasses(transcriptionSize, 'original', asrText);
    const viewportHeightPx = getPushLineViewportHeightPx(transcriptionSize);

    // Meta display logic - now managed by ActiveTranscriptSlot
    const shouldShowMetaRow =
        (showMeta && !!time) ||
        (adminMeta &&
            (!!audioDuration || !!timing || !!detectedLanguage || !!sttRequestLanguage));

    usePushStyles();

    const alignClass = textAlign === 'center' ? 'items-center text-center' : textAlign === 'right' ? 'items-end text-right' : 'items-start text-left';

    return (
        <div className={cn('flex flex-col w-full', alignClass, className)}>
            <div
                className="relative overflow-hidden w-full"
                style={{ height: viewportHeightPx }}
            >
                {/* ASR layer — exits upward when correction arrives */}
                {showOld && (
                    <div className={cn(
                        'absolute inset-0 flex items-center',
                        textAlign === 'center' ? 'justify-center text-center' : textAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left',
                        isCorrecting && 'push-exit',
                    )}>
                        <span key={asrText} className={cn('font-normal text-muted-foreground/60 tracking-tight whitespace-nowrap overflow-hidden asr-reveal', fontSizeClass)}>
                            {asrText}
                        </span>
                    </div>
                )}

                {/* Correction layer — enters from below */}
                {showNew && (
                    <div className={cn(
                        'absolute inset-0 flex items-center',
                        textAlign === 'center' ? 'justify-center text-center' : textAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left',
                        isCorrecting && 'push-enter',
                    )}>
                        <span className={cn('font-normal tracking-tight whitespace-nowrap overflow-hidden', fontSizeClass)}>
                            <HighlightedDiff original={asrText} updated={correctedText || asrText} />
                        </span>
                    </div>
                )}
            </div>

            {shouldShowMetaRow && (
                <TraceDebugInfoRow
                    align={textAlign}
                    time={showMeta ? time : undefined}
                    audioDuration={adminMeta ? audioDuration : undefined}
                    timing={adminMeta ? timing : undefined}
                    adminMeta={adminMeta}
                    sourceLanguage={sourceLanguage}
                    sttRequestLanguage={sttRequestLanguage}
                    detectedLanguage={detectedLanguage}
                    className="w-full flex-shrink-0 mt-1 pt-0"
                />
            )}
        </div>
    );
};

// ─── HighlightedDiff ──────────────────────────────────────────────────────────

const HighlightedDiff: React.FC<{ original: string; updated: string }> = ({ original, updated }) => (
    <span className="whitespace-nowrap inline-block overflow-hidden">
        {updated.split('').map((char, i) => {
            const isSame = i < original.length && char === original[i];
            return (
                <span
                    key={i}
                    className={cn(
                        'transition-colors duration-700 inline-block',
                        isSame ? 'text-muted-foreground/60' : 'text-primary font-medium'
                    )}
                >
                    {char === ' ' ? '\u00A0' : char}
                </span>
            );
        })}
    </span>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLE_ID = 'transcript-push-renderer-styles';
const STYLES = `
  @keyframes push-asr-reveal {
    from { opacity: 0; transform: translateX(6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .asr-reveal { animation: push-asr-reveal 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

  @keyframes push-line-mount {
    from { opacity: 0; transform: translateY(6px); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0);   filter: blur(0); }
  }
  .push-line-in { animation: push-line-mount 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

  @keyframes push-line-exit {
    from { transform: translateY(0); }
    to   { transform: translateY(-100%); }
  }
  @keyframes push-line-enter {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .push-exit  { animation: push-line-exit  0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  .push-enter { animation: push-line-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
`;

function usePushStyles() {
    useEffect(() => {
        if (typeof document === 'undefined') return;
        let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!tag) {
            tag = document.createElement('style');
            tag.id = STYLE_ID;
            document.head.appendChild(tag);
        }
        if (tag.textContent !== STYLES) tag.textContent = STYLES;
    }, []);
}
