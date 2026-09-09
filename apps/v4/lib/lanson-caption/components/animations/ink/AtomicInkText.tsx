import { cn } from '@/lib/utils';
import React from 'react';
import { AtomicInkChar, type InkAnimationStyle } from './AtomicInkChar';

export interface AtomicInkTextProps {
    text: string;
    style?: InkAnimationStyle;
    staggerDelay?: number;
    duration?: number;
    baseDelay?: number;
    className?: string;
    charClassName?: string;
    onComplete?: () => void;
}

/**
 * AtomicInkText splits a string into characters and animates them sequentially
 * using AtomicInkChar.
 */
export const AtomicInkText: React.FC<AtomicInkTextProps> = ({
    text,
    style = 'reveal',
    staggerDelay = 30,
    duration = 800,
    baseDelay = 0,
    className,
    charClassName,
    onComplete
}) => {
    const chars = Array.from(text);
    const tokens = text.match(/(\n|\s+|[^\s\n]+)/g) ?? [];
    const animatedCharCount = chars.filter((char) => char !== '\n').length;
    const totalDuration = baseDelay + (animatedCharCount * staggerDelay) + duration;

    React.useEffect(() => {
        if (onComplete) {
            const timer = setTimeout(onComplete, totalDuration);
            return () => clearTimeout(timer);
        }
    }, [text, totalDuration, onComplete]);

    let animatedIndex = 0;

    const renderAnimatedToken = (token: string, keyPrefix: string, keepTogether: boolean) => {
        const renderedChars = Array.from(token).map((char, index) => {
            const delay = baseDelay + animatedIndex * staggerDelay;
            animatedIndex += 1;

            return (
                <AtomicInkChar
                    key={`${keyPrefix}-${index}-${char}`}
                    char={char}
                    style={style}
                    delay={delay}
                    duration={duration}
                    className={charClassName}
                />
            );
        });

        if (keepTogether) {
            return (
                <span key={keyPrefix} className="inline-flex whitespace-nowrap">
                    {renderedChars}
                </span>
            );
        }

        return renderedChars;
    };

    return (
        <span className={cn("whitespace-pre-wrap", className)}>
            {tokens.map((token, tokenIndex) => {
                if (token === '\n') {
                    return <br key={`br-${tokenIndex}`} />;
                }

                if (/^\s+$/.test(token)) {
                    return (
                        <span key={`space-${tokenIndex}`} className="whitespace-pre">
                            {token}
                        </span>
                    );
                }

                const keepTogether = /[A-Za-z0-9]/.test(token);
                return renderAnimatedToken(token, `token-${tokenIndex}`, keepTogether);
            })}
        </span>
    );
};

AtomicInkText.displayName = 'AtomicInkText';
