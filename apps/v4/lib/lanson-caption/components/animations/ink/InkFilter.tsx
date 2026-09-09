import React from 'react';

/**
 * InkFilter component provides the SVG filter definition (#ink-filter)
 * used for ink distortion effects. It should be rendered once at the root
 * of the relevant visual tree or page.
 */
export const InkFilter: React.FC = () => {
    return (
        <svg
            style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
            aria-hidden="true"
            className="sr-only"
        >
            <filter id="ink-filter" colorInterpolationFilters="sRGB">
                <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.03"
                    numOctaves={2}
                    result="noise"
                />
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} />
            </filter>
        </svg>
    );
};
