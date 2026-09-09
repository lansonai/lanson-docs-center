/**
 * Map overlay API caption payloads → {@link TranscriptItem} for {@link ActiveTranscriptionStream}.
 * Keeps id alignment with `meta.latest_id` when present so SSE replay matches initial hydrate.
 *
 * **Translation map:** `event.translations` is a `Record<languageTag, translatedText>` from the API
 * (one subtitle string per target language). Lookup uses {@link resolveLanguageTableKey} so only
 * languages in the shared `LANGUAGES` catalog qualify; tags are matched with {@link languageTagMatchKey}.
 * No fallback to another language: unknown target or missing map entry → empty string.
 */

import type { LatestEvent } from '@/api/overlay';
import type { TranscriptItem } from '@/components/transcription/types';
import { languageTagMatchKey, resolveLanguageTableKey } from '@/config/languages';

/** REST + SSE payloads; `id` may be string (REST) or number (SSE) at runtime. */
export type OverlayCaptionEvent = LatestEvent & { event_time?: string };

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

function pickTranslation(
  translations: Record<string, string> | undefined,
  targetLanguage: string | undefined,
): string {
  if (!translations || Object.keys(translations).length === 0) return '';
  if (!targetLanguage?.trim()) return '';

  const resolvedTarget = resolveLanguageTableKey(targetLanguage);
  if (resolvedTarget === null) return '';

  const want = languageTagMatchKey(resolvedTarget);
  for (const [k, v] of Object.entries(translations)) {
    if (languageTagMatchKey(k) === want) return v;
  }
  return '';
}

/** Stable upsert key; prefer numeric SSE / meta.latest_id when available. */
export function overlayEventStableId(
  ev: OverlayCaptionEvent,
  numericId?: number | null,
): string {
  if (numericId != null && numericId > 0) return `n:${numericId}`;
  const rid = (ev as { id?: string | number }).id;
  if (typeof rid === 'number' && rid > 0) return `n:${rid}`;
  if (typeof rid === 'string' && rid.length > 0) return `s:${rid}`;
  return `h:${ev.correctedText}|${ev.event_time ?? ''}`;
}

export function overlayCaptionToTranscriptItem(
  ev: OverlayCaptionEvent,
  opts: {
    targetLanguage?: string;
    numericId?: number | null;
  },
): TranscriptItem {
  const translationText = pickTranslation(ev.translations, opts.targetLanguage);
  const id = overlayEventStableId(ev, opts.numericId);
  return {
    id,
    time: formatTime(ev.event_time),
    active: false,
    transcriptText: ev.correctedText,
    correctionText: ev.correctedText,
    translationText,
    status: 'completed',
    targetLanguage: opts.targetLanguage,
    allTranslations: ev.translations,
    correctionData:
      ev.corrections && ev.corrections.length > 0
        ? {
            words: ev.corrections.map((c) => ({
              sourceWord: c.original,
              correctedWord: c.corrected,
              reason: c.reason,
            })),
            confidence: ev.correctionConfidence,
          }
        : undefined,
  };
}

export function upsertOverlayCaptionRow(
  prev: TranscriptItem[],
  item: TranscriptItem,
  maxItems = 80,
): TranscriptItem[] {
  const key = String(item.id);
  const idx = prev.findIndex((p) => String(p.id) === key);
  let next: TranscriptItem[];
  if (idx >= 0) {
    next = [...prev];
    next[idx] = item;
  } else {
    next = [...prev, item];
  }
  return next.length > maxItems ? next.slice(-maxItems) : next;
}
