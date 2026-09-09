import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, Settings2 } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslation } from 'react-i18next';
import { TranscriptionLanguageHub } from '@/components/transcription/TranscriptionLanguageHub';
import type { TranscriptDisplayMode } from './HistoryTranscriptLineItem';

export type InkTheme = 'mica' | 'inkstone' | 'ebony' | 'ink';
export type InkSize = 'S' | 'M' | 'L';
export type InkAlign = 'left' | 'center' | 'right';

export interface TranscriptionHeaderInkProps {
    page: number;
    size: InkSize;
    align: InkAlign;
    theme: InkTheme;
    showTrace: boolean;
    showVerboseMode?: boolean;
    /** Debug-meta control: dev always; production admin only (match {@link LiveTranscription}). */
    canToggleVerboseMode?: boolean;
    onSizeChange: (size: InkSize) => void;
    onAlignChange: (align: InkAlign) => void;
    onThemeChange: (theme: InkTheme) => void;
    onTraceToggle: () => void;
    onVerboseModeToggle?: () => void;
    onArchiveToggle?: () => void;
    onBack?: () => void;
    isArchiveOpen?: boolean;
    currentPageItems?: number;
    totalItems?: number;
    maxSlotsPerPage?: number;
    targetLanguages?: string[];
    onTargetLanguagesChange?: (languages: string[]) => void;
    /** STT / conversation language (e.g. auto, zh, en). */
    sourceLanguage?: string;
    onSourceLanguageChange?: (code: string) => void;
    displayMode?: TranscriptDisplayMode;
    onDisplayModeChange?: (mode: TranscriptDisplayMode) => void;
    showMeta?: boolean;
    onShowMetaToggle?: () => void;
}

export const TranscriptionHeaderInk: React.FC<TranscriptionHeaderInkProps> = ({
    page,
    size,
    align,
    theme,
    showTrace,
    showVerboseMode = false,
    canToggleVerboseMode = false,
    onSizeChange,
    onAlignChange,
    onThemeChange,
    onTraceToggle,
    onVerboseModeToggle,
    onArchiveToggle,
    onBack,
    isArchiveOpen,
    currentPageItems = 0,
    totalItems = 0,
    maxSlotsPerPage = 0,
    targetLanguages,
    onTargetLanguagesChange,
    sourceLanguage = 'en',
    onSourceLanguageChange,
    displayMode = 'both',
    onDisplayModeChange,
    showMeta = true,
    onShowMetaToggle,
}) => {
    const { t } = useTranslation(['navigation', 'common', 'transcription']);
    const [sheetOpen, setSheetOpen] = useState(false);

    const toolBtn = (onClick: () => void, active: boolean, children: React.ReactNode, className?: string) => (
        <button
            type="button"
            onClick={onClick}
            className={cn("tool-btn px-2.5 py-1.5 text-xs", active && "active", className)}
        >
            {children}
        </button>
    );

    const handleArchiveToggleFromSheet = () => {
        onArchiveToggle?.();
        setSheetOpen(false); // 关闭设置面板，以便看到卷宗（历史）面板
    };

    const mobileToolbarContent = (
        <div className="flex flex-col gap-6 p-4 pb-[env(safe-area-inset-bottom)] max-h-[85vh] overflow-y-auto">
            <div>
                <p className="text-xs text-[var(--sub-ink)] opacity-70 mb-2">{t('transcription:size', { defaultValue: '字号' })}</p>
                <div className="flex gap-2">
                    {(['S', 'M', 'L'] as InkSize[]).map((s) => (
                        <button
                            key={s}
                            type="button"
                            onClick={() => onSizeChange(s)}
                            className={cn("tool-btn flex-1 py-2 text-sm", size === s && "active")}
                        >
                            {t(`transcription:ink_sizes.${s}`)}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <p className="text-xs text-[var(--sub-ink)] opacity-70 mb-2">{t('transcription:align', { defaultValue: '对齐' })}</p>
                <div className="flex gap-2">
                    <button type="button" onClick={() => onAlignChange('left')} className={cn("tool-btn flex-1 py-2", align === 'left' && "active")} title={t('transcription:ink_aligns.left')}>← {t('transcription:ink_aligns.left')}</button>
                    <button type="button" onClick={() => onAlignChange('center')} className={cn("tool-btn flex-1 py-2", align === 'center' && "active")} title={t('transcription:ink_aligns.center')}>↔ {t('transcription:ink_aligns.center')}</button>
                    <button type="button" onClick={() => onAlignChange('right')} className={cn("tool-btn flex-1 py-2", align === 'right' && "active")} title={t('transcription:ink_aligns.right')}>→ {t('transcription:ink_aligns.right')}</button>
                </div>
            </div>
            <div>
                <p className="text-xs text-[var(--sub-ink)] opacity-70 mb-2">{t('transcription:theme', { defaultValue: '主题' })}</p>
                <div className="flex gap-3">
                    {[
                        { k: 'mica' as InkTheme, bg: '#f6f8fa' },
                        { k: 'ebony' as InkTheme, bg: '#0d1117' },
                    ].map(({ k, bg }) => (
                        <button key={k} type="button" onClick={() => onThemeChange(k)} title={t(`transcription:ink_themes.${k}`)}
                            className={cn("theme-dot w-8 h-8 rounded-full border-2 flex-shrink-0", theme === k && "active")}
                            style={{ background: bg, borderColor: theme === k ? 'var(--ink)' : 'var(--border)' }}
                        />
                    ))}
                </div>
            </div>
            {(onSourceLanguageChange != null || onTargetLanguagesChange != null) && (
                <div>
                    <p className="text-xs text-[var(--sub-ink)] opacity-70 mb-2">
                        {t('transcription:language_hub_section_label', {
                            defaultValue: 'Language',
                        })}
                    </p>
                    <TranscriptionLanguageHub
                        sourceLanguage={sourceLanguage}
                        onSourceLanguageChange={onSourceLanguageChange}
                        targetLanguages={targetLanguages}
                        onTargetLanguagesChange={onTargetLanguagesChange}
                        maxTargetLanguages={1}
                        appearance="ink"
                        className="h-9 w-full px-3 text-sm bg-transparent text-[var(--sub-ink)] border border-[var(--border)] rounded-lg"
                    />
                </div>
            )}
            <div className="flex gap-2">
                {toolBtn(onTraceToggle, showTrace, t('transcription:trace', { defaultValue: '痕迹' }))}
                {onShowMetaToggle && toolBtn(onShowMetaToggle, showMeta, t('transcription:show_meta', { defaultValue: '元数据' }))}
                {canToggleVerboseMode && onVerboseModeToggle && toolBtn(onVerboseModeToggle, showVerboseMode, t('transcription:verbose', { defaultValue: '详细' }))}
            </div>
            {onDisplayModeChange && (
                <div>
                    <p className="text-xs text-[var(--sub-ink)] opacity-70 mb-2">{t('transcription:display_mode', { defaultValue: '显示模式' })}</p>
                    <div className="flex gap-2">
                        {(['both', 'transcript', 'translation'] as TranscriptDisplayMode[]).map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => onDisplayModeChange(m)}
                                className={cn("tool-btn flex-1 py-2 text-[10px]", displayMode === m && "active")}
                            >
                                {t(`transcription:display_modes.${m}`, { defaultValue: m })}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <header className="tool-bar mb-0 flex items-center justify-between pb-0 gap-x-2 min-w-0">
            {/* 左侧：移动端返回 + 页码（必须保留） */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="md:hidden flex items-center gap-1.5 rounded-md text-[11px] font-semibold transition-colors text-[var(--sub-ink)] hover:bg-[var(--highlight)] hover:text-[var(--ink)] flex-shrink-0"
                        title={t('transcription:backToDashboard', { defaultValue: 'Back to Dashboard' })}
                        aria-label={t('transcription:backToDashboard', { defaultValue: 'Back to Dashboard' })}
                    >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        {t('transcription:back', { defaultValue: 'Back' })}
                    </button>
                )}
                <span className="text-xl md:text-2xl leading-none" id="page-num">{page.toString().padStart(2, '0')}</span>
                <span className="text-xs text-[var(--sub-ink)] opacity-50 hidden sm:inline">/ {t('transcription:page_intro', { defaultValue: '序' })}</span>
                {maxSlotsPerPage > 0 && (
                    <span className="text-[9px] text-[var(--sub-ink)] opacity-60 ml-1 hidden md:inline">
                        {currentPageItems > 0 ? (
                            <>
                                {currentPageItems} / {maxSlotsPerPage}
                                {totalItems > 0 && <span className="opacity-70"> · {t('transcription:total', { defaultValue: '总计' })} {totalItems}</span>}
                            </>
                        ) : (
                            <span className="opacity-40">0 / {maxSlotsPerPage}</span>
                        )}
                    </span>
                )}
            </div>

            {/* 移动端：设置面板折叠到底部 Sheet（仅小屏显示） */}
            <div className="flex md:hidden flex-shrink-0 gap-2">
                {/* 卷宗 - 移动端一级入口 */}
                {onArchiveToggle && (
                    <button
                        type="button"
                        onClick={onArchiveToggle}
                        className={cn("tool-btn px-3 py-2", isArchiveOpen && "active")}
                    >
                        <span className="text-sm">{t('navigation:archives', '卷宗')}</span>
                    </button>
                )}

                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                    <SheetTrigger asChild>
                        <button type="button" className="tool-btn flex items-center gap-1.5 px-3 py-2" aria-label={t('navigation:inkSettings', '墨意')}>
                            <Settings2 className="w-4 h-4" />
                            <span className="text-sm">{t('navigation:inkSettings', '墨意')}</span>
                        </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="rounded-t-2xl bg-[var(--paper)]" data-theme={theme}>
                        <SheetHeader className="sr-only">
                            <SheetTitle>{t('navigation:inkSettings', '墨意')}</SheetTitle>
                        </SheetHeader>
                        {mobileToolbarContent}
                    </SheetContent>
                </Sheet>
            </div>

            {/* 右侧：桌面端控制按钮（md 及以上显示） */}
            <div className="hidden md:flex items-center gap-2 md:gap-4 lg:gap-8 flex-shrink-0 min-w-0">
                {/* 卷宗开关 - 必须保留 */}
                {onArchiveToggle && (
                    <button
                        onClick={onArchiveToggle}
                        className={cn("tool-btn border-r border-[var(--border)] pr-2 md:pr-4", isArchiveOpen && "active")}
                    >
                        {t('transcription:archive', { defaultValue: '卷宗' })}
                    </button>
                )}

                {/* 尺寸控制 - 必须保留，但可以简化 */}
                <div className="flex space-x-0.5 md:space-x-1 border-r border-[var(--border)] pr-2 md:pr-4">
                    {(['S', 'M', 'L'] as InkSize[]).map((s) => (
                        <button
                            key={s}
                            onClick={() => onSizeChange(s)}
                            className={cn("tool-btn text-[9px] md:text-[10px] px-1.5 md:px-2", size === s && "active")}
                        >
                            {t(`transcription:ink_sizes.${s}`)}
                        </button>
                    ))}
                </div>

                {/* 对齐控制 - 必须保留，小屏幕只显示图标 */}
                <div className="flex space-x-0.5 md:space-x-1 border-r border-[var(--border)] pr-2 md:pr-4">
                    <button
                        onClick={() => onAlignChange('left')}
                        className={cn("tool-btn text-[9px] md:text-[10px] px-1.5 md:px-2", align === 'left' && "active")}
                        title={t('transcription:ink_aligns.left')}
                    >
                        <span className="hidden sm:inline">{t('transcription:ink_aligns.left')}</span>
                        <span className="sm:hidden">←</span>
                    </button>
                    <button
                        onClick={() => onAlignChange('center')}
                        className={cn("tool-btn text-[9px] md:text-[10px] px-1.5 md:px-2", align === 'center' && "active")}
                        title={t('transcription:ink_aligns.center')}
                    >
                        <span className="hidden sm:inline">{t('transcription:ink_aligns.center')}</span>
                        <span className="sm:hidden">↔</span>
                    </button>
                    <button
                        onClick={() => onAlignChange('right')}
                        className={cn("tool-btn text-[9px] md:text-[10px] px-1.5 md:px-2", align === 'right' && "active")}
                        title={t('transcription:ink_aligns.right')}
                    >
                        <span className="hidden sm:inline">{t('transcription:ink_aligns.right')}</span>
                        <span className="sm:hidden">→</span>
                    </button>
                </div>

                {/* 主题切换 - 仅亮色(mica)与暗色(ebony) */}
                <div className="hidden lg:flex items-center space-x-2 xl:space-x-3 border-r border-[var(--border)] pr-2 md:pr-4">
                    <div
                        onClick={() => onThemeChange('mica')}
                        className={cn("theme-dot", theme === 'mica' && "active")}
                        style={{ background: '#f6f8fa', borderColor: '#d0d7de' }}
                        title={t('transcription:ink_themes.mica')}
                    />
                    <div
                        onClick={() => onThemeChange('ebony')}
                        className={cn("theme-dot", theme === 'ebony' && "active")}
                        style={{ background: '#0d1117', borderColor: '#21262d' }}
                        title={t('transcription:ink_themes.ebony')}
                    />
                </div>

                {/* 语言：转录（对话）+ 翻译目标 */}
                {(onSourceLanguageChange != null || onTargetLanguagesChange != null) && (
                    <div className="hidden xl:flex min-w-0 max-w-[14rem] items-center pr-2 md:pr-4 border-r border-[var(--border)]">
                        <TranscriptionLanguageHub
                            sourceLanguage={sourceLanguage}
                            onSourceLanguageChange={onSourceLanguageChange}
                            targetLanguages={targetLanguages}
                            onTargetLanguagesChange={onTargetLanguagesChange}
                            maxTargetLanguages={1}
                            appearance="ink"
                            className="h-7 min-w-0 w-full px-2 text-[10px] bg-transparent text-[var(--sub-ink)] hover:text-[var(--ink)] hover:bg-[var(--highlight)] border border-[var(--border)] rounded-md"
                        />
                    </div>
                )}

                {/* 痕迹/元数据控制 - 可以折叠 */}
                <div className="flex items-center gap-2 border-r border-[var(--border)] pr-2 md:pr-4">
                    <button
                        onClick={onTraceToggle}
                        className={cn("tool-btn border border-[var(--border)] hidden md:flex", showTrace && "active")}
                    >
                        {t('transcription:trace', { defaultValue: '痕迹' })}
                    </button>
                    {onShowMetaToggle && (
                        <button
                            onClick={onShowMetaToggle}
                            className={cn("tool-btn border border-[var(--border)] hidden md:flex", showMeta && "active")}
                        >
                            {t('transcription:show_meta', { defaultValue: '时间' })}
                        </button>
                    )}
                </div>

                {/* 显示模式控制 */}
                {onDisplayModeChange && (
                    <div className="flex space-x-0.5 md:space-x-1 border-r border-[var(--border)] pr-2 md:pr-4">
                        {(['both', 'transcript', 'translation'] as TranscriptDisplayMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => onDisplayModeChange(m)}
                                className={cn("tool-btn text-[9px] md:text-[10px] px-1.5 md:px-2", displayMode === m && "active")}
                            >
                                {t(`transcription:display_modes.${m}`, { defaultValue: m })}
                            </button>
                        ))}
                    </div>
                )}

                {/* 详细模式：管理员或开发环境（与 Live 控制栏一致） */}
                {canToggleVerboseMode && onVerboseModeToggle && (
                    <button
                        onClick={onVerboseModeToggle}
                        className={cn("tool-btn border border-[var(--border)] hidden md:flex", showVerboseMode && "active")}
                        title={t('transcription:verbose_desc', { defaultValue: '详细模式：显示延迟调试信息' })}
                    >
                        {t('transcription:verbose', { defaultValue: '详细' })}
                    </button>
                )}
            </div>
        </header>
    );
};
