/**
 * Single layout wrapper around v3 {@link ActiveTranscriptionStream} (standard live board).
 * OBS / Browser Source always uses this path — not v4 ink — regardless of in-app `LiveTranscription` variant.
 * Full-viewport, bottom-aligned; transparent page background handled by parent.
 */

import type { TranscriptItem } from '@/components/transcription/types';
import { getSlotHeight } from '@/components/transcription/typography';
import { ActiveTranscriptionStream } from '@/components/transcription/v3/ActiveTranscriptionStream';
import type { TranscriptDisplayMode } from '@/components/transcription/v3/HistoryTranscriptLineItem';
import { cn } from '@/lib/utils';

export interface OverlayTranscriptionShellProps {
  activeItems: TranscriptItem[];
  textAlign?: 'left' | 'center' | 'right';
  transcriptionSize?: 'S' | 'M' | 'L';
  maxSlots?: number;
  displayMode?: TranscriptDisplayMode;
  showMeta?: boolean;
  /** 'dark' (default) = opaque dark background suitable for OBS; 'light' = white/bright background */
  theme?: 'dark' | 'light';
  className?: string;
}

export function OverlayTranscriptionShell({
  activeItems,
  textAlign = 'center',
  transcriptionSize = 'L',
  maxSlots = 3,
  displayMode = 'both',
  showMeta = false,
  theme = 'dark',
  className,
}: OverlayTranscriptionShellProps) {
  const slotHeight = getSlotHeight(transcriptionSize, displayMode, showMeta, false, 1, false);
  const isLight = theme === 'light';

  return (
    <div
      className={cn(
        'w-full h-full min-h-screen flex flex-col justify-end pointer-events-none',
        isLight ? '' : 'dark',
        className,
      )}
      data-transcription-theme={isLight ? 'pearl' : 'default'}
    >
      <div className="w-full max-w-[1300px] mx-auto px-6 md:px-10 pb-[min(10vh,3rem)] shrink-0">
        <ActiveTranscriptionStream
          activeItems={activeItems}
          maxSlots={maxSlots}
          textAlign={textAlign}
          transcriptionSize={transcriptionSize}
          displayMode={displayMode}
          showMeta={showMeta}
          showTrace={false}
          showVerboseMode={false}
          compact
          isRecording={false}
          isSpeechDetected={false}
          slotHeight={slotHeight}
          tone={isLight ? 'on-light' : 'on-dark'}
        />
      </div>
    </div>
  );
}
