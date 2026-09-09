import React from 'react';
import { cn } from '@/lib/utils';
import { Mic, Pause, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { DetailMode } from '@/components/transcription/types';

export interface TranscriptionFooterInkProps {
    isRecording: boolean;
    onToggleRecord: () => void;
    durationMs?: number;
    latencyMs?: number;
    detailMode?: DetailMode;
}

/**
 * A small utility to animate numbers smoothly
 */
const SmoothNumber = ({ value, unit = '' }: { value: number; unit?: string }) => {
    const [displayValue, setDisplayValue] = React.useState(value);

    React.useEffect(() => {
        const startValue = displayValue;
        const startTime = Date.now();
        const duration = 800; // ms

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Simple easeOutQuad
            const easedProgress = progress * (2 - progress);
            const nextValue = Math.round(startValue + (value - startValue) * easedProgress);

            setDisplayValue(nextValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <span>{displayValue}{unit}</span>;
};

export const TranscriptionFooterInk: React.FC<TranscriptionFooterInkProps> = ({
    isRecording,
    onToggleRecord,
    durationMs = 0,
    latencyMs = 0,
    detailMode = 'simple',
}) => {
    const { t } = useTranslation(['transcription']);
    const formatDuration = (ms: number) => {
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    };
    return (
        <footer className="flex items-center justify-center py-1.5 px-6 rounded-t-3xl bg-[var(--paper)] backdrop-blur-xl border-x border-t border-[var(--border)] transition-all duration-300">
            <div className="flex items-center gap-6">
                <button
                    onClick={onToggleRecord}
                    className={cn(
                        "relative flex items-center gap-4 group transition-all duration-500",
                        isRecording ? "recording" : ""
                    )}
                >
                    {/* Button Hexagon/Circle Container */}
                    <div className="relative">
                        <motion.div
                            className={cn(
                                "relative w-11 h-11 rounded-full border flex items-center justify-center transition-all duration-700 ease-out",
                                isRecording
                                    ? "border-[var(--accent)] bg-[var(--accent)]/5 shadow-[0_0_20px_rgba(var(--accent-rgb),0.15)]"
                                    : "border-[var(--ink)]/30 bg-transparent group-hover:border-[var(--ink)]/60"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <AnimatePresence mode="wait">
                                {isRecording ? (
                                    <motion.div
                                        key="pause"
                                        initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Pause className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]/20" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="mic"
                                        initial={{ opacity: 0, scale: 0.5 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.5 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <Mic className="w-4 h-4 text-[var(--ink)]" />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Internal breathing ring when recording */}
                            {/* {isRecording && (
                                <motion.div
                                    className="absolute inset-0 rounded-full border border-[var(--accent)]/30"
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                />
                            )} */}
                        </motion.div>

                        {/* Pulsing indicator dot */}
                        {/* {isRecording && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent)]"></span>
                            </span>
                        )} */}
                    </div>

                    <div className="flex flex-col items-start gap-1">
                        <span className={cn(
                            "text-[11px] tracking-[0.18em] uppercase transition-all duration-500",
                            isRecording ? "text-[var(--accent)] font-bold mb-0.5" : "text-[var(--ink)]/75 font-medium"
                        )}>
                            {isRecording ? t('transcribing_live', { defaultValue: 'Lanson Live' }) : t('start', { defaultValue: 'Start Transcription' })}
                        </span>
                        <div className="flex items-center gap-3">


                        </div>
                        <div className="flex items-center gap-2 sm:gap-2.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 rounded-md  px-2 py-0.5 text-[11px] font-semibold text-[var(--ink)]/85">
                                <span className="font-mono tabular-nums">{formatDuration(durationMs)}</span>
                            </span>
                            {/* <span className="inline-flex items-center gap-1.5 rounded-md  px-2 py-0.5 text-[11px] font-medium text-[var(--ink)]/75">
                                <span className="font-mono tabular-nums"><SmoothNumber value={latencyMs} unit="ms" /></span>
                            </span> */}

                            {detailMode === 'detailed' && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent)]/25 bg-[var(--accent)]/8 px-2 py-0.5 text-[10px] text-[var(--accent)]/90">
                                    E2E <span className="font-mono tabular-nums"><SmoothNumber value={Math.round(latencyMs * 1.5)} unit="ms" /></span>
                                </span>
                            )}
                        </div>
                    </div>
                </button>
            </div>

            <div className="flex flex-col items-end gap-1.5 py-1 min-w-0 max-w-[58%] sm:max-w-none">
            </div>
        </footer>
    );
};
