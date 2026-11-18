import { Suspense, lazy, useCallback, useEffect, useRef } from 'react';
import { isCaptureMode, useActive, useRenderTier } from './capability';

const HeroScene = lazy(() => import('./HeroScene'));

/**
 * Hero island. The pre-rendered poster (in the Astro markup) is the loading
 * state, the no-WebGL fallback and the reduced-motion version. When WebGL is
 * available the live scene fades in on top of it, starting in the same pose.
 */
export default function HeroSculpture() {
  const host = useRef<HTMLDivElement>(null);
  const tier = useRenderTier();
  const active = useActive(host);
  const activeRef = useRef(-1);
  const pointerRef = useRef({ x: 0, y: 0 });
  const frozen = isCaptureMode();

  // Pointer parallax (fine pointers only) and legend highlighting.
  useEffect(() => {
    if (tier !== 'full' || frozen) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [tier, frozen]);

  useEffect(() => {
    if (tier === 'pending' || tier === 'static') return;
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-discipline]'));
    const cleanups = items.map((el) => {
      const index = Number(el.dataset.discipline);
      const on = () => (activeRef.current = index);
      const off = () => (activeRef.current = -1);
      el.addEventListener('pointerenter', on);
      el.addEventListener('pointerleave', off);
      el.addEventListener('focus', on);
      el.addEventListener('blur', off);
      return () => {
        el.removeEventListener('pointerenter', on);
        el.removeEventListener('pointerleave', off);
        el.removeEventListener('focus', on);
        el.removeEventListener('blur', off);
      };
    });
    return () => cleanups.forEach((fn) => fn());
  }, [tier]);

  const onReady = useCallback(() => {
    host.current?.closest('[data-sculpture]')?.setAttribute('data-live', 'true');
  }, []);

  return (
    <div ref={host} className="absolute inset-0" data-tier={tier}>
      {(tier === 'full' || tier === 'lite') && (
        <Suspense fallback={null}>
          <HeroScene
            lite={tier === 'lite'}
            frozen={frozen}
            active={active}
            activeRef={activeRef}
            pointerRef={pointerRef}
            onReady={onReady}
          />
        </Suspense>
      )}
    </div>
  );
}
