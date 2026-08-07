import { useEffect } from "react";

/**
 * Scroll-driven reveal for [data-reveal] elements.
 *
 * Uses scroll/resize listeners + a slow interval safety net instead of
 * IntersectionObserver on purpose: IO callbacks proved unreliable for
 * below-the-fold elements in some embedded/background browser contexts,
 * while getBoundingClientRect checks always reflect reality.
 */
export function useReveal() {
  useEffect(() => {
    const check = () => {
      for (const el of Array.from(
        document.querySelectorAll("[data-reveal]:not(.revealed)"),
      )) {
        const r = el.getBoundingClientRect();
        // Reveal anything at/above the 92% viewport line. Elements already
        // scrolled past (bottom < 0) are also revealed so content can never
        // get stuck invisible behind a missed scroll event.
        if (r.top < window.innerHeight * 0.92) {
          el.classList.add("revealed");
        }
      }
    };
    check();
    const onScroll = () => check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Safety net: reveal anything in view even if scroll/resize never fires.
    const net = window.setInterval(check, 1200);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearInterval(net);
    };
  }, []);
}

/** Inline style helper for entrance-animation stagger. */
export const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

/** Inline style helper for scroll-reveal stagger. */
export const revealDelay = (ms: number) =>
  ({ "--reveal-delay": `${ms}ms` }) as React.CSSProperties;
