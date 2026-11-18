import { useEffect, useState, type RefObject } from 'react';

export type RenderTier = 'pending' | 'static' | 'lite' | 'full';

/** True when the URL asks for a deterministic frame (used by scripts/capture-posters.mjs). */
export const isCaptureMode = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('capture');

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/**
 * Decide how much 3D a device should get:
 *  - static: reduced motion, data saver, no WebGL → the pre-rendered poster stays
 *  - lite:   phones / low-memory devices → live scene, cheaper materials and DPR
 *  - full:   everything else
 */
export function detectTier(): RenderTier {
  if (isCaptureMode()) return 'full';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  if (nav.connection?.saveData) return 'static';
  if (!hasWebGL()) return 'static';
  const lowMemory = typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2;
  if (lowMemory) return 'static';
  const small = window.matchMedia('(max-width: 767px)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  return small || coarse ? 'lite' : 'full';
}

export function useRenderTier(): RenderTier {
  const [tier, setTier] = useState<RenderTier>('pending');
  useEffect(() => setTier(detectTier()), []);
  return tier;
}

/** Pause rendering when the canvas is off screen or the tab is hidden. */
export function useActive(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' });
    io.observe(el);
    const onVis = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ref]);
  return inView && visible;
}
