import { Suspense, lazy, useCallback, useRef, useState } from 'react';
import type { EcosystemLayer } from '../../content/ecosystem';
import { isCaptureMode, useActive, useRenderTier } from './capability';

const EcosystemScene = lazy(() => import('./EcosystemScene'));

interface Props {
  layers: EcosystemLayer[];
  poster: string;
}

/**
 * Interactive ecosystem explorer. The tab list and descriptions are plain,
 * accessible HTML that works with or without WebGL; the 3D stack mirrors the
 * selection and can also be clicked directly.
 */
export default function EcosystemViz({ layers, poster }: Props) {
  const [selected, setSelected] = useState(0);
  const [live, setLive] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const tier = useRenderTier();
  const active = useActive(stage);
  const frozen = isCaptureMode();
  const onReady = useCallback(() => setLive(true), []);
  const use3D = tier === 'full' || tier === 'lite';

  // Displayed top-to-bottom to match the physical stack (AI on top).
  const order = [2, 1, 0];

  const onKeyDown = (e: React.KeyboardEvent) => {
    const pos = order.indexOf(selected);
    let next = pos;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (pos + 1) % order.length;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (pos - 1 + order.length) % order.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = order.length - 1;
    else return;
    e.preventDefault();
    setSelected(order[next]);
    tabs.current[order[next]]?.focus();
  };

  const layer = layers[selected];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-6">
      <div className="lg:col-span-7">
        <div
          ref={stage}
          data-ecosystem-stage
          className="relative mx-auto aspect-square w-full max-w-[40rem] overflow-hidden rounded-[var(--radius-panel)] bg-ice-soft"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(var(--color-silver) 1px, transparent 1px), linear-gradient(90deg, var(--color-silver) 1px, transparent 1px)',
              backgroundSize: '3rem 3rem',
              maskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 78%)',
              WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 30%, transparent 78%)',
            }}
          />
          <img
            src={poster}
            alt="Isometric model of three stacked layers: software at the base, data in the middle and AI on top, joined by vertical signal channels."
            width={1200}
            height={1200}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700"
            style={{ opacity: live ? 0 : 1 }}
          />
          {use3D && (
            <div className="absolute inset-0 transition-opacity duration-700" style={{ opacity: live ? 1 : 0 }}>
              <Suspense fallback={null}>
                <EcosystemScene
                  selected={selected}
                  onSelect={setSelected}
                  lite={tier === 'lite'}
                  frozen={frozen}
                  active={active}
                  onReady={onReady}
                />
              </Suspense>
            </div>
          )}
          <p className="eyebrow pointer-events-none absolute left-5 top-5 text-navy/70">Fig. 02 — The connected stack</p>
          {use3D && live && (
            <p className="eyebrow pointer-events-none absolute bottom-5 left-5 hidden text-navy/60 sm:block">
              Select a layer
            </p>
          )}
        </div>
      </div>

      <div className="lg:col-span-5">
        <div role="tablist" aria-label="Technology layers" aria-orientation="vertical" onKeyDown={onKeyDown} className="border-t border-navy/15">
          {order.map((i) => {
            const item = layers[i];
            const isSelected = i === selected;
            return (
              <button
                key={item.id}
                ref={(el) => void (tabs.current[i] = el)}
                type="button"
                role="tab"
                id={`eco-tab-${item.id}`}
                aria-selected={isSelected}
                aria-controls="eco-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => setSelected(i)}
                className={`group flex min-h-[4.5rem] w-full items-center gap-5 border-b border-navy/15 py-4 text-left transition-colors ${
                  isSelected ? 'text-navy' : 'text-ink-soft hover:text-navy'
                }`}
              >
                <span className="eyebrow w-7 flex-none">{item.index}</span>
                <span className="flex-1">
                  <span className="block font-display text-[1.75rem] font-semibold leading-none tracking-[-0.03em] sm:text-[2.125rem]">
                    {item.name}
                  </span>
                  <span className="mt-1.5 block text-sm">{item.division}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 flex-none rounded-full border transition-colors ${
                    isSelected ? 'border-navy bg-lime' : 'border-navy/30 bg-transparent'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div id="eco-panel" role="tabpanel" aria-labelledby={`eco-tab-${layer.id}`} tabIndex={0} className="mt-7 min-h-[15rem]">
          <h3 className="t-d3 text-navy">{layer.title}</h3>
          <p className="mt-4 max-w-md text-[1.0625rem] leading-relaxed text-ink-soft">{layer.text}</p>
          <p className="mt-5 flex items-start gap-3 text-sm font-medium text-navy">
            <span aria-hidden="true" className="mt-[0.55rem] h-px w-6 flex-none bg-navy" />
            {layer.flow}
          </p>
          <a href={layer.href} className="link mt-6 inline-block font-medium text-navy">
            Explore {layer.division}
          </a>
        </div>
      </div>
    </div>
  );
}
