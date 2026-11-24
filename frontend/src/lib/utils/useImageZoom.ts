import { useEffect, useLayoutEffect, useRef, useState } from 'react';

const zoomSteps = [1, 1.5, 2, 3, 4];
const zoomOutSteps = [...zoomSteps].reverse();
export const MAX_IMAGE_ZOOM = zoomSteps[zoomSteps.length - 1];

type ZoomAnchor = { x: number; y: number; widthRatio: number; heightRatio: number };

function touchDistance(touches: TouchList): number {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

export function useImageZoom(enabled: boolean) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const currentZoom = useRef(1);
  const anchor = useRef<ZoomAnchor | null>(null);

  useLayoutEffect(() => {
    currentZoom.current = zoom;
    if (!viewport || !enabled) return;
    const point = anchor.current;
    anchor.current = null;
    viewport.scrollLeft = point ? point.widthRatio * viewport.scrollWidth - point.x
      : (viewport.scrollWidth - viewport.clientWidth) / 2;
    viewport.scrollTop = point ? point.heightRatio * viewport.scrollHeight - point.y
      : (viewport.scrollHeight - viewport.clientHeight) / 2;
  }, [viewport, enabled, zoom]);

  useEffect(() => {
    if (!viewport || !enabled) return;
    let pinch: { distance: number; zoom: number; point: ZoomAnchor } | undefined;
    const cancelPageGesture = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) {
        pinch = undefined;
        return;
      }
      cancelPageGesture(event);
      const bounds = viewport.getBoundingClientRect();
      const x = (event.touches[0].clientX + event.touches[1].clientX) / 2 - bounds.left;
      const y = (event.touches[0].clientY + event.touches[1].clientY) / 2 - bounds.top;
      pinch = {
        zoom: currentZoom.current,
        distance: Math.max(1, touchDistance(event.touches)),
        point: { x, y, widthRatio: (viewport.scrollLeft + x) / Math.max(1, viewport.scrollWidth),
          heightRatio: (viewport.scrollTop + y) / Math.max(1, viewport.scrollHeight) },
      };
    };
    const onMove = (event: TouchEvent) => {
      if (!pinch || event.touches.length !== 2) return;
      cancelPageGesture(event);
      const next = Math.round(Math.min(MAX_IMAGE_ZOOM, Math.max(1,
        pinch.zoom * touchDistance(event.touches) / pinch.distance)) * 100) / 100;
      if (next !== currentZoom.current) {
        anchor.current = pinch.point;
        setZoom(next);
      }
    };
    const onEnd = () => { pinch = undefined; };
    const listeners = { passive: false };
    viewport.addEventListener('touchstart', onStart, listeners);
    viewport.addEventListener('touchmove', onMove, listeners);
    viewport.addEventListener('touchend', onEnd);
    viewport.addEventListener('touchcancel', onEnd);
    viewport.addEventListener('gesturestart', cancelPageGesture, listeners);
    viewport.addEventListener('gesturechange', cancelPageGesture, listeners);
    return () => {
      viewport.removeEventListener('touchstart', onStart);
      viewport.removeEventListener('touchmove', onMove);
      viewport.removeEventListener('touchend', onEnd);
      viewport.removeEventListener('touchcancel', onEnd);
      viewport.removeEventListener('gesturestart', cancelPageGesture);
      viewport.removeEventListener('gesturechange', cancelPageGesture);
      anchor.current = null;
    };
  }, [enabled, viewport]);

  const resetZoom = () => {
    anchor.current = null;
    setZoom(1);
  };
  const changeZoom = (direction: 1 | -1) => {
    if (!enabled) return;
    anchor.current = null;
    setZoom(value => direction > 0 ? zoomSteps.find(step => step > value) ?? MAX_IMAGE_ZOOM
      : zoomOutSteps.find(step => step < value) ?? 1);
  };

  return { viewport, setViewport, zoom, zoomPercent: Math.round(zoom * 100), resetZoom, changeZoom };
}
