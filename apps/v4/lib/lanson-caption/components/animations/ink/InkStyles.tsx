import React from "react";

/**
 * InkStyles component centralizes the theme-aware CSS variables for the
 * "Ink" design system. It ensures consistency across different pages
 * and components like TextEffect and TranscriptionSlotInk.
 */
export const InkStyles: React.FC = () => {
  return (
    <style>{`
            :root {
                --ink-paper: #faf9f6;
                --ink-paper-tex: url("https://www.transparenttextures.com/patterns/cream-paper.png");
                --ink-color: #1a1a1a;
                --ink-sub: #78716c;
                --ink-accent: #8b2626;
                --ink-correct: #166534;
                --ink-border: rgba(26, 26, 26, 0.08);
                --ink-highlight: rgba(139, 38, 38, 0.05);
                --ink-grid: rgba(0, 0, 0, 0.05);
                --ink-error: #ff4d4f;
                --ink-link: #3b5998;
                
                --slot-h: 95px; 
                --font-main: 1.875rem; 
                --font-sub: 1rem;
            }

            .dark {
                --ink-paper: #0d1117;
                --ink-paper-tex: url("https://www.transparenttextures.com/patterns/black-linen.png");
                --ink-color: rgba(255, 255, 255, 0.95);
                --ink-sub: rgba(255, 255, 255, 0.5);
                --ink-accent: #58a6ff;
                --ink-correct: #3fb950;
                --ink-border: rgba(255, 255, 255, 0.1);
                --ink-highlight: rgba(56, 139, 253, 0.1);
                --ink-grid: rgba(255, 255, 255, 0.05);
                --ink-error: #f85149;
                --ink-link: #58a6ff;
            }

            [data-theme='mica'] {
                --ink-paper: #f6f8fa;
                --ink-paper-tex: url("https://www.transparenttextures.com/patterns/felt.png");
                --ink-color: #1f2328;
                --ink-sub: #656d76;
                --ink-accent: #0969da;
                --ink-correct: #1a7f37;
                --ink-border: #d0d7de;
                --ink-highlight: rgba(9, 105, 218, 0.05);
            }

            [data-theme='ebony'] {
                --ink-paper: #0d1117;
                --ink-paper-tex: url("https://www.transparenttextures.com/patterns/black-linen.png");
                --ink-color: rgba(255, 255, 255, 0.95);
                --ink-sub: rgba(255, 255, 255, 0.5);
                --ink-accent: #58a6ff;
                --ink-correct: #3fb950;
                --ink-border: rgba(255, 255, 255, 0.1);
                --ink-highlight: rgba(56, 139, 253, 0.1);
            }

            .lab-textured {
                background-color: var(--ink-paper);
                background-image: var(--ink-paper-tex);
                transition: background 0.6s ease, color 0.6s ease;
            }

            .ink-en-text {
                color: var(--ink-color) !important;
                font-family: "Noto Serif SC", serif;
            }
            .ink-cn-text {
                color: var(--ink-sub) !important;
                font-family: "Noto Serif SC", serif;
            }

            .slot { 
                border-bottom: 1px dashed var(--ink-border);
                opacity: 0.8;
                transition: all 0.4s ease;
            }
            .slot -text { color: var(--ink-color) !important; transition: color 0.4s ease; }
            .slot .sub-ink-text { color: var(--ink-sub); }
            
            /* Utilities for Streaming Variant */
            .ink-char { 
                display: inline-block; 
                opacity: 0; 
                filter: blur(4px) url(#ink-filter); 
                animation: ink-reveal 0.8s cubic-bezier(.25,.46,.45,.94) forwards; 
                vertical-align: baseline; 
                will-change: opacity, filter, transform; 
            }
            .ink-char-rise { 
                display: inline-block; 
                opacity: 0; 
                transform: translateY(10px); 
                filter: blur(8px) url(#ink-filter); 
                animation: ink-rise 1.2s cubic-bezier(.2,0,.2,1) forwards; 
                vertical-align: baseline; 
                will-change: opacity, filter, transform; 
            }

            @keyframes ink-reveal {
                0% { opacity: 0; filter: blur(8px); transform: translateY(2px); }
                100% { opacity: 1; filter: blur(0); transform: translateY(0); }
            }

            @keyframes ink-rise {
                0% { opacity: 0; transform: translateY(12px); filter: blur(12px); }
                100% { opacity: 1; transform: translateY(0); filter: blur(0); }
            }
        `}</style>
  );
};
