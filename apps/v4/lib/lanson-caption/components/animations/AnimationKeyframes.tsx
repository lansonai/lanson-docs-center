import React from 'react';

/**
 * AnimationKeyframes component injects all required CSS keyframes for
 * atomic animations (Ink and Logo effects).
 * Render this once in your app or lab page.
 */
export const AnimationKeyframes: React.FC = () => {
    return (
        <style
            dangerouslySetInnerHTML={{
                __html: `
          /* --- Ink Animations --- */
          @keyframes ink-reveal {
            0% { opacity: 0; filter: blur(6px) url(#ink-filter); transform: scale(0.96); }
            100% { opacity: 1; filter: blur(0px); transform: scale(1); }
          }

          @keyframes ink-rise {
            0% { opacity: 0; transform: translateY(12px); filter: blur(8px) url(#ink-filter); }
            100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
          }

          @keyframes ink-flow {
            0% { background-position: 100% 0; }
            100% { background-position: -100% 0; }
          }

          /* --- Logo Animations --- */
          @keyframes logo-effect-flow {
            0% { transform: translate(-100%, -100%) rotate(45deg); }
            100% { transform: translate(100%, 100%) rotate(45deg); }
          }
          @keyframes logo-effect-wave {
            0% { transform: translate(-50%, -96%) rotate(0deg); }
            100% { transform: translate(-50%, -96%) rotate(360deg); }
          }
          @keyframes logo-effect-neon-flow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes logo-effect-pulse-scale {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          
          /* Utility classes for animations */
          .animate-ink-reveal {
            animation: ink-reveal 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .animate-ink-rise {
            animation: ink-rise 1.2s cubic-bezier(0.2, 0, 0.2, 1) forwards;
          }
          .animate-logo-pulse {
            animation: logo-effect-pulse-scale 2s infinite ease-in-out;
          }
        `,
            }}
        />
    );
};
