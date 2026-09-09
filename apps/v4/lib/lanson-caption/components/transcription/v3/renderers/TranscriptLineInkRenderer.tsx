import React from 'react';
import { cn } from '@/lib/utils';
import { AtomicInkText } from '@/components/animations/ink/AtomicInkText';
import { getTypographyClasses } from '@/components/transcription/typography';
import { TranscriptLineBaseProps } from './types';
import { TraceDebugInfoRow } from '../TraceDebugInfoRow';

/**
 * TranscriptLineInkRenderer
 *
 * Highest-tier renderer. Skips ASR display entirely — only renders when
 * corrected text is available, using AtomicInkText's character-level ink
 * reveal animation.
 *
 * NOTE: This component REQUIRES the following to be mounted at the app root
 * (or preview root) once:
 *   - <InkFilter /> (from '@/components/animations/ink/InkFilter')
 *   - <InkStyles /> (from '@/components/animations/ink/InkStyles')
 *   - <AnimationKeyframes /> (from '@/components/animations/AnimationKeyframes')
 */

export const TranscriptLineInkRenderer: React.FC<TranscriptLineBaseProps> = ({
    correctedText,
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
    const fontSizeClass = getTypographyClasses(transcriptionSize, 'original', correctedText || '');

    const shouldShowMetaRow =
        (showMeta && !!time) ||
        (adminMeta &&
            (!!audioDuration || !!timing || !!detectedLanguage || !!sttRequestLanguage));

    return (
        <div className={cn('flex flex-col w-full', textAlign === 'center' ? 'items-center text-center' : textAlign === 'right' ? 'items-end text-right' : 'items-start text-left', className)}>
            <div className={cn('whitespace-nowrap overflow-hidden min-h-[1.5em] w-full', fontSizeClass)}>
                {correctedText ? (
                    <AtomicInkText
                        key={correctedText}
                        text={correctedText}
                        style="reveal"
                        staggerDelay={40}
                        baseDelay={200}
                        duration={600}
                        className="text-foreground"
                    />
                ) : (
                    <span className="opacity-0 select-none">{'　'}</span>
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
