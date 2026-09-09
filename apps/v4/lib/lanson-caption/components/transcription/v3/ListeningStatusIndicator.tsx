import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { ShimmerText } from '@/components/transcription/TranscriptStatusIndicator';
import { getTypographyClasses } from '@/components/transcription/typography';
import { useCaptureHysteresis } from '@/components/transcription/useCaptureHysteresis';

export type ListeningStatusIndicatorAlign = 'left' | 'center' | 'right';

export interface ListeningStatusIndicatorProps {
  isRecording: boolean;
  audioLevel: number;
  audioKind?: 'speech' | 'music' | 'noise' | 'silence';
  isWaitingForFinal: boolean;
  align?: ListeningStatusIndicatorAlign;
  tone?: 'on-light' | 'on-dark';
  isLongWait?: boolean;
  status?: 'listening' | 'capturing' | 'transcribing' | 'error';
  onSegmentComplete?: () => void;
  className?: string;
}

const MAX_SEGMENT_MS = 6000;

// Extract style constants to reduce JSX noise.
const ALIGN_CONFIG = {
  left: { block: 'self-start', justify: 'justify-start', padding: 'pl-0.5' },
  center: { block: 'self-center', justify: 'justify-center', padding: 'px-0.5' },
  right: { block: 'self-end', justify: 'justify-end', padding: 'pr-0.5' },
};

const PROGRESS_CONTAINER_THEME = cn(
  'relative h-2 w-full rounded-full p-[1px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] transition-all duration-300',
  'border border-black/[0.08] bg-gradient-to-b from-black/[0.04] to-black/[0.09]',
  'dark:border-white/[0.1] dark:from-white/[0.05] dark:to-white/[0.03] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]'
);

const PROGRESS_TRACK_THEME = cn(
  'relative h-full w-full overflow-hidden rounded-full bg-black/[0.06] shadow-[inset_0_1px_1px_rgba(0,0,0,0.08)]',
  'dark:bg-white/[0.07] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]'
);

const BAR_GRADIENT = cn(
  'absolute inset-y-0 left-0 h-full rounded-full origin-left',
  'bg-gradient-to-r from-indigo-500 from-15% via-indigo-400 via-50% to-violet-500/90 to-100%',
  'shadow-[0_0_12px_2px_rgba(99,102,241,0.25),inset_0_1px_0_rgba(255,255,255,0.25)]',
  'dark:shadow-[0_0_14px_1px_rgba(165,180,252,0.2),inset_0_1px_0_rgba(255,255,255,0.15)]'
);

export const ListeningStatusIndicator: React.FC<ListeningStatusIndicatorProps> = ({
  isRecording,
  audioLevel,
  audioKind,
  isWaitingForFinal,
  align = 'center',
  tone = 'on-light',
  isLongWait = false,
  status,
  onSegmentComplete,
  className,
}) => {
  const { t } = useTranslation('transcription');
  const isCapturing = useCaptureHysteresis(audioLevel);
  const dark = tone === 'on-dark';
  const cfg = ALIGN_CONFIG[align];

  // 1) Auto-complete timer (preview/demo only to keep UX in sync)
  useEffect(() => {
    if (!onSegmentComplete || isWaitingForFinal || !isRecording) return;
    const timer = setTimeout(onSegmentComplete, MAX_SEGMENT_MS);
    return () => clearTimeout(timer);
  }, [onSegmentComplete, isWaitingForFinal, isRecording]);

  // 2) Status text
  const statusText = useMemo(() => {
    if (status === 'error') return t('network_error');
    if (isWaitingForFinal) return isLongWait ? t('finalizing_transcript') : t('transcribing_status');
    if (audioKind === 'music') {
      return t('music_playing_status', { defaultValue: 'Music Playing' });
    }
    return isCapturing ? t('capturing_status') : t('listening');
  }, [status, isWaitingForFinal, isLongWait, audioKind, isCapturing, t]);

  // --- Render paths ---

  if (status === 'error') {
    return (
      <div className={cn('flex w-full min-h-[30px] items-center', cfg.justify, cfg.padding, dark && 'dark', className)}>
        <span className="text-destructive/70 italic font-medium">{statusText}</span>
      </div>
    );
  }

  if (!isRecording) return null;

  return (
    <div className={cn('flex w-full max-w-[120px] flex-col select-none gap-2', cfg.block, cfg.padding, dark && 'dark', className)}>

      {/* Top: status text */}
      <div className={cn('flex min-h-[30px] w-full items-center', cfg.justify)}>
        <div className={cn('relative h-8 overflow-hidden w-full max-w-[280px]')}>
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={statusText}
              className={cn('absolute inset-0 flex items-center', cfg.justify)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <ShimmerText
                text={statusText}
                className={cn(getTypographyClasses('S', 'original', statusText), 'letter-spacing-[0.4em] px-2')}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom: segment countdown bar */}
      <div className={cn(PROGRESS_CONTAINER_THEME, 'hidden')} aria-hidden>
        <div className={cn(PROGRESS_TRACK_THEME, align === 'right' && '-scale-x-100')}>
          <AnimatePresence>
            {!isWaitingForFinal && (
              <motion.div
                className={BAR_GRADIENT}
                initial={{ width: '0%', opacity: 0.4 }}
                animate={{ width: '100%', opacity: 0.8 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: MAX_SEGMENT_MS / 1000, ease: 'linear' }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ListeningStatusIndicator;