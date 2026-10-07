import { useEffect, type RefObject } from 'react';

const EDGE_PADDING = 8;

export const useFcPopoverClamp = (containerRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const clamp = () => {
      const popover = container.querySelector<HTMLElement>('.fc-popover');
      if (!popover) return;
      const bounds = container.getBoundingClientRect();
      const rect = popover.getBoundingClientRect();

      const overflowRight = rect.right - (bounds.right - EDGE_PADDING);
      const roomLeft = rect.left - (bounds.left + EDGE_PADDING);
      const shiftX = overflowRight > 0 ? Math.min(overflowRight, Math.max(roomLeft, 0)) : 0;

      const overflowBottom = rect.bottom - (bounds.bottom - EDGE_PADDING);
      const roomTop = rect.top - (bounds.top + EDGE_PADDING);
      const shiftY = overflowBottom > 0 ? Math.min(overflowBottom, Math.max(roomTop, 0)) : 0;

      if (shiftX > 0) popover.style.left = `${parseFloat(popover.style.left || '0') - shiftX}px`;
      if (shiftY > 0) popover.style.top = `${parseFloat(popover.style.top || '0') - shiftY}px`;
    };

    // Clamping is idempotent (a second pass finds no overflow), so reacting to our own style writes is safe.
    const observer = new MutationObserver(clamp);
    observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [containerRef]);
};
