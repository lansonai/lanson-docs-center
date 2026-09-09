/**
 * Shared utilities for live transcription components.
 */

import { getScript } from 'unicode-properties';

// LRU cache for CJK detection to avoid repeated calculations
const cjkCache = new Map<string, boolean>();
const MAX_CACHE_SIZE = 200;

/**
 * Detects if a character belongs to CJK scripts (Han, Hiragana, Katakana, Hangul).
 */
export function isCjkChar(char: string): boolean {
    const codePoint = char.codePointAt(0);
    if (!codePoint) return false;
    const script = getScript(codePoint);
    return ['Han', 'Hiragana', 'Katakana', 'Hangul'].includes(script);
}

/**
 * Detects if a character is specifically from the Han (Chinese) script.
 */
export function isHanChar(char: string): boolean {
    const codePoint = char.codePointAt(0);
    if (!codePoint) return false;
    return getScript(codePoint) === 'Han';
}

/**
 * Detects if the given text contains CJK characters.
 * Uses unicode-properties for accurate script detection with LRU caching.
 * 
 * Optimized for streaming transcription: samples first 30 characters only, 
 * skipping leading non-alphanumeric characters.
 */
export function isCjkText(text: string | null | undefined): boolean {
    if (!text) return false;

    // Sample first 15 characters - sufficient for language detection
    const sample = text.slice(0, 15);

    // Check cache first (True LRU logic)
    if (cjkCache.has(sample)) {
        const val = cjkCache.get(sample)!;
        cjkCache.delete(sample);
        cjkCache.set(sample, val);
        return val;
    }

    let hasCjk = false;
    for (const char of sample) {
        const codePoint = char.codePointAt(0);
        if (!codePoint) continue;

        const script = getScript(codePoint);
        if (['Han', 'Hiragana', 'Katakana', 'Hangul'].includes(script)) {
            hasCjk = true;
            break; // Early exit on first CJK character
        }
    }

    // LRU cache management
    if (cjkCache.size >= MAX_CACHE_SIZE) {
        const firstKey = cjkCache.keys().next().value;
        cjkCache.delete(firstKey);
    }
    cjkCache.set(sample, hasCjk);

    return hasCjk;
}

/**
 * Calculates the percentage of Han (Chinese) characters in a text.
 * Useful for distinguishing between Chinese and other CJK languages.
 */
export function getHanPercentage(text: string): number {
    if (!text) return 0;
    let hanCount = 0;
    let totalCount = 0;

    for (const char of text) {
        // Skip whitespace and common punctuation for better accuracy
        if (/\s|[.,!?;:，。！？；：]/.test(char)) continue;

        totalCount++;
        if (isHanChar(char)) {
            hanCount++;
        }
    }

    return totalCount === 0 ? 0 : hanCount / totalCount;
}


/**
 * Robust regex for splitting text into words/characters for diffing.
 * Correctly handles CJK characters, Emoji, and Latin words (including Spanish and French accents) using modern Unicode Property Escapes.
 * 
 * Updated logic: CJK characters are always split individually for proper animation
 * Priority order: Emoji > CJK scripts > Latin words > Other characters
 */
export const DIFF_SPLIT_REGEX = /\p{Emoji_Presentation}|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}|[\p{L}\p{N}'-]+|[^\s\p{L}\p{N}]/gu;

// ── Diff Types ────────────────────────────────────────────────────────────────

export type DiffWordState = 'stable' | 'replacing' | 'new';

export interface DiffWord {
    id: string | number;
    text: string;
    state: DiffWordState;
    replacedText?: string;
}

/**
 * Computes the difference between two strings and returns an array of DiffWord objects.
 * Used for both live transcription animations and history state highlighting.
 */
export function computeDiff(
    oldText: string,
    newText: string,
    prefixId: string = 'pos',
    onCorrection?: (oldSeg: string, newSeg: string) => void
): DiffWord[] {
    const oldWords = (oldText || '').match(DIFF_SPLIT_REGEX) || [];
    const newWords = (newText || '').match(DIFF_SPLIT_REGEX) || [];

    // Common prefix
    let start = 0;
    while (
        start < oldWords.length &&
        start < newWords.length &&
        oldWords[start] === newWords[start]
    ) {
        start++;
    }

    // Common suffix
    let oldEnd = oldWords.length - 1;
    let newEnd = newWords.length - 1;
    while (oldEnd >= start && newEnd >= start && oldWords[oldEnd] === newWords[newEnd]) {
        oldEnd--;
        newEnd--;
    }

    const result: DiffWord[] = [];

    // Left stable region
    for (let i = 0; i < start; i++) {
        result.push({ id: `${prefixId}_${i}`, text: newWords[i], state: 'stable' });
    }

    // Changed middle
    const oldMiddle = oldWords.slice(start, oldEnd + 1);
    const newMiddle = newWords.slice(start, newEnd + 1);

    if (onCorrection && newMiddle.some((w, i) => oldMiddle[i] && oldMiddle[i] !== w)) {
        onCorrection(oldMiddle.join(''), newMiddle.join(''));
    }

    for (let i = 0; i < newMiddle.length; i++) {
        const pos = start + i;
        const oldW = oldMiddle[i];
        const newW = newMiddle[i];

        const contentKey = `${newW}_${pos}`;
        const stableId = `${prefixId}_${pos}_${contentKey}`;

        if (oldW && oldW !== newW) {
            result.push({
                id: `${prefixId}_${pos}_replacing`,
                text: newW,
                state: 'replacing',
                replacedText: oldW,
            });
        } else if (!oldW) {
            result.push({ id: stableId, text: newW, state: 'new' });
        } else {
            result.push({ id: stableId, text: newW, state: 'stable' });
        }
    }

    // Right stable region
    for (let i = newEnd + 1; i < newWords.length; i++) {
        result.push({ id: `${prefixId}_${i}`, text: newWords[i], state: 'stable' });
    }

    return result;
}
