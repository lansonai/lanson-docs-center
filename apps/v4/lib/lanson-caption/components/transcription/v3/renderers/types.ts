/**
 * Shared types for all TranscriptLine renderer components.
 *
 * Status lifecycle:
 *   idle → streaming (ASR live) → pausing (ASR done, awaiting correction)
 *        → correcting (correction animating in) → final (stable)
 */
export type TranscriptLineStatus =
    | 'idle'
    | 'streaming'
    | 'pausing'
    | 'correcting'
    | 'final';

import { CorrectionTiming, TextAlign } from '@/components/transcription/types';

export interface TranscriptLineBaseProps {
    /** Raw ASR text as it comes in from the speech engine */
    asrText: string;
    /** LLM-corrected text (undefined while correction is in flight) */
    correctedText?: string;
    status: TranscriptLineStatus;
    transcriptionSize?: 'S' | 'M' | 'L';

    // ── Meta Display Props ────────────────────────────────────────────────────
    /** Wall clock time of the segment, e.g. "10:24:30" */
    time?: string;
    /** Duration of the audio segment, e.g. "2.3s" */
    audioDuration?: string;
    /** Detailed timing breakdown for verbose mode */
    timing?: CorrectionTiming;
    /** STT response language (admin verbose meta) */
    detectedLanguage?: string;
    /** Effective STT request language (admin JSON / tooltip). */
    sttRequestLanguage?: string;
    /** User-selected source; left of `AUTO/EN` in admin meta. */
    sourceLanguage?: string;
    /** Pre-calculated ASR latency string */
    asrLatency?: string;

    /** Meta (time) row — time only unless debug extras also apply. */
    showMeta?: boolean;
    /** Debug-meta toggle — extras only with {@link showMeta} and {@link isAdmin} (dev or Supabase admin). */
    showVerboseMode?: boolean;
    /** `import.meta.env.DEV` or Supabase admin — required for debug-meta content with {@link showVerboseMode}. */
    isAdmin?: boolean;
    /** Alignment of the text and meta row */
    textAlign?: TextAlign;

    className?: string;
}
