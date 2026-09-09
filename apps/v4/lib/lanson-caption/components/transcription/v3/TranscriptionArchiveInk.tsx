import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * 修复 t 函数作用域问题：确保在组件内部正确获取 t
 */

export interface ArchiveItem {
  correctionText: string;
  translationText: string;
  id?: string;
  correctionData?: {
    words?: Array<{
      sourceWord: string;
      correctedWord: string;
      reason: string;
    }>;
  } | null;
}

export interface TranscriptionArchiveInkProps {
  history: { page: number; data: ArchiveItem[] }[];
  showTrace?: boolean;
  onClose?: () => void;
}

const ArchiveItemDisplay = React.memo(
  ({ item, showTrace }: { item: ArchiveItem; showTrace: boolean }) => {
    const { t } = useTranslation("transcription");
    const renderContent = (
      text: string,
      correction: [string, string] | null | undefined,
    ) => {
      if (!showTrace || !correction || !correction[0] || !correction[1]) {
        return text;
      }

      const [wrong, right] = correction;

      // 使用正则全局匹配所有的 right 关键词，以便处理多个相同关键词的情况
      // 注意：这里需要对 right 进行正则转义，防止包含特殊字符
      const escapedRight = right.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const parts = text.split(new RegExp(`(${escapedRight})`, "g"));

      return (
        <>
          {parts.map((part, index) => {
            if (part === right) {
              return (
                <React.Fragment key={index}>
                  <span className="line-through opacity-40">{wrong}</span>
                  <span style={{ color: "var(--correct)" }} className="ml-1">
                    {right}
                  </span>
                </React.Fragment>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </>
      );
    };

    return (
      <div className="mb-4">
        <div className="text-xs opacity-60">{item.correctionText}</div>
        <div className="text-sm mt-1 opacity-100">{item.translationText}</div>
      </div>
    );
  },
);
ArchiveItemDisplay.displayName = "ArchiveItemDisplay";

const MemoizedArchivePage = React.memo(
  ({
    page,
    showTrace,
  }: {
    page: { page: number; data: ArchiveItem[] };
    showTrace: boolean;
  }) => {
    const { t } = useTranslation("transcription");
    return (
      <div className="border-l-2 border-[var(--border)] pl-4 py-1 animate-[ink-reveal_1s_ease_forwards]">
        <div className="text-[9px] text-[var(--sub-ink)] mb-4 tracking-widest uppercase">
          {t("page", { defaultValue: "PAGE" })}{" "}
          {page.page.toString().padStart(2, "0")}
        </div>
        {page.data.map((item, iIdx) => (
          <ArchiveItemDisplay
            key={item.id || iIdx}
            item={item}
            showTrace={showTrace}
          />
        ))}
      </div>
    );
  },
);

MemoizedArchivePage.displayName = "MemoizedArchivePage";

export const TranscriptionArchiveInk: React.FC<
  TranscriptionArchiveInkProps
> = ({ history, showTrace = false, onClose }) => {
  const { t } = useTranslation("transcription");

  return (
    <section
      id="archive-panel"
      className="h-full flex flex-col relative px-6 py-6"
    >
      <header className="mb-6 flex items-center space-x-2 opacity-40">
        {onClose && (
          <button
            className="text-xs text-[var(--sub-ink)] hover:text-[var(--ink)] transition-colors cursor-pointer opacity-60 hover:opacity-100 flex-shrink-0"
            onClick={onClose}
            title={t("close_archive", { defaultValue: "关闭卷宗" })}
            aria-label={t("close_archive", { defaultValue: "Close archive" })}
          >
            ✕
          </button>
        )}
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 bg-[var(--sub-ink)] rounded-full"></span>
          <h2 className="text-xs font-bold tracking-[0.4em] uppercase text-[var(--sub-ink)]">
            {t("archive", { defaultValue: "Archive / 卷宗" })}
          </h2>
        </div>
      </header>

      <div
        id="history-content"
        className="flex-1 overflow-y-auto no-scrollbar relative"
      >
        {history.length === 0 ? (
          <div id="archive-empty" className="empty-placeholder">
            <div className="w-12 h-12 border border-dashed border-[var(--sub-ink)] rounded-full flex items-center justify-center mb-4">
              <span className="text-xs text-[var(--sub-ink)]">
                {t("empty", { defaultValue: "空" })}
              </span>
            </div>
            <p className="text-[10px] tracking-widest text-[var(--sub-ink)]">
              {t("waiting_for_ink", { defaultValue: "待墨迹沉淀..." })}
            </p>
          </div>
        ) : (
          <div id="history-list" className="space-y-10 pb-10">
            {history.map((page, pIdx) => (
              <MemoizedArchivePage
                key={page.page}
                page={page}
                showTrace={showTrace}
              />
            ))}
          </div>
        )}
      </div>

      <footer className="mt-4 pt-4 border-t border-[var(--border)]">
        <div className="flex justify-between items-center text-[9px] text-[var(--sub-ink)] uppercase tracking-widest">
          <span id="session-id">
            {t("session_id", { defaultValue: "ID" })}: PREVIEW
          </span>
          <span>
            {t("pages", { defaultValue: "Pages" })}:{" "}
            <span id="total-pages">{history.length}</span>
          </span>
        </div>
      </footer>
    </section>
  );
};
