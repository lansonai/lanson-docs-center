import * as React from "react";

export const MOBILE_BREAKPOINT = 768;
/** Tailwind `lg` — legacy tablet band upper bound for medium-viewport helpers. */
export const DESKTOP_SPLIT_BREAKPOINT = 1024;
/** Tailwind `xl` — idle side video only when width and height both meet minimums. */
export const IDLE_SIDE_VIDEO_MIN_WIDTH = 1280;
export const IDLE_SIDE_VIDEO_MIN_HEIGHT = 680;

function findSimulatedViewportEl(): HTMLElement | null {
  const elements = document.querySelectorAll('[data-simulate-viewport="true"]');
  return elements[elements.length - 1] as HTMLElement | null;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useLayoutEffect(() => {
    const update = (width: number) => {
      setIsMobile(width < MOBILE_BREAKPOINT);
    };

    const container = findSimulatedViewportEl();

    if (container) {
      const syncFromContainer = () => {
        const w = container.getBoundingClientRect().width;
        if (w > 0) update(w);
      };

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          update(entry.contentRect.width);
        }
      });
      observer.observe(container);
      syncFromContainer();
      const raf = requestAnimationFrame(syncFromContainer);

      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
      };
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      update(window.innerWidth);
    };
    mql.addEventListener("change", onChange);
    update(window.innerWidth);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/** Tablet / medium desktop: 768px ≤ width < 1024px */
export function useIsMediumViewport() {
  const [isMedium, setIsMedium] = React.useState(false);

  React.useLayoutEffect(() => {
    const update = (width: number) => {
      setIsMedium(width >= MOBILE_BREAKPOINT && width < DESKTOP_SPLIT_BREAKPOINT);
    };

    const container = findSimulatedViewportEl();

    if (container) {
      const syncFromContainer = () => {
        const w = container.getBoundingClientRect().width;
        if (w > 0) update(w);
      };

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          update(entry.contentRect.width);
        }
      });
      observer.observe(container);
      syncFromContainer();
      const raf = requestAnimationFrame(syncFromContainer);

      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
      };
    }

    const onChange = () => update(window.innerWidth);
    const minMql = window.matchMedia(`(min-width: ${MOBILE_BREAKPOINT}px)`);
    const maxMql = window.matchMedia(`(max-width: ${DESKTOP_SPLIT_BREAKPOINT - 1}px)`);
    minMql.addEventListener("change", onChange);
    maxMql.addEventListener("change", onChange);
    onChange();

    return () => {
      minMql.removeEventListener("change", onChange);
      maxMql.removeEventListener("change", onChange);
    };
  }, []);

  return isMedium;
}

/** Wide + tall enough desktop: show always-visible right-column product preview. */
export function useIdleSideVideoVisible() {
  const [visible, setVisible] = React.useState(false);

  React.useLayoutEffect(() => {
    const update = (width: number, height: number) => {
      setVisible(
        width >= IDLE_SIDE_VIDEO_MIN_WIDTH && height >= IDLE_SIDE_VIDEO_MIN_HEIGHT,
      );
    };

    const container = findSimulatedViewportEl();

    if (container) {
      const syncFromContainer = () => {
        const rect = container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) update(rect.width, rect.height);
      };

      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          update(width, height);
        }
      });
      observer.observe(container);
      syncFromContainer();
      const raf = requestAnimationFrame(syncFromContainer);

      return () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
      };
    }

    const onChange = () => update(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", onChange);
    onChange();

    return () => window.removeEventListener("resize", onChange);
  }, []);

  return visible;
}
