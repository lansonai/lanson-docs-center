import { cn } from '@/lib/utils';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TraceDebugInfoRow } from '../TraceDebugInfoRow';
import { getTypographyClasses } from '@/components/transcription/typography';
import type { TranscriptLineBaseProps, TranscriptLineStatus } from './types';
import { isCjkChar } from '@/components/transcription/utils';

/**
 * TranscriptLineDiffRenderer
 *
 * Segment-level partial diff animation with smooth width interpolation.
 * The main (highest-performance) production renderer for capable devices.
 * 
 * FIX: Included whitespace preservation using \u00A0 for characters.
 * FIX: Improved layout stability using flex and w-full.
 */

export const TranscriptLineDiffRenderer: React.FC<TranscriptLineBaseProps> = ({
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

    // Use centralized typography source of truth
    // IMPORTANT: Always use asrText for language detection to ensure consistent font size throughout the slot's lifecycle
    const fontSizeClass = getTypographyClasses(transcriptionSize, 'original', asrText);

    const segments = useMemo(
        () => getDiffSegments(asrText, correctedText || asrText),
        [asrText, correctedText]
    );

    const shouldShowMetaRow =
        (showMeta && !!time) ||
        (adminMeta &&
            (!!audioDuration || !!timing || !!detectedLanguage || !!sttRequestLanguage));

    useDiffStyles();

    const alignClass = textAlign === 'center' ? 'items-center text-center' : textAlign === 'right' ? 'items-end text-right' : 'items-start text-left';

    return (
        <div className={cn('flex flex-col w-full', alignClass, className)}>
            <div key={asrText} className={cn(
                'flex items-baseline w-full transition-all duration-500 ease-out flex-nowrap overflow-hidden',
                textAlign === 'center' ? 'justify-center text-center' : textAlign === 'right' ? 'justify-end text-right' : 'justify-start text-left',
                fontSizeClass
            )}>
                {segments.map((seg, i) => (
                    <div key={i} className="flex-shrink-0 whitespace-nowrap">
                        {seg.type === 'stable' ? (
                            <span className="text-foreground transition-all duration-300 inline-block">
                                {seg.text?.split('').map((char, index) => (
                                    <span
                                        key={index}
                                        className="diff-asr-in opacity-0"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        {char === ' ' ? '\u00A0' : char}
                                    </span>
                                ))}
                            </span>
                        ) : (
                            <ChangeSegment
                                oldText={seg.oldText || ''}
                                newText={seg.newText || ''}
                                status={status}
                            />
                        )}
                    </div>
                ))}
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

// ─── ChangeSegment ─────────────────────────────────────────────────────────────

const ChangeSegment: React.FC<{
    oldText: string;
    newText: string;
    status: TranscriptLineStatus;
}> = ({ oldText, newText, status }) => {
    const oldRef = useRef<HTMLSpanElement>(null);
    const newRef = useRef<HTMLSpanElement>(null);
    const [width, setWidth] = useState<string>('auto');

    const isStreaming = status === 'streaming';
    const isCorrecting = status === 'correcting';
    const isPausing = status === 'pausing';
    const isFinal = status === 'final';

    useLayoutEffect(() => {
        // Only animate width when there is an actual text change.
        // If oldText === newText, no diffing happened — skip to avoid spurious jitter.
        if (oldText === newText) {
            setWidth('auto');
            return;
        }
        if (status === 'correcting') {
            const oldW = oldRef.current?.getBoundingClientRect().width ?? 0;
            const newW = newRef.current?.getBoundingClientRect().width ?? 0;
            setWidth(`${oldW}px`);
            const raf = requestAnimationFrame(() => setWidth(`${newW}px`));
            return () => cancelAnimationFrame(raf);
        } else if (status === 'final') {
            setWidth('auto');
        }
    }, [status, oldText, newText]);

    return (
        <span
            className="relative inline-flex items-center min-w-[4px] mx-0.5 align-baseline transition-[width] duration-&lsqb;800ms&rsqb; ease-&lsqb;cubic-bezier(0.4,0,0.2,1)&rsqb; overflow-hidden"
            style={{ width }}
        >
            {/* Old text — exits upward */}
            {(isStreaming || isCorrecting || isPausing) && (
                <span
                    ref={oldRef}
                    className={cn(
                        'inline-block whitespace-nowrap text-foreground/40 line-through decoration-amber-500/30 font-inherit leading-inherit',
                        isCorrecting ? 'diff-partial-exit absolute left-0 top-0' : 'relative'
                    )}
                >
                    {oldText.split('').map((char, i) => (
                        <span
                            key={i}
                            className={cn('inline-block', isStreaming && 'diff-asr-in')}
                            style={{ animationDelay: isStreaming ? `${i * 30}ms` : '0ms' }}
                        >
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    ))}
                </span>
            )}

            {/* Corrected text — enters from below */}
            {(isCorrecting || isFinal) && (
                <span
                    ref={newRef}
                    className={cn(
                        'inline-block whitespace-nowrap text-primary leading-inherit',
                        isCorrecting ? 'diff-partial-enter' : 'relative'
                    )}
                >
                    {newText.split('').map((char, i) => (
                        <span
                            key={i}
                            className={cn('inline-block', isFinal && 'diff-asr-in opacity-0')}
                            style={{ animationDelay: isFinal ? `${i * 30}ms` : '0ms' }}
                        >
                            {char === ' ' ? '\u00A0' : char}
                        </span>
                    ))}
                </span>
            )}
        </span>
    );
};

// ─── Diff Algorithm ───────────────────────────────────────────────────────────

interface DiffSegment {
    type: 'stable' | 'change';
    text?: string;
    oldText?: string;
    newText?: string;
}

/**
 * Returns true if the character is part of a non-CJK word (Latin letters, numbers).
 */
const isLatinWordChar = (char: string) =>
    char && /[\p{L}\p{N}]/u.test(char) && !isCjkChar(char);

function getDiffSegments(oldStr: string, newStr: string): DiffSegment[] {
    // 1. Initial character-level diff
    const segments: DiffSegment[] = [];
    let i = 0, j = 0;

    while (i < oldStr.length || j < newStr.length) {
        if (i < oldStr.length && j < newStr.length && oldStr[i] === newStr[j]) {
            let stable = '';
            while (i < oldStr.length && j < newStr.length && oldStr[i] === newStr[j]) {
                stable += oldStr[i]; i++; j++;
            }
            segments.push({ type: 'stable', text: stable });
        } else {
            let nextI = i, nextJ = j, found = false;
            for (let si = i; si < oldStr.length && !found; si++) {
                for (let sj = j; sj < newStr.length && !found; sj++) {
                    if (oldStr[si] === newStr[sj]) { nextI = si; nextJ = sj; found = true; }
                }
            }
            if (found) {
                segments.push({ type: 'change', oldText: oldStr.substring(i, nextI), newText: newStr.substring(j, nextJ) });
                i = nextI; j = nextJ;
            } else {
                segments.push({ type: 'change', oldText: oldStr.substring(i), newText: newStr.substring(j) });
                i = oldStr.length; j = newStr.length;
            }
        }
    }

    // 2. Post-processing: Expand changes to word boundaries for non-CJK text
    // We iterate backwards to simplify splicing if needed, but here we just modify in-place.
    for (let k = 0; k < segments.length; k++) {
        const seg = segments[k];
        if (seg.type !== 'change') continue;

        // Check if change starts or ends in the middle of a word
        const prev = segments[k - 1];
        const next = segments[k + 1];

        // Expand backward: if change starts with word char and prev stable ends with word char
        if (prev && prev.type === 'stable' && prev.text) {
            const lastChar = prev.text[prev.text.length - 1];
            const firstCharOld = seg.oldText?.[0] || '';
            const firstCharNew = seg.newText?.[0] || '';

            if (isLatinWordChar(lastChar) && (isLatinWordChar(firstCharOld) || isLatinWordChar(firstCharNew))) {
                // Steal the word suffix from the previous stable segment
                let suffix = '';
                let p = prev.text.length - 1;
                while (p >= 0 && isLatinWordChar(prev.text[p])) {
                    suffix = prev.text[p] + suffix;
                    p--;
                }
                if (suffix) {
                    prev.text = prev.text.substring(0, p + 1);
                    seg.oldText = suffix + (seg.oldText || '');
                    seg.newText = suffix + (seg.newText || '');
                }
            }
        }

        // Expand forward: if change ends with word char and next stable starts with word char
        if (next && next.type === 'stable' && next.text) {
            const firstChar = next.text[0];
            const lastCharOld = seg.oldText?.[seg.oldText.length - 1] || '';
            const lastCharNew = seg.newText?.[seg.newText.length - 1] || '';

            if (isLatinWordChar(firstChar) && (isLatinWordChar(lastCharOld) || isLatinWordChar(lastCharNew))) {
                // Steal the word prefix from the next stable segment
                let prefix = '';
                let p = 0;
                while (p < next.text.length && isLatinWordChar(next.text[p])) {
                    prefix += next.text[p];
                    p++;
                }
                if (prefix) {
                    next.text = next.text.substring(p);
                    seg.oldText = (seg.oldText || '') + prefix;
                    seg.newText = (seg.newText || '') + prefix;
                }
            }
        }
    }

    // 3. Clean up and Merge adjacent same-type segments
    const finalSegments: DiffSegment[] = [];
    for (const seg of segments) {
        // Remove genuinely empty segments
        if (seg.type === 'stable' && !seg.text) continue;
        if (seg.type === 'change' && !seg.oldText && !seg.newText) continue;

        const last = finalSegments[finalSegments.length - 1];
        if (last && last.type === seg.type) {
            if (seg.type === 'stable') {
                last.text = (last.text || '') + (seg.text || '');
            } else {
                last.oldText = (last.oldText || '') + (seg.oldText || '');
                last.newText = (last.newText || '') + (seg.newText || '');
            }
        } else {
            finalSegments.push(seg);
        }
    }

    return finalSegments;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLE_ID = 'transcript-diff-renderer-styles';
const STYLES = `
  @keyframes diff-asr-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  .diff-asr-in { animation: diff-asr-in 0.3s ease-out forwards; }

  @keyframes diff-line-mount {
    from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
  }
  .diff-line-in { animation: diff-line-mount 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }

  @keyframes diff-seg-exit {
    from { opacity: 1; transform: translateY(0);    filter: blur(0); }
    to   { opacity: 0; transform: translateY(-40px); filter: blur(10px); }
  }
  @keyframes diff-seg-enter {
    from { opacity: 0; transform: translateY(40px); filter: blur(10px); }
    to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
  }
  .diff-partial-exit  { animation: diff-seg-exit  0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
  .diff-partial-enter { animation: diff-seg-enter 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
`;

function useDiffStyles() {
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
