import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useHead } from "@unhead/react";
import { cn } from "@/lib/utils";
import { TranscriptionSlotInk } from "./TranscriptionSlotInk";
import {
  TranscriptionArchiveInk,
  type ArchiveItem,
} from "./TranscriptionArchiveInk";
import {
  TranscriptionHeaderInk,
  type InkTheme,
  type InkSize,
  type InkAlign,
} from "./TranscriptionHeaderInk";
import { TranscriptionFooterInk } from "./TranscriptionFooterInk";
import { useRealTimeTranscription } from "@/hooks/useRealtimeTranscription";
import { useTheme } from "@/hooks/useTheme";
import { usePageActivity } from "@/hooks/usePageActivity";
import { useIsMobile } from "@/hooks/useMobile";
import { useToast } from "@/hooks/useToast";
import { getSupabase } from "@/lib/getSupabase";
import { ChevronLeft, History, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextEffectStyles } from "@/components/ui/TextEffect";
import { InkStyles } from "@/components/animations/ink/InkStyles";
import { useTranslation } from "react-i18next";
import { MAX_TRANSCRIPTION_SESSIONS } from "@/lib/transcriptionStorage";
import { getUserFacingTranscriptionError } from "@/lib/transcription/userFacingTranscriptionErrors";
import { SessionHistoryPanel } from '@/components/transcription/session-history/SessionHistoryPanel';
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { getGridGapPx, LAYOUT_CONFIG, getSlotHeight } from '@/components/transcription/typography';
import type { TranscriptDisplayMode } from "./HistoryTranscriptLineItem";
import { fmtLog, COMPONENT_PREFIX } from "@/lib/debugFormat";
import { useIsAdmin } from "@/lib/admin";

const IS_DEV = import.meta.env.DEV;

// Extended ArchiveItem with stable id, debugTiming, audioDuration for tracking
export type ExtendedArchiveItem = ArchiveItem & {
  status?: "pending" | "transcribing" | "completed" | "error" | "capturing";
  debugTiming?: {
    vadEndTime: number;
    transcriptionStartTime: number;
    transcriptionEndTime?: number;
    correctionStartTime?: number;
    correctionFirstTokenTime?: number;
    correctionEndTime?: number;
  };
  /** 本段音频时长，如 "2.3s"，用于调试展示 */
  audioDuration?: string;
};

export interface ActiveTranscriptionStreamInkProps {
  serviceState?: ReturnType<typeof useRealTimeTranscription>;
  className?: string;
  onBack?: () => void;
  initialTheme?: InkTheme;
  initialSize?: InkSize;
  initialAlign?: InkAlign;
  showDebugInfo?: boolean;
  initialDisplayMode?: TranscriptDisplayMode;
  initialShowMeta?: boolean;
}

export function ActiveTranscriptionStreamInk(
  props: ActiveTranscriptionStreamInkProps,
) {
  const { t } = useTranslation(["navigation", "common", "transcription"]);
  const isMobile = useIsMobile();
  const isAdmin = useIsAdmin();
  const canToggleVerboseMode = import.meta.env.DEV || isAdmin;
  const { isDark } = useTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [theme, setTheme] = useState<InkTheme>(
    props.initialTheme || (isDark ? "ebony" : "mica"),
  );

  // Sync initial theme with system/app theme
  useEffect(() => {
    if (!props.initialTheme) {
      setTheme(isDark ? "ebony" : "mica");
    }
  }, [isDark, props.initialTheme]);

  const [size, setSize] = useState<InkSize>(props.initialSize || "M");
  const [align, setAlign] = useState<InkAlign>(props.initialAlign || "center");
  const [displayMode, setDisplayMode] = useState<TranscriptDisplayMode>(
    props.initialDisplayMode || "both",
  );
  const [showMeta, setShowMeta] = useState<boolean>(
    props.initialShowMeta !== undefined ? props.initialShowMeta : true,
  );
  const [showTrace, setShowTrace] = useState(false);
  const [showVerboseMode, setShowVerboseMode] = useState(false);
  const writingAreaRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  // Internal state for the paginated slot system
  const [maxSlots, setMaxSlots] = useState(3);
  const [currentSlots, setCurrentSlots] = useState<
    (ExtendedArchiveItem | null)[]
  >(new Array(3).fill(null));
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState<
    { page: number; data: ExtendedArchiveItem[] }[]
  >([]);
  const [resultQueue, setResultQueue] = useState<ExtendedArchiveItem[]>([]);

  const { toast } = useToast();
  const [audioLevel, setAudioLevel] = useState(0);
  const [targetLanguages, setTargetLanguages] = useState<string[]>(["zh_CN"]);
  const [sourceLanguage, setSourceLanguage] = useState<string>("en");

  // Service state
  const localService = useRealTimeTranscription({
    enableHomophoneCorrection: true,
    targetLanguages,
    sourceLanguage,
    onError: (err: Error) => {
      console.error("[ActiveTranscriptionStreamInk]", err);
      const { title, description } = getUserFacingTranscriptionError(err, t, {
        maxSessions: MAX_TRANSCRIPTION_SESSIONS,
      });
      toast({
        variant: "destructive",
        title,
        description,
      });
    },
    onAuthRequired: async () => {
      const supabase = await getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast({
          variant: "destructive",
          title: "Authentication Required",
          description: "Please sign in to use real-time transcription",
        });
        return false;
      }
      return true;
    },
  });

  const service = props.serviceState || localService;

  const {
    isRecording,
    startRecording,
    stopRecording,
    results: transcriptionResults,
    error: transcriptionError,
    vadStatus,
    networkLatency,
    isSpeechDetected,
    subscribeToAudioLevel,
  } = service;

  useEffect(() => {
    return subscribeToAudioLevel(setAudioLevel);
  }, [subscribeToAudioLevel]);

  // Track processed result IDs to prevent duplicates
  const processedResultIdsRef = useRef(new Set<string>());
  const pageActivity = usePageActivity();
  const wasInBackgroundRef = useRef(false);
  const slotsAndQueueRef = useRef<{
    slots: (ExtendedArchiveItem | null)[];
    queueLength: number;
    recording: boolean;
    page: number;
  }>({
    slots: [],
    queueLength: 0,
    recording: false,
    page: 1,
  });

  // 1. Dynamic Slot & Column Calculation
  const slotHeight = useMemo(
    () => getSlotHeight(size, displayMode, showMeta, showTrace, 1, isMobile),
    [size, displayMode, showMeta, showTrace, isMobile],
  );
  const gridGap = useMemo(() => getGridGapPx(isMobile), [isMobile]);

  useEffect(() => {
    const mainEl = writingAreaRef.current?.parentElement;
    if (!mainEl) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = entry.contentRect.width;
      const height = entry.contentRect.height;

      // Local column logic matching typography.ts breakpoints
      const cols = width < 750 ? 1 : width < 1100 ? 2 : 3;
      setColumns(cols);

      // Account for 'GRID_GAP' accurately (centralized typography source-of-truth)
      const rows = Math.max(
        1,
        Math.floor(
          (height + gridGap) /
            (slotHeight + gridGap),
        ),
      );
      setMaxSlots(rows * cols);
    });

    observer.observe(mainEl);
    return () => observer.disconnect();
  }, [slotHeight, gridGap]);

  // 2. Sync slots with maxSlots
  useEffect(() => {
    setCurrentSlots((prev) => {
      if (prev.length === maxSlots) return prev;
      const next = new Array(maxSlots).fill(null);
      for (let i = 0; i < Math.min(prev.length, maxSlots); i++) {
        next[i] = prev[i];
      }
      return next;
    });
    if (activeSlotIdx >= maxSlots) setActiveSlotIdx(Math.max(0, maxSlots - 1));
  }, [maxSlots, activeSlotIdx]);

  // 3. Result Queue Management (Mapping hook results to Ink slots)
  useEffect(() => {
    if (transcriptionResults.length === 0) {
      processedResultIdsRef.current.clear();
      return;
    }

    const completedResults = transcriptionResults.filter(
      (r) =>
        r.status === "completed" &&
        !processedResultIdsRef.current.has(String(r.id)),
    );

    if (completedResults.length === 0) return;

    if (IS_DEV) {
      console.log(
        fmtLog(COMPONENT_PREFIX.ink, "Completed results entering queue", {
          total: transcriptionResults.length,
          new: completedResults.length,
          ids: completedResults.map((r) => r.id).join(","),
        }),
      );
    }

    const newItems: ExtendedArchiveItem[] = completedResults.map((r) => ({
      id: String(r.id),
      correctionText: r.correctionText || "",
      translationText: r.translationText || "",
      debugTiming: r.correctionData?.timing,
      audioDuration: r.correctionData?.audioDuration,
    }));

    newItems.forEach((item) =>
      processedResultIdsRef.current.add(String(item.id)),
    );
    setResultQueue((prev) => [...prev, ...newItems]);
  }, [transcriptionResults]);

  // 4. Slot Filling logic
  useEffect(() => {
    if (resultQueue.length === 0) return;

    setCurrentSlots((prev) => {
      const next = [...prev];
      let queueIdx = 0;
      let filledAny = false;
      let lastFilledIdx = -1;

      for (let i = 0; i < next.length && queueIdx < resultQueue.length; i++) {
        if (!next[i]) {
          next[i] = resultQueue[queueIdx];
          queueIdx++;
          filledAny = true;
          lastFilledIdx = i;
        }
      }

      if (filledAny) {
        if (IS_DEV) {
          console.log(
            fmtLog(COMPONENT_PREFIX.ink, "Filling slots from queue", {
              queueLen: resultQueue.length,
              filledIdx: lastFilledIdx,
              nextEmpty: next.findIndex((s) => s === null),
            }),
          );
        }
        setResultQueue((prevQ) => prevQ.slice(queueIdx));
        // Advance active slot indicator to the next empty slot after the last filled one
        const nextEmptyIdx = next.findIndex((s) => s === null);
        setActiveSlotIdx(nextEmptyIdx >= 0 ? nextEmptyIdx : lastFilledIdx);
      }
      return next;
    });
  }, [resultQueue]);

  useEffect(() => {
    if (!IS_DEV) return;
    const activeCount = currentSlots.filter((item) => item !== null).length;
    if (activeCount === 0 && resultQueue.length === 0) return;

    console.log(
      fmtLog(COMPONENT_PREFIX.ink, "Slot snapshot", {
        activeSlotIdx,
        page,
        slots: activeCount,
        queued: resultQueue.length,
      }),
    );
  }, [activeSlotIdx, currentSlots, page, resultQueue]);

  // 5. Page Flip logic
  const handleSlotComplete = useCallback(
    (idx: number) => {
      if (!isRecording) return;
      if (idx === maxSlots - 1) {
        const pageData = currentSlots.filter(
          (s): s is ExtendedArchiveItem => s !== null,
        );
        setHistory((prev) => [...prev, { page, data: pageData }]);

        setTimeout(() => {
          setPage((p) => p + 1);
          setActiveSlotIdx(0);
          setCurrentSlots(new Array(maxSlots).fill(null));
        }, 800);
      } else {
        setActiveSlotIdx(idx + 1);
      }
    },
    [maxSlots, isRecording, currentSlots, page],
  );

  // UI Chrome states
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const simulateCorrection = () => {
    const id = `sim-${Date.now()}`;
    const item: ExtendedArchiveItem = {
      id,
      correctionText: "The quick brown fox jumps over the lazy dog.",
      translationText: "敏捷的棕色狐狸跳过了懒狗。",
      status: "completed",
    };
    setResultQueue((prev) => [...prev, item]);
  };

  // Track recording time
  const [recordingTime, setRecordingTime] = useState(0);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      const start = Date.now();
      timer = setInterval(() => {
        setRecordingTime(Date.now() - start);
      }, 100);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && !isInitialized) setIsInitialized(true);
  }, [isRecording, isInitialized]);

  return (
    <div
      className={cn(
        "fixed inset-0 w-full h-full overflow-hidden overscroll-none",
        theme === "ebony" ? "bg-black text-white" : "bg-[#f4f4f7] text-black",
        props.className,
      )}
    >
      <InkStyles />
      <TextEffectStyles />

      {/* Dev Controls */}
      <div className="fixed top-[calc(1.5rem+env(safe-area-inset-top)+40px)] right-4 sm:right-8 z-50 pointer-events-none">
        <Button
          variant="outline"
          size="sm"
          onClick={simulateCorrection}
          className="pointer-events-auto bg-white/5 border-white/10 hover:bg-white/10 text-[10px] h-7 px-2 backdrop-blur-xl"
        >
          <Zap className="w-3 h-3 mr-1" />
          Simulate Correction
        </Button>
      </div>

      {/* Header */}
      <TranscriptionHeaderInk
        page={page}
        size={size}
        align={align}
        theme={theme}
        showTrace={showTrace}
        showVerboseMode={showVerboseMode}
        canToggleVerboseMode={canToggleVerboseMode}
        onThemeChange={setTheme}
        onSizeChange={setSize}
        onAlignChange={setAlign}
        onTraceToggle={() => setShowTrace(!showTrace)}
        onVerboseModeToggle={() => {
          setShowVerboseMode((v) => !v);
        }}
        onArchiveToggle={() => setIsArchiveOpen(!isArchiveOpen)}
        onBack={props.onBack}
        isArchiveOpen={isArchiveOpen}
        maxSlotsPerPage={maxSlots}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        showMeta={showMeta}
        onShowMetaToggle={() => setShowMeta(!showMeta)}
        totalItems={
          history.length * maxSlots +
          currentSlots.filter((s) => s !== null).length
        }
        currentPageItems={currentSlots.filter((s) => s !== null).length}
        targetLanguages={targetLanguages}
        onTargetLanguagesChange={setTargetLanguages}
        sourceLanguage={sourceLanguage}
        onSourceLanguageChange={setSourceLanguage}
      />

      {/* Main Content: The Paginated Writing Area */}
      <main className="relative flex-1 h-[calc(100%-120px)] w-full max-w-6xl mx-auto px-6 overflow-hidden flex flex-col justify-center">
        <div
          id="writing-area"
          ref={writingAreaRef}
          className="grid transition-all duration-500 ease-in-out"
          style={{
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gridAutoRows: `${slotHeight}px`,
            gap: `${gridGap}px`,
            alignContent: "center",
          }}
        >
          {currentSlots.map((item, idx) => (
            <TranscriptionSlotInk
              key={`${item?.id || `empty-${idx}`}-${size}-${displayMode}-${showMeta ? "meta" : "plain"}`}
              correctionText={item?.correctionText || ""}
              translationText={item?.translationText || ""}
              debugTiming={item?.debugTiming}
              isActive={idx === activeSlotIdx}
              align={align}
              theme={theme}
              showTrace={showTrace}
              showVerboseMode={showVerboseMode}
              transcriptionDebugEligible={canToggleVerboseMode}
              displayMode={displayMode}
              showMeta={showMeta}
              onComplete={() => handleSlotComplete(idx)}
            />
          ))}
        </div>

        {!isRecording && currentSlots.every((s) => s === null) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
            <div className="text-sm tracking-widest uppercase font-medium">
              {t("transcription:ink_idle_guide", {
                defaultValue: "WAITING FOR INK...",
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <TranscriptionFooterInk
        isRecording={isRecording}
        onToggleRecord={isRecording ? stopRecording : startRecording}
        durationMs={recordingTime}
        latencyMs={networkLatency}
      />

      {/* Sidebars */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-[var(--paper)] transition-all duration-300 ease-in-out border-r border-[var(--border)]",
          sidebarOpen
            ? "w-[360px] translate-x-0 overflow-y-auto shadow-2xl"
            : "w-0 -translate-x-full overflow-hidden",
        )}
        data-theme={theme}
      >
        {sidebarOpen && (
          <div className="h-full w-[360px] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] flex-shrink-0">
              <h2 className="font-medium text-[var(--ink)]">History</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 text-[var(--ink-light)] hover:text-[var(--ink)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SessionHistoryPanel
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                view="session"
                onViewChange={() => {}}
                isDark={theme === "ebony"}
                targetLanguages={targetLanguages}
                onSessionSelect={(sessionId) =>
                  service.setCurrentSessionId(sessionId)
                }
                inline={true}
              />
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-[320px] bg-[var(--paper)] border-l border-[var(--border)] transition-transform duration-500 ease-out shadow-2xl overflow-hidden",
          isArchiveOpen ? "translate-x-0" : "translate-x-full",
        )}
        data-theme={theme}
      >
        <TranscriptionArchiveInk
          history={history}
          showTrace={showTrace}
          onClose={() => setIsArchiveOpen(false)}
        />
      </div>
    </div>
  );
}
