/**
 * ActiveTranscriptionStream — Standard Variant
 *
 * Layout: fixed-height container, items stack from the bottom upward.
 * New items enter from below and push existing ones up via layout animation.
 *
 * Architecture (single-file, self-contained):
 *   §1  Types & Constants
 *   §2  Lookup Tables (fonts, placeholders, alignment)
 *   §3  Pure Helpers
 *   §4  Hooks
 *   §5  Sub-components (ShimmerText, ItemContent)
 *   §6  Main Component
 *   §7  Styles
 */

import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';
import { useCreation } from 'ahooks';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActiveTranscriptSlot } from './ActiveTranscriptSlot';
import { ActiveTranscriptLineItem } from './ActiveTranscriptLineItem';
import { AutoScrollText } from './AutoScrollText';
import type { TranscriptDisplayMode } from './HistoryTranscriptLineItem';
import { TraceDebugInfoRow } from './TraceDebugInfoRow';
import { TranslationText } from './TranslationText';
import type { TranscriptItem } from '@/components/transcription/types';
import { getGridGapPx, getPlaceholderHeight, getSlotHeight, getTypographyClasses, LAYOUT_CONFIG } from '@/components/transcription/typography';
import { computeDiff, isCjkText } from '@/components/transcription/utils';
import { ListeningStatusIndicator } from './ListeningStatusIndicator';
import type { PipelineSttDebugLabel } from '@/lib/realtime-transcription/buildTranscriptionFromImeDevPreset';

// ═════════════════════════════════════════════════════════════════════════════
// §1  Types & Constants
// ═════════════════════════════════════════════════════════════════════════════

export interface ActiveTranscriptionStreamProps {
  activeItems: TranscriptItem[];
  maxSlots?: number;
  pageIndexOverride?: number;
  textAlign?: 'left' | 'center' | 'right';
  transcriptionSize?: 'S' | 'M' | 'L';
  className?: string;
  showMeta?: boolean;
  showTrace?: boolean;
  showVerboseMode?: boolean;
  displayMode?: TranscriptDisplayMode;
  isRecording?: boolean;
  isSpeechDetected?: boolean;
  /** Normalized mic level 0–1 (same source as subscribeToAudioLevel; throttled in service). */
  audioLevel?: number;
  audioKind?: 'speech' | 'music' | 'noise' | 'silence';
  columns?: number;
  /** Dynamic height for each slot, calculated based on size and displayMode. */
  slotHeight?: number;
  /** Tone for ListeningStatusIndicator (on-light / on-dark). */
  tone?: 'on-light' | 'on-dark';
  /** Admin meta: STT path is always POST /v3/realtime/transcription (authenticated). */
  pipelineSttDebugLabel?: PipelineSttDebugLabel;
  /**
   * `import.meta.env.DEV` or Supabase admin — with {@link showVerboseMode}, enables debug meta on the row.
   * Does nothing without Meta (time) on; does not replace the Meta toggle.
   */
  transcriptionDebugEligible?: boolean;
  /** User-selected source language; left side of admin `AUTO/EN` meta (with {@link showVerboseMode}). */
  sourceLanguage?: string;
  /**
   * When true with {@link displayMode} `both`, each row uses {@link ActiveTranscriptSlot} + `variant="diff"`
   * (same as ActiveTranscriptSlotPreview) instead of ActiveTranscriptLineItem + TranslationText.
   * Used for ink variant bilingual so embed/host `bilingual` matches the slot diff renderer.
   */
  useBilingualActiveSlotDiff?: boolean;
}

type Size = 'S' | 'M' | 'L';
type Align = 'left' | 'center' | 'right';

/** Duration for the page-exit animation (ms). CSS must match. */
const PAGE_EXIT_DURATION_MS = 800;
/** Grace period before clearing the outgoing layer (avoids flicker). */
const PAGE_EXIT_CLEANUP_MS = PAGE_EXIT_DURATION_MS + 50;
/** How long to suppress "Listening..." when prev slot is still busy. */
const SUPPRESSION_THRESHOLD_MS = 2000;
/** Older visible rows fade progressively; the newest row stays fully bright. */
const HISTORY_OPACITY_MIN = 0.5;
const HISTORY_OPACITY_STEP = 0.1;

// ═════════════════════════════════════════════════════════════════════════════
// §2  Lookup Tables
// ═════════════════════════════════════════════════════════════════════════════

const ALIGN_CLASS: Record<Align, string> = {
  center: 'justify-center text-center',
  right: 'justify-end text-right',
  left: 'justify-start text-left',
};

const SHIMMER_ALIGN: Record<Align, Align> = {
  center: 'center',
  right: 'right',
  left: 'left',
};

// ═════════════════════════════════════════════════════════════════════════════
// §3  Pure Helpers
// ═════════════════════════════════════════════════════════════════════════════

function itemHasContent(item: TranscriptItem): boolean {
  return !!(item.correctionText || item.transcriptText || item.translationText);
}

function currentSharedMetaCandidate(items: TranscriptItem[]): TranscriptItem | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) {
    const item = items[i];
    if (!item) continue;
    if (item.time || item.correctionData?.timing) return item;
  }
  return items.at(-1);
}

/** Resolve alignment string to the shimmer-compatible enum. */
function resolveShimmerAlign(alignClass: string): Align {
  if (alignClass.includes('center')) return 'center';
  if (alignClass.includes('end')) return 'right';
  return 'left';
}

function getHistorySlotOpacity(total: number, index: number): number {
  const depthFromNewest = total - 1 - index;
  if (depthFromNewest <= 0) return 1;
  return Math.max(HISTORY_OPACITY_MIN, 1 - depthFromNewest * HISTORY_OPACITY_STEP);
}

// §4 Hooks
// ═════════════════════════════════════════════════════════════════════════════

function useTranscriptionStateSuppression({
  lastItem,
  isSpeechDetected,
  thresholdMs = SUPPRESSION_THRESHOLD_MS,
}: {
  lastItem?: TranscriptItem;
  isSpeechDetected: boolean;
  thresholdMs?: number;
}) {
  const [shouldSuppress, setShouldSuppress] = useState(false);
  const [isLongWait, setIsLongWait] = useState(false);
  const lastItemIdRef = useRef<string | number | null>(null);

  const isBusy = lastItem?.status === 'transcribing' || lastItem?.status === 'pending';
  const hasText = itemHasContent(lastItem ?? ({} as TranscriptItem));

  useEffect(() => {
    if (!lastItem) {
      setShouldSuppress(false);
      setIsLongWait(false);
      return;
    }

    if (lastItem.id !== lastItemIdRef.current && isBusy && !hasText) {
      setShouldSuppress(true);
      setIsLongWait(false);
      lastItemIdRef.current = lastItem.id;

      const timer = setTimeout(() => {
        setShouldSuppress(false);
        setIsLongWait(true);
      }, thresholdMs);

      return () => clearTimeout(timer);
    }

    if (hasText || !isBusy) {
      setShouldSuppress(false);
      setIsLongWait(false);
    }

    if (isSpeechDetected) {
      setShouldSuppress(false);
    }
  }, [lastItem?.id, isBusy, hasText, isSpeechDetected, thresholdMs]);

  return { shouldSuppress, isLongWait };
}

// ═════════════════════════════════════════════════════════════════════════════
// §4.5 Smart Auto Scroll & Eviction Hook
// ═════════════════════════════════════════════════════════════════════════════

function useSmartContinuousScroll(
  activeItems: TranscriptItem[],
  maxSlots: number,
  isSpeechDetected: boolean,
  isRecording: boolean
) {
  const [startIndex, setStartIndex] = useState(0);

  // Reset when stream is cleared
  useEffect(() => {
    if (activeItems.length === 0) {
      setStartIndex(0);
    }
  }, [activeItems.length]);

  const lastItem = activeItems[activeItems.length - 1];

  // Create a signature to detect meaningful content/state changes
  const contentSignature = lastItem
    ? `${lastItem.id}-${lastItem.transcriptText}-${lastItem.correctionText}-${lastItem.translationText}-${lastItem.status}`
    : '';

  const lastChangeTimeRef = useRef(Date.now());

  useEffect(() => {
    lastChangeTimeRef.current = Date.now();
  }, [contentSignature]);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentLength = activeItems.length;
      if (currentLength === 0) return;

      setStartIndex((prev) => {
        let next = prev;

        // [Fix] Boundary Guard: If the array shrank (e.g., due to paging or backend change),
        // reset startIndex to a valid range immediately to prevent negative slotsUsed.
        if (next >= currentLength) {
          next = Math.max(0, currentLength - 1);
        }

        // [Refinement] Account for the 'Listening' slot in our occupancy calculation.
        // This is the "compensation" for a new voice segment before ASR results arrive.
        const hasPendingSlot = isRecording && isSpeechDetected;
        const effectiveItemsCount = currentLength + (hasPendingSlot ? 1 : 0);
        const slotsUsed = effectiveItemsCount - next;

        // ── Rule 1: Forced Eviction (Overflow Protection) ──
        const overflowStart = effectiveItemsCount - maxSlots;
        if (next < overflowStart) {
          next = Math.max(0, overflowStart);
        }

        // ── Rule 2: Proactive Shift (The "Idle Window") ──
        if (slotsUsed >= maxSlots) {
          const timeSinceChange = Date.now() - lastChangeTimeRef.current;
          const isIdle = !isSpeechDetected || timeSinceChange > 1500;
          const isReadTimePassed = timeSinceChange > 2500;

          if (isIdle && isReadTimePassed) {
            next = Math.max(0, currentLength - 1);
          }
        }

        return next;
      });
    }, 400);

    return () => clearInterval(interval);
  }, [activeItems.length, maxSlots, isSpeechDetected, isRecording]);

  // Safety boundary
  return Math.max(0, Math.min(startIndex, Math.max(0, activeItems.length - 1)));
}

// ═════════════════════════════════════════════════════════════════════════════
// §5  Sub-components
// ═════════════════════════════════════════════════════════════════════════════

function ShimmerText({ text }: { text: string }) {
  return (
    <span className="inline-flex animate-shimmer bg-[linear-gradient(110deg,#a1a1aa,45%,#f4f4f5,55%,#a1a1aa)] dark:bg-[linear-gradient(110deg,#71717a,45%,#e4e4e7,55%,#71717a)] 
        bg-[length:200%_100%] bg-clip-text text-transparent text-lg capitalize">
      {text}
    </span>
  );
}

// ── StatusIndicator ───────────────────────────────────────────────────────────

interface StatusIndicatorProps {
  status: TranscriptItem['status'];
  isLongWait?: boolean;
  align: Align;
}

function StatusIndicator({ status, isLongWait = false, align }: StatusIndicatorProps) {
  const { t } = useTranslation('transcription');
  const isMobile = useIsMobile();
  const statusText = useMemo(() => {
    switch (status) {
      case 'error': return t('network_error');
      case 'listening': return t('listening');
      case 'transcribing':
      case 'pending':
        return isLongWait ? t('finalizing_transcript') : t('transcribing_status');
      case 'capturing': return t('capturing_status');
      default: return '';
    }
  }, [status, isLongWait, t]);

  const alignClass = useMemo(() => {
    return align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  }, [align]);

  return (
    <div className={cn('w-full h-full flex items-start px-12', alignClass)}>
      <div
        key={status}
        className="animate-fade-in"
      >
        {status === 'error' && (
          <span className="text-destructive/70 italic font-medium">
            {statusText}
          </span>
        )}
        {(status === 'listening' || status === 'transcribing' || status === 'pending' || status === 'capturing') && (
          <div className={cn(
            'flex items-center',
            align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start',
          )}>
            <AutoScrollText enabled={isMobile} className="max-w-full">
              <ShimmerText text={statusText} />
            </AutoScrollText>
          </div>
        )}
      </div>
    </div>
  );
}

// ── ItemContent ──────────────────────────────────────────────────────────────

interface ItemContentProps {
  item: TranscriptItem;
  align: Align;
  alignClass: string;
  transcriptionSize: Size;
  displayMode: TranscriptDisplayMode;
  showMeta: boolean;
  showTrace: boolean;
  showVerboseMode: boolean;
  slotHeight: number;
  isLongWait?: boolean;
  pipelineSttDebugLabel?: PipelineSttDebugLabel;
  transcriptionDebugEligible: boolean;
  sourceLanguage?: string;
  useBilingualActiveSlotDiff?: boolean;
}

function ItemContent({
  item,
  align,
  alignClass,
  transcriptionSize,
  displayMode,
  showMeta,
  showTrace,
  showVerboseMode,
  slotHeight,
  isLongWait = false,
  pipelineSttDebugLabel,
  transcriptionDebugEligible,
  sourceLanguage,
  useBilingualActiveSlotDiff = false,
}: ItemContentProps) {
  const isMobile = useIsMobile();

  const isOriginalCjk = isCjkText(item.correctionText || item.transcriptText || '');
  const isTranslationCjk = isCjkText(item.translationText || '');

  // 使用新的 typography 配置
  const fontSize = getTypographyClasses(
    transcriptionSize,
    'original',
    item.correctionText || item.transcriptText || '',
    isMobile
  );
  const transFontSize = getTypographyClasses(
    transcriptionSize,
    'translation',
    item.translationText || '',
    isMobile
  );
  const placeholders = {
    transcript: getPlaceholderHeight(transcriptionSize, 'transcript', isMobile),
    translation: getPlaceholderHeight(transcriptionSize, 'translation', isMobile)
  };
  const shimmerAlign = resolveShimmerAlign(alignClass);
  const allowTranslationWrap = isMobile && displayMode === 'translation';

  // ── Content state ──
  const originalText = item.correctionText || item.transcriptText || '';
  const prevCorrectionText = item.correctionData?.previousCorrectionText;

  // 计算 original words：三分支逻辑
  // 1. previousCorrectionText 存在且不等于 current -> diff（只对变化部分动画）
  // 2. previousCorrectionText 存在且等于 current -> stable（不触发 new 动画，避免 completed 时重播）
  // 3. previousCorrectionText 不存在 -> first（首次出现，整句 new）
  // NOTE: Must be called before any early returns to comply with Rules of Hooks.
  const originalWords = useMemo(() => {
    if (!originalText) return [];

    if (prevCorrectionText && prevCorrectionText.trim()) {
      if (prevCorrectionText !== originalText) {
        // diff: 有变化，计算差异
        return computeDiff(prevCorrectionText, originalText, `corr_${item.id}`);
      } else {
        // stable: 无变化（completed 最终 emit），使用 stable 分支避免重新触发动画
        return computeDiff(originalText, originalText, `corr_${item.id}`);
      }
    } else {
      // first: 首次出现
      return computeDiff('', originalText, `corr_${item.id}`);
    }
  }, [originalText, prevCorrectionText, item.id]);

  // ── Empty state: loading / error / status indicators ──
  if (!itemHasContent(item)) {
    return (
      <StatusIndicator
        status={item.status}
        isLongWait={isLongWait}
        align={shimmerAlign}
      />
    );
  }

  if (useBilingualActiveSlotDiff && displayMode === 'both') {
    return (
      <div
        className="w-full h-full flex flex-col justify-center min-h-0"
        style={{ height: slotHeight }}
      >
        <ActiveTranscriptSlot
          item={item}
          variant="diff"
          textAlign={align}
          transcriptionSize={transcriptionSize}
          displayMode="both"
          showMeta={showMeta}
          showVerboseMode={showVerboseMode}
          isAdmin={transcriptionDebugEligible}
          pipelineSttDebugLabel={pipelineSttDebugLabel}
          isLongWait={isLongWait}
          sourceLanguage={sourceLanguage}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full h-full flex flex-col justify-center px-10"
      style={{ height: slotHeight }}
    >
      {/* Region 1: Original / Correction — Only shown if not in translation-only mode */}
      {displayMode !== 'translation' && (
        <div
          className={cn(
            'w-full flex-shrink-0 transition-opacity duration-300 truncate',
            alignClass,
            displayMode === 'both' ? 'opacity-60' : 'opacity-100',
          )}
        >
          {originalText ? (
            <AutoScrollText enabled={isMobile} className="max-w-full">
              <ActiveTranscriptLineItem
                words={originalWords}
                showTrace={showTrace}
                className={fontSize}
                transcriptionSize={transcriptionSize}
              />
            </AutoScrollText>
          ) : (
            <div className={placeholders.transcript} />
          )}
        </div>
      )}

      {/* Region 2: Translation — Only shown if not in transcript-only mode */}
      {displayMode !== 'transcript' && (
        <div
          className={cn(
            'w-full flex-shrink-0',
            !allowTranslationWrap && 'truncate',
            alignClass,
          )}
          style={displayMode === 'both' ? { marginTop: `${LAYOUT_CONFIG.LINE_GAP}px` } : undefined}
        >
          {item.translationText ? (
            <AutoScrollText enabled={isMobile && !allowTranslationWrap} className="max-w-full">
              <TranslationText
                text={item.translationText}
                className={transFontSize}
                staggerDelay={20}
                allowWrap={allowTranslationWrap}
              />
            </AutoScrollText>
          ) : (
            <div className={placeholders.translation} />
          )}
        </div>
      )}

      {/* Region 3: Meta row — time when Meta on; admin verbose row when Meta + debug + dev/admin */}
      {showMeta &&
        (!!item.time || (showVerboseMode && transcriptionDebugEligible)) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: isMobile ? 1.5 : 0 }}
          className="w-full flex-shrink-0"
          style={{
            marginTop: (displayMode === 'both' || (displayMode === 'transcript' && originalText) || (displayMode === 'translation' && item.translationText))
              ? `${LAYOUT_CONFIG.META_GAP}px`
              : 0
          }}
        >
          <MetaRow
            item={item}
            align={align}
            showVerboseMode={showVerboseMode}
            pipelineSttDebugLabel={pipelineSttDebugLabel}
            transcriptionDebugEligible={transcriptionDebugEligible}
            sourceLanguage={sourceLanguage}
          />
        </motion.div>
      )}
    </div>
  );
}

// ── MetaRow (verbose timing badges) ──────────────────────────────────────────

function MetaRow({
  item,
  align,
  showVerboseMode,
  pipelineSttDebugLabel,
  transcriptionDebugEligible,
  sourceLanguage,
  fixedHeight = true,
  summaryOnly = false,
}: {
  item: TranscriptItem;
  align: Align;
  showVerboseMode: boolean;
  pipelineSttDebugLabel?: PipelineSttDebugLabel;
  transcriptionDebugEligible: boolean;
  sourceLanguage?: string;
  fixedHeight?: boolean;
  summaryOnly?: boolean;
}) {
  const timing = item.correctionData?.timing;
  const adminMeta = showVerboseMode && transcriptionDebugEligible;

  const hasAnyVisibleToken =
    !!item.time || adminMeta;

  if (!hasAnyVisibleToken) return null;

  return (
    <TraceDebugInfoRow
      className="w-full flex-shrink-0 pt-0 animate-slide-down-10 delay-300"
      align={align}
      time={item.time}
      audioDuration={adminMeta ? item.correctionData?.audioDuration : undefined}
      timing={adminMeta ? timing : undefined}
      pipelineSttDebugLabel={adminMeta ? pipelineSttDebugLabel : undefined}
      adminMeta={adminMeta}
      sourceLanguage={sourceLanguage}
      sttRequestLanguage={item.sttRequestLanguage}
      detectedLanguage={item.detectedLanguage}
      fixedHeight={fixedHeight}
      summaryOnly={summaryOnly}
    />
  );
}


// ═════════════════════════════════════════════════════════════════════════════
// §6  Main Component
// ═════════════════════════════════════════════════════════════════════════════

export function ActiveTranscriptionStream({
  activeItems,
  maxSlots = 3,
  textAlign = 'left',
  transcriptionSize = 'M',
  showMeta = true,
  showTrace = false,
  showVerboseMode = false,
  displayMode = 'both',
  isRecording = false,
  isSpeechDetected = false,
  audioLevel = 0,
  audioKind,
  slotHeight,
  tone = 'on-light',
  className,
  pipelineSttDebugLabel,
  transcriptionDebugEligible = false,
  sourceLanguage,
  useBilingualActiveSlotDiff = false,
}: ActiveTranscriptionStreamProps) {
  const isMobile = useIsMobile();
  const useSharedMetaOverlay = showMeta;
  const sharedMetaItem = currentSharedMetaCandidate(activeItems);
  const slotConfig = useCreation(() => {
    const gridGap = getGridGapPx(isMobile);
    const h = slotHeight ?? getSlotHeight(
      transcriptionSize,
      displayMode,
      useSharedMetaOverlay ? false : showMeta,
      showVerboseMode,
      1,
      isMobile
    );
    // availableHeight = maxSlots * h + (maxSlots - 1) * GRID_GAP
    const containerHeight = maxSlots * h + (maxSlots > 1 ? (maxSlots - 1) * gridGap : 0);
    return {
      height: h,
      containerHeight,
      gridGap,
    };
  }, [transcriptionSize, displayMode, showMeta, showVerboseMode, maxSlots, slotHeight, isMobile, useSharedMetaOverlay]);

  const alignClass = ALIGN_CLASS[textAlign];

  // Smart continuously sliding window with proactive eviction
  const startIndex = useSmartContinuousScroll(activeItems, maxSlots, isSpeechDetected, isRecording);
  const ObjectWindowItems = useMemo(() => {
    return activeItems.slice(startIndex, startIndex + maxSlots);
  }, [activeItems, startIndex, maxSlots]);

  const currentItems = ObjectWindowItems;

  const lastItem = currentItems.at(-1);
  const { shouldSuppress, isLongWait } = useTranscriptionStateSuppression({
    lastItem,
    isSpeechDetected,
  });

  const showListeningSlot = useMemo(() => {
    if (!isRecording || currentItems.length >= maxSlots) return false;
    if (isSpeechDetected) return true;
    if (shouldSuppress) return false;
    return !lastItem || lastItem.status !== 'capturing';
  }, [isRecording, currentItems.length, maxSlots, isSpeechDetected, shouldSuppress, lastItem]);

  // 倒计时结束但未捕获到音频/转录为空时，重置进度条
  const segmentStartCountRef = useRef(0);
  const [segmentResetCounter, setSegmentResetCounter] = useState(0);
  useEffect(() => {
    if (showListeningSlot) segmentStartCountRef.current = activeItems.length;
  }, [showListeningSlot, activeItems.length]);
  const handleSegmentComplete = useCallback(() => {
    if (activeItems.length <= segmentStartCountRef.current) {
      setSegmentResetCounter((c) => c + 1);
    }
  }, [activeItems.length]);

  const sharedItemProps = useMemo(() => ({
    align: textAlign,
    alignClass,
    transcriptionSize,
    displayMode,
    showMeta: useSharedMetaOverlay ? false : showMeta,
    showTrace,
    showVerboseMode,
    slotHeight: slotConfig.height,
    pipelineSttDebugLabel,
    transcriptionDebugEligible,
    sourceLanguage,
    useBilingualActiveSlotDiff,
  }), [textAlign, alignClass, transcriptionSize, displayMode, showMeta, showTrace, showVerboseMode, slotConfig.height, pipelineSttDebugLabel, transcriptionDebugEligible, sourceLanguage, useBilingualActiveSlotDiff, useSharedMetaOverlay]);

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden flex flex-col',
        className
      )}
      style={{
        minHeight: slotConfig.containerHeight,
        maxHeight: slotConfig.containerHeight,
        flexShrink: 0,
        contain: 'paint layout',
      }}
    >
      {useSharedMetaOverlay && sharedMetaItem && (
        <div
          className={cn(
            'absolute z-20 pointer-events-none',
            isMobile ? 'left-2 top-2' : 'left-2 top-2',
          )}
        >
          <div className="pointer-events-auto">
            <MetaRow
              item={sharedMetaItem}
              align={isMobile ? 'left' : textAlign}
              showVerboseMode={showVerboseMode}
              pipelineSttDebugLabel={pipelineSttDebugLabel}
              transcriptionDebugEligible={transcriptionDebugEligible}
              sourceLanguage={sourceLanguage}
              fixedHeight={false}
              summaryOnly
            />
          </div>
        </div>
      )}
      <div
        className="absolute inset-x-0 flex flex-col"
        style={{
          gap: `${slotConfig.gridGap}px`,
          top: 0,
          bottom: 0,
        }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {currentItems.map((item, index) => {
            const total = currentItems.length;
            const slotAge = total - 1 - index;
            const slotOpacity = getHistorySlotOpacity(total, index);
            // Warm cream color — flows through inherit chain to correction/final text
            // Does NOT override explicit text-* classes (e.g., text-muted-foreground)
            const warmColor = slotAge === 0
              ? 'rgba(255, 248, 230, 0.92)'   // newest: warm ivory
              : slotAge === 1
                ? 'rgba(255, 240, 210, 0.85)'   // 1-ago: soft warm
                : 'rgba(255, 225, 180, 0.80)';  // 2+ ago: amber tint

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: slotOpacity, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                transition={{ type: 'spring', damping: 25, stiffness: 120, mass: 0.8 }}
                className="w-full flex-shrink-0"
                style={{ height: slotConfig.height, color: warmColor }}
              >
                <ItemContent
                  item={item}
                  {...sharedItemProps}
                  isLongWait={isLongWait && item.id === lastItem?.id}
                />
              </motion.div>
            );
          })}

          {/* DEBUG OVERLAY — remove after diagnosis */}
          {/* <div className="absolute top-1 right-1 z-50 flex flex-col gap-0.5 text-[9px] font-mono leading-tight bg-black/70 text-white px-1.5 py-1 rounded pointer-events-none">
            <span>isSpeech: <b className={isSpeechDetected ? 'text-green-400' : 'text-red-400'}>{String(isSpeechDetected)}</b></span>
            <span>audioLvl: <b>{audioLevel.toFixed(3)}</b></span>
            <span>suppress: <b className={shouldSuppress ? 'text-yellow-400' : ''}>{String(shouldSuppress)}</b></span>
            <span>longWait: <b className={isLongWait ? 'text-orange-400' : ''}>{String(isLongWait)}</b></span>
            <span>showSlot: <b className={showListeningSlot ? 'text-green-400' : 'text-red-400'}>{String(showListeningSlot)}</b></span>
            <span>waitFinal: <b className={(isLongWait && !isSpeechDetected) ? 'text-orange-400' : ''}>{String(isLongWait && !isSpeechDetected)}</b></span>
            <span>items: <b>{currentItems.length}</b></span>
          </div> */}

          {showListeningSlot && (
            <motion.div
              key={`placeholder-listening-${activeItems.length}-${segmentResetCounter}`}
              layout
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 120, mass: 0.8 }}
              className="relative w-full flex-shrink-0 flex flex-col items-stretch justify-center px-10"
              style={{
                height: slotConfig.height,
                color: 'rgba(255, 248, 230, 0.92)',
              }}
            >
              <ListeningStatusIndicator
                isRecording={isRecording}
                audioLevel={audioLevel}
                audioKind={audioKind}
                isWaitingForFinal={isLongWait && !isSpeechDetected}
                align={textAlign}
                tone={tone}
                isLongWait={isLongWait}
                onSegmentComplete={handleSegmentComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
