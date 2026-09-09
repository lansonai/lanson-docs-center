import { CopyButton } from '@/components/ui/copy-button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { useIsMobile } from '@/hooks/useMobile.tsx';
import { cn } from '@/lib/utils';
import { Activity, Cloud, Globe, ScanSearch, Timer, Zap } from 'lucide-react';
import * as React from 'react';
import { PiMagicWandLight, PiTranslateLight } from 'react-icons/pi';
import type { PipelineSttDebugLabel } from '@/lib/realtime-transcription/buildTranscriptionFromImeDevPreset';
import type { CorrectionTiming, TextAlign } from '@/components/transcription/types';
import { getTraceRowHeightPx } from '@/components/transcription/typography';

interface TraceDebugInfoRowProps {
    time?: string;
    /** Speech duration (silence excluded) — shown when {@link adminMeta}. */
    audioDuration?: string;
    timing?: CorrectionTiming;
    align?: TextAlign;
    className?: string;
    /**
     * When true: duration, STT routing, language, inline latency, and trace popover.
     * Parent must only set this when **Meta (time) is on**, **debug toggle is on**, and user is **dev or admin**.
     */
    adminMeta?: boolean;
    /** Admin / signed-in live: which default STT path is active (dev preset + env). */
    pipelineSttDebugLabel?: PipelineSttDebugLabel;
    /** STT response `language` — right side of source/response display. */
    detectedLanguage?: string;
    /**
     * Effective language on the STT HTTP request (JSON / tooltip detail).
     * Inline label uses {@link sourceLanguage} for the left token when set.
     */
    sttRequestLanguage?: string;
    /**
     * User-selected source language. Missing or `auto` → left label `AUTO`.
     * (History: pass session source when available.)
     */
    sourceLanguage?: string;
    /** When set (e.g. embed body font from `getEmbedTypographyClasses`), inline meta matches subtitle typography instead of monospace. */
    subtitleFontClassName?: string;
    /** Shared/fixed usage should opt out of the historical fixed row height contract. */
    fixedHeight?: boolean;
    /** Render only the lightweight anchor row (time / duration / icon). */
    summaryOnly?: boolean;
}

/** Renders 12h locale times with `AM` / `PM` one step smaller than the clock digits (en-US style). */
const SessionTimeWithSmallerMeridiem = React.forwardRef<HTMLSpanElement, {
    time: string;
    className: string;
    meridiemClassName: string;
}>(
    function SessionTimeWithSmallerMeridiem({ time, className, meridiemClassName }, ref) {
        const m = time.match(/^(.*?)\s+(AM|PM)$/i);
        if (!m) {
            return <span ref={ref} className={className}>{time}</span>;
        }
        return (
            <span ref={ref} className={className}>
                <span className="inline whitespace-nowrap">{m[1].trim()}</span>
                <span className={cn('inline whitespace-nowrap', meridiemClassName)}> {m[2]}</span>
            </span>
        );
    },
);

// ── Latency Benchmarks (Per-stage durations) ────────────────────────────────
const LATENCY_THRESHOLDS = {
    asr: { good: 600, warn: 1200 },
    ttft: { good: 350, warn: 900 },
    ctft: { good: 1200, warn: 2200 },
    mt: { good: 600, warn: 1400 },
} as const;

type LatencyKey = keyof typeof LATENCY_THRESHOLDS;

const METRIC_DEFS = {
    asr: {
        label: "ASR",
        full: "Transcription Duration",
        desc: "Speech-to-text stage only, from request start to final ASR result.",
        bench: "Excellent < 600ms | Fair < 1.2s"
    },
    ttft: {
        label: "Correction TTFT",
        full: "First Token Latency",
        desc: "Correction stage only, from correction start to first corrected token.",
        bench: "Excellent < 350ms | Fair < 900ms"
    },
    ctft: {
        label: "Correction Final",
        full: "Correction Duration",
        desc: "Correction stage only, from correction start to full finalized correction.",
        bench: "Excellent < 1.2s | Fair < 2.2s"
    },
    mt: {
        label: "Translation",
        full: "Translation Duration",
        desc: "Translation stage only, from translation start to translation result.",
        bench: "Excellent < 600ms | Fair < 1.4s"
    }
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getStatusColor(ms: number | null | undefined, key: LatencyKey) {
    if (ms == null) return 'text-muted-foreground/30';
    const { good, warn } = LATENCY_THRESHOLDS[key];
    if (ms < good) return 'text-emerald-400';
    if (ms < warn) return 'text-amber-400';
    return 'text-rose-400';
}

function calcE2ELatencies(timing?: CorrectionTiming | null) {
    if (!timing || !timing.vadEndTime) return null;
    const start = timing.vadEndTime;

    return {
        asr: timing.transcriptionEndTime ? Math.round(timing.transcriptionEndTime - start) : null,
        ttft: timing.correctionFirstTokenTime ? Math.round(timing.correctionFirstTokenTime - start) : null,
        ctft: timing.correctionEndTime ? Math.round(timing.correctionEndTime - start) : null,
        mt: timing.translationEndTime ? Math.round(timing.translationEndTime - start) : null,
        abs: {
            asr: timing.transcriptionEndAt,
            ttft: timing.correctionFirstTokenAt,
            ctft: timing.correctionEndAt,
            mt: timing.translationEndAt,
        }
    };
}

function calcStageLatencies(timing?: CorrectionTiming | null) {
    if (!timing || !timing.vadEndTime) return null;

    return {
        asr: timing.transcriptionTimeMs && timing.transcriptionTimeMs > 0
            ? Math.round(timing.transcriptionTimeMs)
            : timing.transcriptionEndTime && timing.transcriptionStartTime
            ? Math.round(timing.transcriptionEndTime - timing.transcriptionStartTime)
            : null,
        ttft: timing.correctionFirstTokenTime && timing.correctionStartTime
            ? Math.round(timing.correctionFirstTokenTime - timing.correctionStartTime)
            : null,
        ctft: timing.correctionEndTime && timing.correctionStartTime
            ? Math.round(timing.correctionEndTime - timing.correctionStartTime)
            : null,
        mt: timing.translationEndTime && timing.translationStartTime
            ? Math.round(timing.translationEndTime - timing.translationStartTime)
            : null,
        abs: {
            asr: timing.transcriptionEndAt,
            ttft: timing.correctionFirstTokenAt,
            ctft: timing.correctionEndAt,
            mt: timing.translationEndAt,
        }
    };
}

function calcTransportLatencies(timing?: CorrectionTiming | null) {
    if (!timing) return null;
    return {
        wavEncodeMs: timing.wavEncodeMs ?? null,
        encodeTotalMs: timing.encodeTotalMs ?? null,
        ffmpegLoadMs: timing.ffmpegLoadMs ?? null,
        transcodeMs: timing.transcodeMs ?? null,
        base64EncodeMs: timing.base64EncodeMs ?? null,
        networkRequestMs: timing.networkRequestMs ?? null,
        uploadEstimateMs: timing.uploadEstimateMs ?? null,
        requestTotalMs: timing.requestTotalMs ?? null,
        responseParseMs: timing.responseParseMs ?? null,
        wavBytes: timing.wavBytes ?? null,
        uploadBytes: timing.uploadBytes ?? null,
        payloadBytes: timing.payloadBytes ?? null,
        transcriptionProvider: timing.transcriptionProvider ?? null,
        transportMode: timing.transportMode ?? null,
        adaptiveBackend: timing.adaptiveBackend ?? null,
        uploadAudioFormat: timing.uploadAudioFormat ?? null,
        uploadMimeType: timing.uploadMimeType ?? null,
        fallbackFromFormat: timing.fallbackFromFormat ?? null,
        fallbackReason: timing.fallbackReason ?? null,
        compressionRatio: timing.compressionRatio ?? null,
        compressionSavingsRatio: timing.compressionSavingsRatio ?? null,
    };
}

function formatEpochMs(epochMs?: number | null): string | undefined {
    if (typeof epochMs !== 'number' || !Number.isFinite(epochMs)) return undefined;
    return new Date(epochMs).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3,
    });
}

function formatBytes(bytes?: number | null): string {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** Compact token for meta (e.g. EN, ZH, AUTO). */
function toShortLangToken(raw: string): string {
    const s = raw.trim().replace(/_/g, '-');
    if (!s) return '—';
    const lower = s.toLowerCase();
    const nameMap: Record<string, string> = {
        english: 'EN',
        chinese: 'ZH',
        japanese: 'JA',
        korean: 'KO',
        spanish: 'ES',
        french: 'FR',
        german: 'DE',
        italian: 'IT',
        portuguese: 'PT',
        russian: 'RU',
        arabic: 'AR',
        hindi: 'HI',
        turkish: 'TR',
        vietnamese: 'VI',
        thai: 'TH',
        indonesian: 'ID',
        dutch: 'NL',
        polish: 'PL',
        ukrainian: 'UK',
    };
    if (nameMap[lower]) return nameMap[lower]!;
    const primary = lower.split('-')[0] ?? lower;
    if (primary.length <= 3 && /^[a-z]+$/i.test(primary)) {
        return primary.toUpperCase();
    }
    return primary.slice(0, 3).toUpperCase();
}

function metaLangLeft(specified: string | undefined): string {
    const sp = specified?.trim();
    if (!sp || sp.toLowerCase() === 'auto') return 'AUTO';
    return toShortLangToken(sp);
}

function metaLangRight(responseLang: string | undefined): string {
    const r = responseLang?.trim();
    return r ? toShortLangToken(r) : '—';
}

function formatSourceOverResponseLabel(
    sourceLanguage: string | undefined,
    detectedLanguage: string | undefined,
): string {
    return `${metaLangLeft(sourceLanguage)}/${metaLangRight(detectedLanguage)}`;
}

function buildSttRoutingTooltipLines(timing?: CorrectionTiming | null): Array<[string, string]> {
    if (!timing) return [];
    const lines: Array<[string, string]> = [];
    if (timing.sttRequested != null) lines.push(['Requested', timing.sttRequested]);
    if (timing.sttUsed != null) lines.push(['Used', timing.sttUsed]);
    if (timing.model != null) lines.push(['STT Model', timing.model]);
    if (timing.statusCode != null) lines.push(['STT Status', String(timing.statusCode)]);
    if (timing.normalizationModel != null) lines.push(['Norm Model', timing.normalizationModel]);
    if (timing.normalizationLatencyMs != null) lines.push(['Norm Latency', `${timing.normalizationLatencyMs}ms`]);
    if (timing.normalizationTotalTokens != null) {
        lines.push(['Norm Tokens', `${timing.normalizationPromptTokens || 0}/${timing.normalizationCompletionTokens || 0} (${timing.normalizationTotalTokens})`]);
    }
    if (timing.sttExecutionPath != null) lines.push(['Path', timing.sttExecutionPath]);
    if (timing.sttModalSkippedReason !== undefined && timing.sttModalSkippedReason !== null) {
        lines.push(['Modal skipped', timing.sttModalSkippedReason]);
    }
    return lines;
}

function formatEngineLabel(raw?: string | null): string | null {
    if (!raw) return null;
    const value = raw.trim();
    if (!value) return null;
    const lower = value.toLowerCase();

    if (lower === 'funasr') return 'FunASR';
    if (lower === 'modal') return 'Modal';
    if (lower === 'groq') return 'GROQ';
    if (lower === 'deepgram') return 'Deepgram';
    if (lower === 'faster_whisper' || lower.includes('whisper')) return 'Whisper';

    return value;
}

function resolveSttEngine(timing?: CorrectionTiming | null, transportProvider?: string | null): string | null {
    const primary =
        formatEngineLabel(timing?.sttUsed)
        || formatEngineLabel(timing?.adaptiveBackend)
        || formatEngineLabel(timing?.model)
        || formatEngineLabel(transportProvider);
    return primary;
}

function MetaGrid({
    rows,
}: {
    rows: Array<[string, React.ReactNode]>;
}) {
    const filtered = rows.filter(([, value]) => {
        if (value === null || value === undefined || value === false) return false;
        if (typeof value === 'string') return value.trim().length > 0 && value !== '--';
        return true;
    });

    if (filtered.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono text-teal-900/70 dark:text-teal-200/65">
            {filtered.map(([label, value]) => (
                <React.Fragment key={label}>
                    <span>{label}</span>
                    <span className="truncate text-right" title={typeof value === 'string' ? value : undefined}>
                        {value}
                    </span>
                </React.Fragment>
            ))}
        </div>
    );
}

function MetaSection({
    title,
    rows,
    bordered = false,
}: {
    title: string;
    rows: Array<[string, React.ReactNode]>;
    bordered?: boolean;
}) {
    const body = <MetaGrid rows={rows} />;
    if (!body) return null;

    return (
        <div className={cn('space-y-1', bordered && 'border-t border-muted-foreground/10 pt-2')}>
            <div className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest">{title}</div>
            {body}
        </div>
    );
}

function SttRoutingTooltipBody({
    fallback,
    lines,
}: {
    fallback: string;
    lines: Array<[string, string]>;
}) {
    if (lines.length === 0) {
        return <p className="text-xs">{fallback}</p>;
    }
    return (
        <div className="text-[11px] font-sans space-y-0.5 min-w-[160px]">
            {lines.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground/70">{k}</span>
                    <span className="font-mono tabular-nums">{v}</span>
                </div>
            ))}
        </div>
    );
}

/** Provider label only (no “STT” prefix): OpenAPI `sttUsed`, client Groq, or generic v3 API path. */
function SttRoutingBadge({
    timing,
    pipelineSttDebugLabel,
    subtitleFontClassName,
}: {
    timing?: CorrectionTiming;
    pipelineSttDebugLabel?: PipelineSttDebugLabel;
    subtitleFontClassName?: string;
}) {
    const lines = buildSttRoutingTooltipLines(timing);
    const tooltip = (fallback: string) => <SttRoutingTooltipBody fallback={fallback} lines={lines} />;

    const vendorText = cn(
        'text-[10px] tabular-nums cursor-default inline-flex items-center gap-1',
        subtitleFontClassName?.trim() ? subtitleFontClassName : 'font-mono',
    );

    const adaptiveBackend = timing?.adaptiveBackend;
    if (adaptiveBackend === 'modal') {
        return (
            <TooltipWrapper content={<p className="text-xs">Adaptive WS active backend: Modal</p>}>
                <span className={cn(vendorText, 'text-violet-600/90 dark:text-violet-400/85')}>
                    <Zap className="h-3 w-3" />
                    <span>modal</span>
                </span>
            </TooltipWrapper>
        );
    }
    if (adaptiveBackend === 'deepgram') {
        return (
            <TooltipWrapper content={<p className="text-xs">Adaptive WS active backend: Deepgram</p>}>
                <span className={cn(vendorText, 'text-sky-600/90 dark:text-sky-400/85')}>
                    <Cloud className="h-3 w-3" />
                    <span>deepgram</span>
                </span>
            </TooltipWrapper>
        );
    }

    const stt = timing?.sttUsed;
    if (stt) {
        let displayLabel = stt;
        let colorClass = 'text-violet-600/90 dark:text-violet-400/85';
        
        if (stt === 'faster_whisper' || stt.includes('whisper')) {
            displayLabel = 'Whisper';
            colorClass = 'text-blue-600/90 dark:text-blue-400/85';
        } else if (stt === 'funasr') {
            displayLabel = 'FunASR';
            colorClass = 'text-indigo-600/90 dark:text-indigo-400/85';
        } else if (stt === 'riva') {
            displayLabel = 'Riva';
            colorClass = 'text-violet-600/90 dark:text-violet-400/85';
        } else if (stt === 'modal') {
            displayLabel = 'modal';
            colorClass = 'text-violet-600/90 dark:text-violet-400/85';
        } else if (stt === 'groq') {
            displayLabel = 'GROQ';
            colorClass = 'text-emerald-600/90 dark:text-emerald-400/85';
        }

        return (
            <TooltipWrapper content={tooltip(`${stt} (v3 API)`)}>
                <span className={cn(vendorText, colorClass)}>
                    <Zap className="h-3 w-3" />
                    <span>{displayLabel}</span>
                </span>
            </TooltipWrapper>
        );
    }
    if (timing?.transcriptionProvider === 'groq') {
        return (
            <TooltipWrapper content={<p className="text-xs">Groq transcription provider</p>}>
                <span className={cn(vendorText, 'text-emerald-600/90 dark:text-emerald-400/85')}>
                    <span>GROQ</span>
                </span>
            </TooltipWrapper>
        );
    }
    if (pipelineSttDebugLabel) {
        return (
            <TooltipWrapper content="POST /v3/realtime/transcription (authenticated)">
                <span className={cn(vendorText, 'text-sky-600/90 dark:text-sky-400/85')}>
                    <span>V3 API</span>
                </span>
            </TooltipWrapper>
        );
    }
    return null;
}

// ── Components ───────────────────────────────────────────────────────────────

function LatencyTooltipContent({ mKey, ms, at }: { mKey: LatencyKey; ms: number | null; at?: string }) {
    const def = METRIC_DEFS[mKey];
    return (
        <div className="p-1.5 space-y-3 min-w-[240px] font-sans">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-[12px] font-bold text-foreground leading-none">{def.full}</h4>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{def.label}</p>
                </div>
                {ms && <span className={cn("text-[14px] font-mono font-bold", getStatusColor(ms, mKey))}>{ms}ms</span>}
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground/80 pl-0 italic">
                {def.desc}
            </p>
            <div className="py-1">
                <p className="text-[8px] uppercase font-black tracking-widest text-muted-foreground/50 mb-1">Benchmarks</p>
                <p className="text-[10px] font-mono text-muted-foreground/70">{def.bench}</p>
            </div>
            {at && <p className="text-[9px] font-mono text-muted-foreground/30 text-right">Captured @ {at}</p>}
        </div>
    );
}

function DebugRow({ mKey, ms, at }: { mKey: LatencyKey; ms: number | null; at?: string }) {
    if (ms === null) return null;
    const def = METRIC_DEFS[mKey];
    return (
        <div className="flex items-center justify-between group/row py-1.5">
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-tighter">{def.label}</span>
                <span className="text-[9px] font-mono text-muted-foreground/30 group-hover/row:text-muted-foreground/50">{at || '--'}</span>
            </div>
            <div className="text-right">
                <span className={cn("text-[12px] font-mono font-bold tabular-nums", getStatusColor(ms, mKey))}>{ms}ms</span>
            </div>
        </div>
    );
}

export function TraceDebugInfoRow({
    time,
    audioDuration,
    timing,
    align = 'left',
    className,
    adminMeta = false,
    pipelineSttDebugLabel,
    detectedLanguage,
    sttRequestLanguage,
    sourceLanguage,
    subtitleFontClassName,
    fixedHeight = true,
    summaryOnly = false,
}: TraceDebugInfoRowProps) {
    const [popoverOpen, setPopoverOpen] = React.useState(false);
    const [tracePulse, setTracePulse] = React.useState(false);
    const lastPayloadRef = React.useRef<string | null>(null);
    const e2eTimings = calcE2ELatencies(timing);
    const stageTimings = calcStageLatencies(timing);
    const transportTimings = calcTransportLatencies(timing);
    const isMobile = useIsMobile();
    const justifyStyle = { justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' };
    const rowHeight = getTraceRowHeightPx(isMobile);
    const subtitleFontForMeta = subtitleFontClassName?.trim() ? subtitleFontClassName : undefined;
    const metaFont = (textSizeClass: string) =>
        cn(textSizeClass, 'tabular-nums', subtitleFontForMeta ?? 'font-mono');
    const sourceOverResponseLabel = formatSourceOverResponseLabel(sourceLanguage, detectedLanguage);
    const sttEngine = resolveSttEngine(timing, transportTimings?.transcriptionProvider);
    const detailsBody = (
        <div className="max-h-[70vh] overflow-y-auto px-3 pb-3 pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/6 bg-white/[0.03] px-2.5 py-2">
                    <span className="block text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Start</span>
                    <SessionTimeWithSmallerMeridiem
                        time={time || '--'}
                        className="text-[11px] font-mono font-medium text-teal-900/80 dark:text-teal-200/75"
                        meridiemClassName="text-[10px] font-mono font-medium text-teal-900/80 dark:text-teal-200/75"
                    />
                </div>
                <div className="rounded-xl border border-white/6 bg-white/[0.03] px-2.5 py-2">
                    <span className="block text-[8px] font-black text-muted-foreground/30 uppercase tracking-widest mb-1">Length</span>
                    <span className="text-[11px] font-mono font-medium text-teal-900/80 dark:text-teal-200/75">{audioDuration || '--'}</span>
                </div>
            </div>

            {/* Performance List */}
            {stageTimings || transportTimings ? (
                <div className="space-y-1">
                    <DebugRow mKey="asr" ms={stageTimings?.asr ?? null} at={formatEpochMs(stageTimings?.abs.asr)} />
                    <DebugRow mKey="ttft" ms={stageTimings?.ttft ?? null} at={formatEpochMs(stageTimings?.abs.ttft)} />
                    <DebugRow mKey="ctft" ms={stageTimings?.ctft ?? null} at={formatEpochMs(stageTimings?.abs.ctft)} />
                    <DebugRow mKey="mt" ms={stageTimings?.mt ?? null} at={formatEpochMs(stageTimings?.abs.mt)} />
                    <MetaSection
                        title="Language"
                        rows={[
                            ['source', sourceLanguage ?? '--'],
                            ['request', sttRequestLanguage ?? '--'],
                            ['detected', detectedLanguage ?? '--'],
                            ['metaLang', sourceOverResponseLabel],
                        ]}
                    />
                    <MetaSection
                        title="E2E From VAD"
                        rows={[
                            ['asr', e2eTimings?.asr != null ? `${e2eTimings.asr}ms` : '--'],
                            ['ttft', e2eTimings?.ttft != null ? `${e2eTimings.ttft}ms` : '--'],
                            ['ctft', e2eTimings?.ctft != null ? `${e2eTimings.ctft}ms` : '--'],
                            ['mt', e2eTimings?.mt != null ? `${e2eTimings.mt}ms` : '--'],
                            ['abs.asr', formatEpochMs(e2eTimings?.abs.asr) ?? '--'],
                            ['abs.ttft', formatEpochMs(e2eTimings?.abs.ttft) ?? '--'],
                            ['abs.ctft', formatEpochMs(e2eTimings?.abs.ctft) ?? '--'],
                            ['abs.mt', formatEpochMs(e2eTimings?.abs.mt) ?? '--'],
                        ]}
                        bordered
                    />
                    <MetaSection
                        title="Transport"
                        rows={[
                            ['engine', sttEngine ?? '--'],
                            ['provider', transportTimings?.transcriptionProvider || '--'],
                            ['mode', transportTimings?.transportMode || '--'],
                            ['backend', transportTimings?.adaptiveBackend || '--'],
                            ['format', transportTimings?.uploadAudioFormat || '--'],
                            ['mime', transportTimings?.uploadMimeType || '--'],
                            ['wav', transportTimings?.wavEncodeMs != null ? `${transportTimings.wavEncodeMs}ms` : '--'],
                            ['encode_total', transportTimings?.encodeTotalMs != null ? `${transportTimings.encodeTotalMs}ms` : '--'],
                            ['ffmpeg_load', transportTimings?.ffmpegLoadMs != null ? `${transportTimings.ffmpegLoadMs}ms` : '--'],
                            ['transcode', transportTimings?.transcodeMs != null ? `${transportTimings.transcodeMs}ms` : '--'],
                            ['base64', transportTimings?.base64EncodeMs != null ? `${transportTimings.base64EncodeMs}ms` : '--'],
                            ['network', transportTimings?.networkRequestMs != null ? `${transportTimings.networkRequestMs}ms` : '--'],
                            ['upload', transportTimings?.uploadEstimateMs != null ? `${transportTimings.uploadEstimateMs}ms` : '--'],
                            ['request', transportTimings?.requestTotalMs != null ? `${transportTimings.requestTotalMs}ms` : '--'],
                            ['parse', transportTimings?.responseParseMs != null ? `${transportTimings.responseParseMs}ms` : '--'],
                            ['wav_bytes', formatBytes(transportTimings?.wavBytes)],
                            ['upload_bytes', formatBytes(transportTimings?.uploadBytes)],
                            ['payload_bytes', formatBytes(transportTimings?.payloadBytes)],
                            ['fallback_from', transportTimings?.fallbackFromFormat || '--'],
                            ['fallback_reason', transportTimings?.fallbackReason || '--'],
                            ['compression', transportTimings?.compressionRatio != null ? String(transportTimings.compressionRatio) : '--'],
                            ['saved_ratio', transportTimings?.compressionSavingsRatio != null ? String(transportTimings.compressionSavingsRatio) : '--'],
                        ]}
                        bordered
                    />
                    <MetaSection
                        title="STT V3"
                        rows={[
                            ['engine', sttEngine ?? '--'],
                            ['stt_used', timing?.sttUsed ?? '--'],
                            ['stt_requested', timing?.sttRequested ?? '--'],
                            ['stt_path', timing?.sttExecutionPath ?? '--'],
                            ['stt_modal_skip', timing?.sttModalSkippedReason === undefined ? '--' : timing.sttModalSkippedReason === null ? 'null' : timing.sttModalSkippedReason],
                            ['stt_model', timing?.model ?? '--'],
                            ['stt_status', timing?.statusCode != null ? String(timing.statusCode) : '--'],
                        ]}
                        bordered
                    />
                    <MetaSection
                        title="Normalization"
                        rows={[
                            ['model', timing?.normalizationModel ?? '--'],
                            ['status', timing?.normalizationStatusCode != null ? String(timing.normalizationStatusCode) : '--'],
                            ['latency', timing?.normalizationLatencyMs != null ? `${timing.normalizationLatencyMs}ms` : '--'],
                            ['ttft', timing?.normalizationTtftMs != null ? `${timing.normalizationTtftMs}ms` : '--'],
                            ['prompt_tokens', timing?.normalizationPromptTokens != null ? String(timing.normalizationPromptTokens) : '--'],
                            ['completion_tokens', timing?.normalizationCompletionTokens != null ? String(timing.normalizationCompletionTokens) : '--'],
                            ['total_tokens', timing?.normalizationTotalTokens != null ? String(timing.normalizationTotalTokens) : '--'],
                            ['cached_tokens', timing?.normalizationCachedTokens != null ? String(timing.normalizationCachedTokens) : '--'],
                            ['reasoning_tokens', timing?.normalizationReasoningTokens != null ? String(timing.normalizationReasoningTokens) : '--'],
                        ]}
                        bordered
                    />
                </div>
            ) : (
                <div className="py-8 text-center opacity-20">
                    <Activity className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px]">No timing data available</p>
                </div>
            )}
        </div>
    );

    const copyPayload = JSON.stringify({
        audio: { start: time, duration: audioDuration },
        sourceLanguage: sourceLanguage ?? null,
        sttRequestLanguage: sttRequestLanguage ?? null,
        detectedLanguage: detectedLanguage ?? null,
        metaLang: sourceOverResponseLabel,
        latencies_stage: stageTimings,
        latencies_e2e_from_vad: e2eTimings,
        transport: transportTimings,
        stt_v3: timing
            ? {
                stt_requested: timing.sttRequested,
                stt_used: timing.sttUsed,
                stt_execution_path: timing.sttExecutionPath,
                stt_modal_skipped_reason: timing.sttModalSkippedReason,
                model: timing.model,
                statusCode: timing.statusCode,
                normalizationModel: timing.normalizationModel,
                normalizationStatusCode: timing.normalizationStatusCode,
                normalizationLatencyMs: timing.normalizationLatencyMs,
                normalizationTtftMs: timing.normalizationTtftMs,
                normalizationPromptTokens: timing.normalizationPromptTokens,
                normalizationCompletionTokens: timing.normalizationCompletionTokens,
                normalizationTotalTokens: timing.normalizationTotalTokens,
                normalizationCachedTokens: timing.normalizationCachedTokens,
                normalizationReasoningTokens: timing.normalizationReasoningTokens,
            }
            : undefined,
    }, null, 2);

    React.useEffect(() => {
        if (!adminMeta) return;
        if (lastPayloadRef.current === null) {
            lastPayloadRef.current = copyPayload;
            return;
        }
        if (lastPayloadRef.current === copyPayload) return;
        lastPayloadRef.current = copyPayload;
        setTracePulse(true);
        const timer = window.setTimeout(() => setTracePulse(false), 900);
        return () => window.clearTimeout(timer);
    }, [adminMeta, copyPayload]);

    return (
        <TooltipProvider delayDuration={100}>
            <div
                className={cn(
                    'group flex w-full overflow-hidden',
                    fixedHeight
                        ? 'flex-nowrap items-center gap-x-3'
                        : isMobile
                            ? 'flex-col items-stretch gap-y-2'
                            : 'flex-nowrap items-center gap-x-3',
                    className,
                )}
                style={fixedHeight ? { ...justifyStyle, height: rowHeight } : undefined}
            >
                {/* Audio Meta - Minimalist */}
                {time && !summaryOnly && (
                    <TooltipWrapper content="Session Start Time">
                        <SessionTimeWithSmallerMeridiem
                            time={time}
                            className={cn(
                                metaFont('text-[10px]'),
                                "cursor-default whitespace-nowrap shrink-0 transition-colors",
                                isMobile ? "text-muted-foreground/70" : "text-muted-foreground/20 hover:text-muted-foreground/50"
                            )}
                            meridiemClassName={metaFont('text-[9px]')}
                        />
                    </TooltipWrapper>
                )}
                {adminMeta && audioDuration && !summaryOnly && (
                    <TooltipWrapper content="Speech duration (silence excluded)">
                        <div
                            className={cn(
                                "flex items-center gap-1 transition-opacity cursor-default",
                                isMobile ? "text-muted-foreground/70" :"text-muted-foreground/20"
                            )}
                        >
                            <Timer className="w-2.5 h-2.5" />
                            <span className={metaFont('text-[10px]')}>{audioDuration}</span>
                        </div>
                    </TooltipWrapper>
                )}

                {adminMeta && !summaryOnly && (
                    <TooltipWrapper
                        content={
                            <div className="text-xs space-y-1">
                                <p>Specified (session) / response (STT)</p>
                                {sttRequestLanguage ? (
                                    <p className="text-muted-foreground/80">
                                        Request language: {sttRequestLanguage}
                                    </p>
                                ) : null}
                            </div>
                        }
                    >
                        <span className={cn(
                            "flex items-center gap-1 cursor-default text-muted-foreground/45",
                            metaFont('text-[9px]'),
                        )}>
                            <Globe className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            {sourceOverResponseLabel}
                        </span>
                    </TooltipWrapper>
                )}

                {adminMeta && !summaryOnly && (
                    <SttRoutingBadge
                        timing={timing}
                        pipelineSttDebugLabel={pipelineSttDebugLabel}
                        subtitleFontClassName={subtitleFontForMeta}
                    />
                )}

                {/* Inline latency — same gate as other admin/debug meta */}
                {adminMeta && stageTimings && !summaryOnly && (
                    <div className="flex items-center gap-2">
                        {stageTimings.asr && (
                            <TooltipWrapper content={<LatencyTooltipContent mKey="asr" ms={stageTimings?.asr} at={formatEpochMs(stageTimings?.abs.asr)} />}>
                                <div className="flex items-center gap-1 cursor-help">
                                    <Zap className={cn("w-2.5 h-2.5", getStatusColor(stageTimings?.asr, 'asr'))} />
                                    <span className={cn('text-[9px] tabular-nums text-teal-700/85 dark:text-teal-400/80', subtitleFontForMeta ?? 'font-mono')}>{stageTimings.asr}ms</span>
                                </div>
                            </TooltipWrapper>
                        )}
                        {stageTimings.ctft && (
                            <TooltipWrapper content={<LatencyTooltipContent mKey="ctft" ms={stageTimings?.ctft} at={formatEpochMs(stageTimings?.abs.ctft)} />}>
                                <div className="flex items-center gap-1 cursor-help">
                                    <PiMagicWandLight className={cn("w-2.5 h-2.5", getStatusColor(stageTimings?.ctft, 'ctft'))} />
                                    <span className={cn('text-[9px] tabular-nums text-teal-700/85 dark:text-teal-400/80', subtitleFontForMeta ?? 'font-mono')}>{stageTimings.ctft}ms</span>
                                </div>
                            </TooltipWrapper>
                        )}
                        {stageTimings.mt && (
                            <TooltipWrapper content={<LatencyTooltipContent mKey="mt" ms={stageTimings?.mt} at={formatEpochMs(stageTimings?.abs.mt)} />}>
                                <div className="flex items-center gap-1 cursor-help">
                                    <PiTranslateLight className={cn("w-2.5 h-2.5", getStatusColor(stageTimings?.mt, 'mt'))} />
                                    <span className={cn('text-[9px] tabular-nums text-teal-700/85 dark:text-teal-400/80', subtitleFontForMeta ?? 'font-mono')}>{stageTimings.mt}ms</span>
                                </div>
                            </TooltipWrapper>
                        )}
                    </div>
                )}

                {/* Developer Inspect Popover */}
                {adminMeta && (
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                aria-label="Open trace debug details"
                                title="Open trace debug details"
                                className={cn(
                                    'shrink-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35',
                                    fixedHeight
                                        ? cn(align === 'left' && 'ml-auto', 'rounded-full border px-2.5 py-2 text-left')
                                        : isMobile
                                            ? cn(align === 'left' && 'ml-auto', 'flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/48')
                                            : cn(align === 'left' && 'ml-auto', 'flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/42'),
                                    fixedHeight
                                        ? 'bg-[rgba(15,23,42,0.62)] backdrop-blur-md border-white/8 text-teal-100/90 hover:border-teal-400/30 hover:bg-[rgba(15,23,42,0.8)]'
                                        : 'bg-transparent hover:bg-white/[0.045] hover:text-teal-200/80',
                                    fixedHeight && popoverOpen && 'border-teal-400/35 bg-[rgba(15,23,42,0.86)] shadow-[0_0_0_1px_rgba(45,212,191,0.08),0_10px_30px_rgba(2,8,23,0.34)]',
                                    !fixedHeight && popoverOpen && 'bg-white/[0.07] text-teal-200/85',
                                    fixedHeight && tracePulse && 'animate-pulse-subtle border-teal-300/35',
                                )}
                            >
                                <div className={cn('flex items-center justify-between gap-2', !fixedHeight && 'relative')}>
                                    {fixedHeight ? (
                                        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-200/80">
                                            <ScanSearch className="h-3.5 w-3.5" />
                                            Trace
                                        </span>
                                    ) : (
                                        <ScanSearch className="h-3.5 w-3.5" />
                                    )}
                                    <span
                                        className={cn(
                                            fixedHeight ? 'h-1.5 w-1.5' : 'absolute -right-0.5 -top-0.5 h-1.5 w-1.5',
                                            'rounded-full bg-teal-300/70 transition-all duration-300',
                                            tracePulse && 'scale-125 bg-teal-200 shadow-[0_0_10px_rgba(94,234,212,0.55)]',
                                        )}
                                    />
                                </div>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            side={isMobile ? 'bottom' : 'bottom'}
                            align={isMobile ? 'center' : align === 'right' ? 'end' : 'start'}
                            sideOffset={isMobile ? 10 : 4}
                            className={cn(
                                "overflow-hidden rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.96)] p-0 text-popover-foreground shadow-[0_24px_80px_rgba(2,8,23,0.58)]",
                                isMobile ? "w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)]" : "w-[22rem] max-w-[calc(100vw-1rem)]",
                            )}
                        >
                            <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-3 h-3 text-teal-600/90 dark:text-teal-400/85" />
                                    <span className="text-[11px] font-bold tracking-tight text-teal-800/90 dark:text-teal-300/85">Stage Trace Analysis</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {tracePulse && (
                                        <span className="rounded-full border border-teal-400/15 bg-teal-400/8 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-teal-200/80">
                                            Updated
                                        </span>
                                    )}
                                    <span className="text-[9px] font-bold text-muted-foreground/40 tracking-widest uppercase">JSON</span>
                                    <CopyButton value={copyPayload} className="h-7 w-7 border-none shadow-none" />
                                </div>
                            </div>
                            {detailsBody}
                            {!isMobile && (
                                <div className="flex items-center justify-between px-3 py-1.5 text-[9px] font-bold tracking-tight text-muted-foreground/80">
                                    <span className="text-emerald-600/85 dark:text-emerald-400/80">● Excellent</span>
                                    <span className="text-amber-600/85 dark:text-amber-400/80">● Fair</span>
                                    <span className="text-rose-600/85 dark:text-rose-400/80">● Poor</span>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        </TooltipProvider>
    );
}
