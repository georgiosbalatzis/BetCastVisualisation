import { useEffect, useRef } from 'react';

const ARTICLE_ORIGINS = new Set(['https://f1stories.gr', 'https://www.f1stories.gr']);
const RESIZE_EVENT = 'betcast:resize';
const MEASURE_EVENT = 'betcast:measure';

function EmbedFrameBridge({ embedded, children }) {
  const contentRef = useRef(null);

  useEffect(() => {
    if (!embedded || window.parent === window || !contentRef.current) return undefined;
    const content = contentRef.current;
    let parentOrigin = null;
    let frame = 0;
    let lastHeight = 0;
    let active = true;
    let forceMeasurement = false;

    const measure = () => {
      frame = 0;
      const height = Math.ceil(content.getBoundingClientRect().height);
      const force = forceMeasurement;
      forceMeasurement = false;
      if (!Number.isFinite(height) || height <= 0 || (height === lastHeight && !force)) return;
      lastHeight = height;
      const message = { type: RESIZE_EVENT, height };
      window.parent.postMessage(message, parentOrigin || '*');
    };
    const schedule = (force = false) => {
      if (!active) return;
      forceMeasurement = forceMeasurement || force;
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const validMessage = (event) => event.source === window.parent && ARTICLE_ORIGINS.has(event.origin);
    const onMessage = (event) => {
      if (!validMessage(event)) return;
      const data = event.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) return;
      const keys = Object.keys(data);
      if (data.type !== MEASURE_EVENT || keys.length !== 1 || keys[0] !== 'type') return;
      parentOrigin = event.origin;
      schedule(true);
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('load', schedule);
    window.addEventListener('resize', schedule, { passive: true });
    window.addEventListener('orientationchange', schedule, { passive: true });
    document.fonts?.addEventListener?.('loadingdone', schedule);
    document.fonts?.ready?.then(schedule);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(content);
    schedule();

    return () => {
      active = false;
      window.removeEventListener('message', onMessage);
      window.removeEventListener('load', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('orientationchange', schedule);
      document.fonts?.removeEventListener?.('loadingdone', schedule);
      observer?.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [embedded]);

  return embedded ? <div ref={contentRef} className="embed-content-root">{children}</div> : children;
}

export default EmbedFrameBridge;
