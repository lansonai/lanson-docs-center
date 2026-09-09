import type { V3SttRoutingFields } from "@/lib/realtime-transcription/v3SttRouting";

export type DisplayMode = "idle" | "compact" | "expanded";
export type Status = "online" | "warning" | "error" | "offline" | "loading";
export type TextAlign = "left" | "center" | "right";
export type DetailMode = "simple" | "detailed";
export type SubtitleSize = "S" | "M" | "L";

export interface TextSegment {
  correctionText: string;
  translations?: Record<string, string>;
  /** @deprecated Use translations instead */
  chineseTranslation?: string;
  /** @deprecated Use translations instead */
  englishTranslation?: string;
}

// ─── Correction Quality Data ──────────────────────────────────────────────────

export interface CorrectionWord {
  /** The wrong word, as originally transcribed */
  sourceWord: string;
  /** The corrected word after LLM processing */
  correctedWord: string;
  reason: string;
}

export interface CorrectionTiming extends V3SttRoutingFields {
  /** VAD ended — audio ready & request dispatched */
  vadEndTime: number;
  /** Transcription request sent */
  transcriptionStartTime: number;
  /** Full ASR result received (non-streaming, complete segment) */
  transcriptionEndTime?: number;
  /** Actual STT processing time from provider (Modal returns real value; Deepgram adaptive measures elapsed) */
  transcriptionTimeMs?: number;
  /** Correction + translation request start */
  correctionStartTime?: number;
  /** First token of correction stream received */
  correctionFirstTokenTime?: number;
  /** Full correction + translation received */
  correctionEndTime?: number;
  /** Parallel translation request start */
  translationStartTime?: number;
  /** Translation result received */
  translationEndTime?: number;
  wavEncodeMs?: number;
  uploadEstimateMs?: number;
  requestTotalMs?: number;
  responseParseMs?: number;
  wavBytes?: number;
  uploadBytes?: number;
  payloadBytes?: number;
  transcriptionProvider?: string;
  transportMode?: string;
  adaptiveBackend?: string;
  adaptiveProbeCount?: number;

  model?: string;
  statusCode?: number;
  normalizationModel?: string;
  normalizationStatusCode?: number;
  normalizationLatencyMs?: number;
  normalizationTtftMs?: number;
  normalizationPromptTokens?: number;
  normalizationCompletionTokens?: number;
  normalizationTotalTokens?: number;
  normalizationCachedTokens?: number;
  normalizationReasoningTokens?: number;

  // Absolute Unix epoch timestamps (for backend correlation/calibration)
  vadEndAt?: number;
  transcriptionStartAt?: number;
  transcriptionEndAt?: number;
  correctionStartAt?: number;
  correctionFirstTokenAt?: number;
  correctionEndAt?: number;
  translationStartAt?: number;
  translationEndAt?: number;
}

export interface CorrectionData {
  /** Word-level edits between transcriptText → correctionText */
  words?: CorrectionWord[];
  /** Previous correctionText value (for diff animation) */
  previousCorrectionText?: string;
  /** Previous translationText value (for diff animation) */
  previousTranslationText?: string;
  /** LLM correction confidence (0–1) */
  confidence?: number;
  /** End-to-end timing breakdown */
  timing?: CorrectionTiming;
  /** Duration of the audio segment, e.g. "2.3s" */
  audioDuration?: string;
}

// ─── Core Item ───────────────────────────────────────────────────────────────

/**
 * V3 realtime STT `paragraphLink` (API always sends one of these; never null).
 * - `new` — paragraph-boundary service ran and chose a new paragraph.
 * - `continue` — append to the previous ink line.
 * - `default` — boundary service did not produce a signal (skipped, failed, timeout, etc.). For ink display we merge into the previous line when one exists (same as `continue`) to avoid stray breaks next to real `new` rows.
 */
export type TranscriptParagraphLink = "new" | "continue" | "default";

/** Ink / transcript row merge: `continue` and fallback `default` append to the previous row when present. */
export function paragraphLinkMergesWithPrevious(
  link: TranscriptParagraphLink | "break" | undefined,
): boolean {
  return link === "continue" || link === "default";
}

export interface TranscriptItem {
  id: number | string;
  time: string;
  active: boolean;

  // ── Text pipeline — three stages, language-agnostic ──────────────────────
  /** Raw ASR output as-is from the speech engine (pre-correction) */
  transcriptText: string;
  /** LLM-corrected transcription text (homophone / entity / grammar fixes) */
  correctionText: string;
  /** Translation of correctionText into the target language */
  translationText: string;

  /** V3 ASR paragraph boundary; see {@link TranscriptParagraphLink}. Optional `break` is client/UI reserved. */
  paragraphLink?: TranscriptParagraphLink | "break";
  /** Raw ASR tail borrowed from this segment by the next segment for final display composition. */
  carryOutText?: string;

  // ── Correction quality (all correction-related data in one place) ─────────
  correctionData?: CorrectionData;

  // ── Misc ─────────────────────────────────────────────────────────────────
  status?:
    | "pending"
    | "transcribing"
    | "completed"
    | "error"
    | "capturing"
    | "listening";
  targetLanguage?: string;
  /** `language` from the STT **response** (admin verbose meta). */
  detectedLanguage?: string;
  /** Effective language sent on the STT **request**; distinct from {@link detectedLanguage}. */
  sttRequestLanguage?: string;
  allTranslations?: Record<string, string>;
  segments?: TextSegment[];
  appearTime?: number;
  delay?: string;
  processing?: boolean;
  processingTime?: string;
}
