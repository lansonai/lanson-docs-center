import React from 'react';
import { cn } from '@/lib/utils';

export interface TranslationTextProps {
    text: string;
    className?: string;
    staggerDelay?: number;
    allowWrap?: boolean;
}

/**
 * TranslationText - Simple fade-in animation for translation text
 * 
 * A lightweight component that displays translation text with a staggered
 * fade-in effect. Does not rely on complex filters or animations.
 */
export const TranslationText: React.FC<TranslationTextProps> = ({
    text,
    className,
    staggerDelay = 30,
    allowWrap = false,
}) => {
    const chars = text.split('');
    
    return (
        <span
            className={cn(
                allowWrap
                    ? "inline-flex max-w-full flex-wrap items-baseline whitespace-normal"
                    : "inline-block",
                className,
            )}
        >
            {chars.map((char, i) => (
                <span
                    key={`${i}-${char}`}
                    className="inline-block whitespace-pre"
                    style={{
                        animation: 'translationFadeIn 0.5s ease-out forwards',
                        animationDelay: `${i * staggerDelay}ms`,
                        opacity: 0,
                    }}
                >
                    {char}
                </span>
            ))}
            <style>{`
                @keyframes translationFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </span>
    );
};
