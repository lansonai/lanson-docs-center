/**
 * Typography configuration for transcription components
 * 核心：彻底去掉字符串拼接。
 * 每一个 Class 都是完整、静态的字符串，方便全局搜索和调试。
 */

import type { EmbedTranscriptionFont, EmbedTranscriptionWeight } from '@/lib/embed/embedBridge';
import { cn } from '@/lib/utils';
import { isCjkText } from './utils';

// --- 1. 类型定义 ---
export type TypographySize = 'S' | 'M' | 'L';
export type TypographyType = 'original' | 'translation';

// --- 2. 布局配置 (Layout Config) ---
export const LAYOUT_CONFIG = {
    /** 容器宽度断点 */
    BREAKPOINTS: {
        SINGLE_TO_DOUBLE: 750, // 从 1 列切换到 2 列的阈值 (用户指定)
        DOUBLE_TO_TRIPLE: 1100, // 从 2 列切换到 3 列的阈值
    },
    /** 列数限制 (最大 3 列) */
    MAX_COLUMNS: 3,
    /** Segment 之间的间距 (px) — 移动端可见行优先，缩紧间隙 */
    GAP: 8,
    LINE_GAP: 4,     // Gap between transcription and translation
    META_GAP: 2,     // Gap between text and metadata
    // Gap between slots in the grid.
    // NOTE: Consumed across the app; keep the source-of-truth here.
    GRID_GAP: 14,
    TRANSLATION_SCALE: 1, // Scale for translation text
} as const;

export function getGridGapPx(isMobile: boolean): number {
    // Mobile needs denser vertical rhythm; desktop keeps the relaxed spacing.
    return isMobile ? 12 : LAYOUT_CONFIG.GRID_GAP;
}

export function getTraceRowHeightPx(isMobile: boolean): number {
    return isMobile ? 26 : 28;
}

export function getPushLineViewportHeightPx(size: TypographySize): number {
    // Push renderer uses a fixed physical viewport height so the GPU-only translateY
    // animation doesn't depend on font metrics. Use the slot row height (lineHeight).
    return BASE_METRICS[size].lineHeight;
}

export interface FontConfig {
    cjk: string;
    latin: string;
}

export interface SlotLayoutConfig {
    META_HEIGHT: number;
    ROW_HEIGHT: number;
}

// --- 1. 原子指标 (Source of Truth) ---
/**
 * 所有的布局高度不再是魔法值，而是基于行高、Meta 高度和预定义的间隙计算而成。
 * 遵循公式：SLOT_HEIGHT = (2 * LINE_HEIGHT) + META_HEIGHT + VERTICAL_BUFFER
 */
const BASE_METRICS = {
    S: {
        cjkSize: 14,
        latinSize: 16,
        lineHeight: 20,
        metaHeight: 20,
        verticalBuffer: 16,
    },
    M: {
        cjkSize: 15,  // S+1
        latinSize: 17, // S+1
        lineHeight: 24,
        metaHeight: 22,
        verticalBuffer: 16,
    },
    L: {
        cjkSize: 17,  // M+2
        latinSize: 19, // M+2
        lineHeight: 27,
        metaHeight: 24,
        verticalBuffer: 18,
    },
} as const;

// --- 2. 排版配置 (Tailwind-safe, fully static strings) ---
// IMPORTANT: These class strings must remain static literals so Tailwind can
// reliably include them in the generated CSS (no runtime interpolation).
const STYLE_MAP: Record<TypographySize, { original: FontConfig; translation: FontConfig }> = {
    S: {
        original: {
            cjk: 'text-[15px] leading-[22px] antialiased',
            latin: 'text-[16px] leading-[24px] antialiased',
        },
        translation: {
            cjk: 'text-[15px] leading-[22px] antialiased',
            latin: 'text-[16px] leading-[24px] antialiased',
        },
    },
    M: {
        original: {
            cjk: 'text-[16px] leading-[24px] antialiased',
            latin: 'text-[17px] leading-[28px] antialiased',
        },
        translation: {
            cjk: 'text-[15px] leading-[24px] antialiased lang-zh',
            latin: 'text-[17px] leading-[28px] antialiased',
        },
    },
    L: {
        original: {
            cjk: 'text-[18px] leading-[27px] antialiased',
            latin: 'text-[19px] leading-[30px] antialiased',
        },
        translation: {
            cjk: 'text-[18px] leading-[27px] antialiased',
            latin: 'text-[19px] leading-[30px] antialiased',
        },
    },
};

// --- 3. 自动化布局计算 ---

export interface SlotLayoutConfig {
    totalHeight: number;
    originalOffset: number;
    translationOffset: number;
    metaOffset: number;
    lineHeight: number;
    verticalBuffer: number;
    // Legacy support for older components if needed
    META_HEIGHT: number;
    ROW_HEIGHT: number;
}

/**
 * [The Lanson Way] Source of Truth for all transcription layouts.
 * This function handles the multi-axial constraints: size, displayMode, showMeta.
 * It strictly separates 'Canvas' (Physical UI presence) from 'Content' (Data states).
 */
export function getSlotLayoutConfig(
    size: TypographySize,
    displayMode: 'both' | 'transcript' | 'translation',
    showMeta: boolean,
    _showVerboseMode: boolean = false,
    textLineClamp: number = 1,
    _isMobile: boolean = false
): SlotLayoutConfig {
    const m = BASE_METRICS[size];
    /** One dedicated meta row (same for all users); reserved when the Meta toggle is on. */
    const hasMeta = showMeta;
    const effectiveTextLineClamp = Math.max(1, textLineClamp);

    // 1. 基准行高和缓冲 (Dynamic Buffer based on density)
    const lineHeight = m.lineHeight;
    // Single mode reduces vertical buffer to increase density dramatically
    let verticalBuffer = displayMode === 'both' ? m.verticalBuffer : Math.round(m.verticalBuffer * 0.6);
    // Mobile density: reduce buffer when we already spend extra height on multi-line clamping.
    if (_isMobile) {
        const clampFactor = effectiveTextLineClamp >= 2 ? 0.6 : 0.75;
        verticalBuffer = Math.max(10, Math.round(verticalBuffer * clampFactor));
    }

    // 2. 核心行逻辑 (Intent-based)
    const showOriginal = displayMode === 'both' || displayMode === 'transcript';
    const showTranslation = displayMode === 'both' || displayMode === 'translation';

    // 3. 计算各个组件的相对位置 (The coordinate system)
    // 无论数据是否到达，只要 displayMode 允许，我们就预留位置。
    let currentOffset = Math.round(verticalBuffer / 2);

    const originalOffset = showOriginal ? currentOffset : -1000;
    if (showOriginal) currentOffset += lineHeight * effectiveTextLineClamp;

    // Gap between lines only if both are intended to be shown
    if (showOriginal && showTranslation && displayMode === 'both') {
        currentOffset += LAYOUT_CONFIG.LINE_GAP; // Standard line gap
    }

    const translationOffset = showTranslation ? currentOffset : -1000;
    if (showTranslation) currentOffset += lineHeight * effectiveTextLineClamp;

    const metaOffset = hasMeta ? currentOffset + LAYOUT_CONFIG.META_GAP : -1000;
    const finalMetaHeight = hasMeta ? m.metaHeight : 0;

    // Final height of the physical slot
    const totalHeight = currentOffset + finalMetaHeight + Math.round(verticalBuffer / 2);

    return {
        totalHeight,
        originalOffset,
        translationOffset,
        metaOffset,
        lineHeight,
        verticalBuffer,
        META_HEIGHT: m.metaHeight,
        ROW_HEIGHT: m.lineHeight
    };
}

/**
 * Helper to get the total height for grid/animation config.
 */
export function getSlotHeight(
    size: TypographySize,
    displayMode: 'both' | 'transcript' | 'translation',
    showMeta: boolean,
    showVerboseMode: boolean = false,
    textLineClamp: number = 1,
    isMobile: boolean = false
): number {
    return getSlotLayoutConfig(size, displayMode, showMeta, showVerboseMode, textLineClamp, isMobile).totalHeight;
}

export const SLOT_HEIGHTS: Record<TypographySize, number> = {
    S: getSlotHeight('S', 'both', true),
    M: getSlotHeight('M', 'both', true),
    L: getSlotHeight('L', 'both', true),
} as const;

export const SLOT_HEIGHTS_SINGLE: Record<TypographySize, number> = {
    S: getSlotHeight('S', 'transcript', true),
    M: getSlotHeight('M', 'transcript', true),
    L: getSlotHeight('L', 'transcript', true),
} as const;

export const SLOT_LAYOUT: Record<TypographySize, { META_HEIGHT: number; ROW_HEIGHT: number }> = {
    S: { META_HEIGHT: BASE_METRICS.S.metaHeight, ROW_HEIGHT: BASE_METRICS.S.lineHeight },
    M: { META_HEIGHT: BASE_METRICS.M.metaHeight, ROW_HEIGHT: BASE_METRICS.M.lineHeight },
    L: { META_HEIGHT: BASE_METRICS.L.metaHeight, ROW_HEIGHT: BASE_METRICS.L.lineHeight },
} as const;

// 骨架屏高度也同步计算
const LOADING_MAP = {
    S: { transcript: `h-[${BASE_METRICS.S.lineHeight}px]`, translation: `h-[${BASE_METRICS.S.lineHeight}px]` },
    M: { transcript: `h-[${BASE_METRICS.M.lineHeight}px]`, translation: `h-[${BASE_METRICS.M.lineHeight}px]` },
    L: { transcript: `h-[${BASE_METRICS.L.lineHeight}px]`, translation: `h-[${BASE_METRICS.L.lineHeight}px]` }
} as const;

// --- 4. 核心工具函数 ---

/**
 * 获取纯文本区域高度 (不含 Meta)
 */
export function getTextAreaHeight(
    size: TypographySize,
    displayMode: 'both' | 'transcript' | 'translation',
    isMobile: boolean = false
): number {
    const config = getSlotLayoutConfig(size, displayMode, false, false, 1, isMobile);
    return config.totalHeight - (config.verticalBuffer);
}

/**
 * 获取排版类名（字号 / 行高 / tracking）
 * 使用 {@link isCjkText} 对传入 `text` 采样，在 CJK 与 Latin 两套静态 Tailwind 配置间二选一。
 */
export function getTypographyClasses(
    size: TypographySize,
    type: TypographyType,
    text: string,
    _isMobile: boolean = false
): string {
    const isCJK = isCjkText(text);
    const config = STYLE_MAP[size][type];
    return isCJK ? config.cjk : config.latin;
}

/**
 * 获取占位符高度 (Loading)
 */
export function getPlaceholderHeight(
    size: TypographySize,
    type: 'transcript' | 'translation',
    _isMobile: boolean = false
): string {
    return LOADING_MAP[size][type];
}

/**
 * 针对单词数组的类名获取 (性能采样判定)
 */
export function getWordsTypographyClasses(
    size: TypographySize,
    words: { text: string }[],
    isMobile: boolean = false
): string {
    // 采样判定
    const sampleText = words.slice(0, 15).map(w => w.text).join('');
    return getTypographyClasses(size, 'original', sampleText, isMobile);
}

/**
 * 获取嵌入模式下的排版类名 (字体、字重)
 */
export function getEmbedTypographyClasses(
    font?: EmbedTranscriptionFont,
    _weight?: EmbedTranscriptionWeight
): string {
    const classes: string[] = [];
    
    // Font family
    if (font === undefined)
        classes.push('font-embed-crimson');
    else if (font === 'noto-serif-sc') classes.push('font-embed-noto-serif-sc');
    else if (font === 'crimson-text') classes.push('font-embed-crimson');
    else if (font === 'century-gothic') classes.push('font-embed-futura');
    else if (font === 'system-sans') classes.push('font-sans');
    else if (font === 'system-serif') classes.push('font-serif');
    else if (font === 'system-mono') classes.push('font-mono');

    return classes.join(' ');
}

/**
 * Embed / host chrome: embed 专用字族字重 + 按**实际文案**做 CJK 判定后的字幕字号（与 slot 同源）。
 */
export function getEmbedChromeTypographyClasses(
    size: TypographySize,
    type: TypographyType,
    text: string,
    font?: EmbedTranscriptionFont,
    weight?: EmbedTranscriptionWeight,
): string {
    return cn(getEmbedTypographyClasses(font, weight), getTypographyClasses(size, type, text));
}

// 重新导出判定工具
export { isCjkText } from './utils';
