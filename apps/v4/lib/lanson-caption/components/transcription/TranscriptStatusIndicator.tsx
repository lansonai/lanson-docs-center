/**
 * TranscriptStatusIndicator
 *
 * Shared status indicator for live transcription states.
 * Shows shimmer text for capturing / listening / transcribing / pending states.
 * Mirrors the original StatusIndicator + ShimmerText inside ActiveTranscriptionStream.
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TranscriptItem } from './types';

type Align = 'left' | 'center' | 'right';

export function ShimmerText({ text, className }: { text: string; className?: string }) {
    return (
        <span className={cn(
            "inline-flex animate-shimmer bg-[linear-gradient(110deg,#a1a1aa,45%,#f4f4f5,55%,#a1a1aa)] dark:bg-[linear-gradient(110deg,#71717a,45%,#e4e4e7,55%,#71717a)] bg-[length:200%_100%] bg-clip-text text-transparent capitalize",
            className
        )}>
            {text}
        </span>
    );
}

import { getTypographyClasses, type TypographySize } from './typography';

export interface TranscriptStatusIndicatorProps {
    status: TranscriptItem['status'];
    isLongWait?: boolean;
    align?: Align;
    transcriptionSize?: TypographySize;
    className?: string;
}

export function TranscriptStatusIndicator({
    status,
    isLongWait = false,
    align = 'left',
    transcriptionSize = 'M',
    className,
}: TranscriptStatusIndicatorProps) {
    const statusText = useMemo(() => {
        switch (status) {
            case 'error': return 'Network Error / Timeout';
            case 'listening': return 'Listening...';
            case 'transcribing':
            case 'pending':
                return isLongWait ? 'Finalizing...' : 'Transcribing...';
            case 'capturing': return 'Capturing...';
            default: return '';
        }
    }, [status, isLongWait]);

    const alignClass = align === 'center' ? 'items-center text-center' : align === 'right' ? 'items-end text-right' : 'items-start text-left';
    const justifyClass = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
    const fontSizeClass = getTypographyClasses(transcriptionSize, 'original', 'A');

    if (!statusText) return null;

    return (
        <div className={cn('flex flex-col w-full', alignClass, className)}>
            <div className={cn('flex flex-1 w-full min-h-[1.5em]', justifyClass, alignClass, fontSizeClass)}>
                <div key={status} className="animate-fade-in">
                    {status === 'error' && (
                        <span className="text-sm text-destructive/70 italic font-medium">{statusText}</span>
                    )}
                    {(status === 'listening' || status === 'transcribing' || status === 'pending' || status === 'capturing') && (
                        <div className={cn('flex opacity-90', justifyClass, alignClass)}>
                            <ShimmerText text={statusText} className={cn(fontSizeClass, 'font-semibold')} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
