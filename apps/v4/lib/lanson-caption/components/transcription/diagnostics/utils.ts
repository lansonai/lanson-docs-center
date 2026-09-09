import { VoiceImeEventLogEntry, VoiceImeEventType } from '@/contracts/voice-ime-session';
import { VoiceImeDiagnosticLog } from '@/lib/voice-ime/voiceImeLogger';

export type DiagnosticsTab = 'session' | 'runtime';

export type CorrectionChange = { original: string; corrected: string; reason: string };
export type DiffSegment = { type: 'equal' | 'delete' | 'insert'; text: string };

export type SegmentSummary = {
    id: string;
    firstTime: number;
    lastTime: number;
    audioDuration?: string;
    asrMs?: string;
    corrMs?: string;
    transcriptText?: string;
    correctionBefore?: string;
    correctionAfter?: string;
    correctionData?: {
        words?: CorrectionChange[];
        confidence?: number;
    };
    events: VoiceImeEventLogEntry[];
    pipelinePhase: 'vad' | 'asr' | 'correction' | 'done';
};

export type SessionTimelineItem =
    | { kind: 'segment'; key: string; time: number; segment: SegmentSummary }
    | { kind: 'event'; key: string; time: number; event: VoiceImeEventLogEntry };

export const SEGMENT_ALIAS_PATTERN = /^(.*)-seg-(\d+)$/;

export function normalizeSegmentAliasId(value: string) {
    const match = value.match(SEGMENT_ALIAS_PATTERN);
    if (!match) return value;
    const [, baseId, segmentIndex] = match;
    if (segmentIndex === '0') return baseId;
    return value;
}

export function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

export function formatMs(value: unknown) {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    if (!text || text === '?' || text.toLowerCase() === 'n/a') return undefined;
    const num = Number(text);
    if (Number.isFinite(num)) return `${Math.round(num)} ms`;
    const match = text.match(/(\d+(\.\d+)?)/);
    if (match) return `${Math.round(Number(match[1]))} ms`;
    return text.length > 0 ? text : undefined;
}

export function formatValue(value: unknown) {
    if (value === null || value === undefined) return undefined;
    const text = String(value).trim();
    if (!text || text === '?' || text.toLowerCase() === 'n/a') return undefined;
    return text;
}

export function formatAudio(value: unknown) {
    const text = formatValue(value);
    if (!text) return undefined;
    if (/^\d+(\.\d+)?$/.test(text)) {
        const num = parseFloat(text);
        return `${num.toFixed(1)}s`;
    }
    return text;
}

export function formatId(value: unknown) {
    const text = formatValue(value);
    if (!text) return undefined;
    if (text.length <= 20) return text;
    return `${text.slice(0, 10)}...${text.slice(-6)}`;
}

export function toNumberOrUndefined(value: unknown) {
    if (value === null || value === undefined) return undefined;
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
}

export function isCorrectionChange(value: unknown): value is CorrectionChange {
    if (!value || typeof value !== 'object') return false;
    const v = value as any;
    return typeof v.original === 'string'
        && typeof v.corrected === 'string'
        && typeof v.reason === 'string';
}

export function asCorrectionChanges(value: unknown): CorrectionChange[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const next = value.filter(isCorrectionChange);
    return next.length > 0 ? next : undefined;
}

export function getPhaseLabel(type?: VoiceImeEventType) {
    switch (type) {
        case 'VAD_SPEECH_START': return 'Listening';
        case 'VAD_SPEECH_END': return 'Segment detected';
        case 'ASR_COMPLETE': return 'Transcribed';
        case 'CORRECTION_COMPLETE': return 'Corrected';
        case 'UTTERANCE_FINALIZED': return 'Finalized';
        case 'RECORDING_START': return 'Recording';
        case 'RECORDING_STOP': return 'Stopped';
        case 'ERROR': return 'Error';
        case 'SYSTEM': return 'System';
        default: return 'Idle';
    }
}

export function getEventTextTone(type?: VoiceImeEventType) {
    switch (type) {
        case 'ERROR': return 'text-red-200';
        case 'SYSTEM': return 'text-sky-200';
        case 'CORRECTION_COMPLETE': return 'text-emerald-200';
        case 'ASR_COMPLETE': return 'text-indigo-200';
        case 'VAD_SPEECH_START':
        case 'VAD_SPEECH_END': return 'text-amber-200';
        case 'RECORDING_START':
        case 'RECORDING_STOP': return 'text-lime-200';
        default: return 'text-muted-foreground';
    }
}

export function getEventDotTone(type?: VoiceImeEventType) {
    switch (type) {
        case 'ERROR': return 'bg-red-400';
        case 'SYSTEM': return 'bg-sky-400';
        case 'CORRECTION_COMPLETE': return 'bg-emerald-400';
        case 'ASR_COMPLETE': return 'bg-indigo-400';
        case 'VAD_SPEECH_START':
        case 'VAD_SPEECH_END': return 'bg-amber-400';
        case 'RECORDING_START':
        case 'RECORDING_STOP': return 'bg-lime-400';
        default: return 'bg-muted-foreground/70';
    }
}

export function getLogTone(level?: VoiceImeDiagnosticLog['level']) {
    if (level === 'error') return 'text-red-200';
    if (level === 'warn') return 'text-amber-200';
    return 'text-muted-foreground';
}

export function getLogDotTone(level?: VoiceImeDiagnosticLog['level']) {
    if (level === 'error') return 'bg-red-400';
    if (level === 'warn') return 'bg-amber-400';
    return 'bg-muted-foreground/70';
}

/**
 * Granular character-level diffing utility.
 * Returns an array of changes to allow multiple words within a single sentence.
 */
export function getDiffSegments(original: string, previousOriginal?: string): DiffSegment[] {
    if (!previousOriginal || original === previousOriginal) {
        return [{ type: 'equal', text: original }];
    }

    const oldChars = [...previousOriginal];
    const newChars = [...original];
    const segments: DiffSegment[] = [];

    let i = 0; // old index
    let j = 0; // new index

    while (i < oldChars.length || j < newChars.length) {
        if (i < oldChars.length && j < newChars.length && oldChars[i] === newChars[j]) {
            let start = i;
            while (i < oldChars.length && j < newChars.length && oldChars[i] === newChars[j]) {
                i++;
                j++;
            }
            segments.push({ type: 'equal', text: oldChars.slice(start, i).join('') });
        } else {
            let nextI = i;
            let nextJ = j;
            let foundMatch = false;

            for (let lookAhead = 1; lookAhead < 10; lookAhead++) {
                if (i + lookAhead < oldChars.length && oldChars[i + lookAhead] === newChars[j]) {
                    nextI = i + lookAhead;
                    nextJ = j;
                    foundMatch = true;
                    break;
                }
                if (j + lookAhead < newChars.length && newChars[j + lookAhead] === oldChars[i]) {
                    nextI = i;
                    nextJ = j + lookAhead;
                    foundMatch = true;
                    break;
                }
            }

            if (!foundMatch) {
                let found = false;
                for (let oi = i; oi < Math.min(i + 20, oldChars.length); oi++) {
                    for (let ni = j; ni < Math.min(j + 20, newChars.length); ni++) {
                        if (oldChars[oi] === newChars[ni]) {
                            nextI = oi;
                            nextJ = ni;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }

                if (!found) {
                    nextI = oldChars.length;
                    nextJ = newChars.length;
                }
            }

            if (nextI > i) {
                segments.push({ type: 'delete', text: oldChars.slice(i, nextI).join('') });
            }
            if (nextJ > j) {
                segments.push({ type: 'insert', text: newChars.slice(j, nextJ).join('') });
            }
            i = nextI;
            j = nextJ;
        }
    }

    return segments;
}
