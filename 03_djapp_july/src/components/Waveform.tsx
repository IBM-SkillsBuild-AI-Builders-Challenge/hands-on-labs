// Waveform — canvas waveform with playhead, click-to-seek, and scroll-to-zoom.
//
// Performance matters here: the playhead moves ~20x/sec, so redrawing the full
// thousands-of-segments waveform every tick would jank the main thread (and, paired
// with the audio worklet's event stream, can spiral into a crash). Instead we render
// the peaks ONCE to an offscreen bitmap, normalized to fill the height, and each frame
// just blit the visible slice of that bitmap and stroke one playhead line.
//
// Zoom: the mouse wheel shrinks/grows the visible fraction of the track; when zoomed
// in, the view follows the playhead (centered, clamped at the ends) — like the
// desktop app's scrolling waveform.
//
// P4 — markers: after blitting the waveform and drawing the playhead, the draw callback
// overlays cue / loop-in / loop-out lines and a loop-region fill. Each marker is drawn
// only when its position is within the visible window. The coordinate transform is the
// same as the playhead: markerX = ((norm * total - start) / win) * cssW.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackPeaks } from '../track';

interface Props {
  peaks: TrackPeaks | null;
  position: number; // normalized 0..1
  onSeek: (norm: number) => void;
  // P4 — marker props (all optional; absent / default values = not drawn)
  cueNorm?: number;    // cue point position; drawn when > 0
  loopIn?: number;     // loop-in position
  loopOut?: number;    // loop-out position
  loopActive?: boolean; // when true, draws the shaded region between loopIn and loopOut
}

// Draw a vertical marker line with a short text label at the top of the canvas.
function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  cssH: number,
  colour: string,
  label: string,
) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, cssH);
  ctx.stroke();

  ctx.fillStyle = colour;
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.fillText(label, x + 3, 10);
}

const CACHE_HEIGHT = 256; // offscreen bitmap height; scaled to the canvas at blit time
const MIN_WINDOW = 0.02; // closest zoom: 2% of the track visible

export default function Waveform({ peaks, position, onSeek, cueNorm = 0, loopIn = 0, loopOut = 1, loopActive = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cacheRef = useRef<HTMLCanvasElement | null>(null);
  const [windowFrac, setWindowFrac] = useState(1); // fraction of track visible (1 = all)

  // Reset to the full-track view whenever a new track loads.
  useEffect(() => {
    setWindowFrac(1);
  }, [peaks]);

  // Render the peaks to an offscreen bitmap, normalized so the loudest peak fills the
  // height. Rebuilt only when the peaks change — not per frame.
  useEffect(() => {
    if (!peaks) {
      cacheRef.current = null;
      return;
    }
    const w = peaks.buckets;
    let off = cacheRef.current;
    if (!off) {
      off = document.createElement('canvas');
      cacheRef.current = off;
    }
    off.width = w;
    off.height = CACHE_HEIGHT;
    const c = off.getContext('2d');
    if (!c) return;

    let peak = 0;
    for (let i = 0; i < w; i++) {
      const m = Math.max(Math.abs(peaks.min[i]), Math.abs(peaks.max[i]));
      if (m > peak) peak = m;
    }
    const norm = peak > 0 ? 1 / peak : 1;
    const mid = CACHE_HEIGHT / 2;

    c.clearRect(0, 0, w, CACHE_HEIGHT);
    c.strokeStyle = '#4cc2ff';
    c.beginPath();
    for (let x = 0; x < w; x++) {
      c.moveTo(x + 0.5, mid - peaks.min[x] * norm * mid);
      c.lineTo(x + 0.5, mid - peaks.max[x] * norm * mid);
    }
    c.stroke();
  }, [peaks]);

  // The visible bucket window, centered on the playhead and clamped to the track.
  const windowFor = useCallback(
    (totalBuckets: number) => {
      const win = Math.max(1, Math.round(totalBuckets * windowFrac));
      const center = position * totalBuckets;
      const start = Math.max(0, Math.min(totalBuckets - win, center - win / 2));
      return { start, win };
    },
    [position, windowFrac],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW === 0 || cssH === 0) return;

    const bw = Math.round(cssW * dpr);
    const bh = Math.round(cssH * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const cache = cacheRef.current;
    if (!cache) {
      ctx.strokeStyle = '#2b303d';
      ctx.beginPath();
      ctx.moveTo(0, cssH / 2);
      ctx.lineTo(cssW, cssH / 2);
      ctx.stroke();
      return;
    }

    const total = cache.width;
    const { start, win } = windowFor(total);

    // Blit just the visible slice, scaled to the canvas.
    ctx.drawImage(cache, start, 0, win, cache.height, 0, 0, cssW, cssH);

    // Playhead at its true position within the visible window.
    const playX = ((position * total - start) / win) * cssW;
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, cssH);
    ctx.stroke();

    // --- P4 markers ---
    // Helper: convert a normalized track position to a canvas X pixel.
    // Returns null when the marker is outside the current visible window.
    const markerX = (norm: number): number | null => {
      const x = ((norm * total - start) / win) * cssW;
      return x >= 0 && x <= cssW ? x : null;
    };

    // Loop region fill — drawn first so lines render on top of it.
    if (loopActive) {
      const inX  = ((loopIn  * total - start) / win) * cssW;
      const outX = ((loopOut * total - start) / win) * cssW;
      // Clamp to canvas bounds so a partially-visible region still fills correctly.
      const fillLeft  = Math.max(0, inX);
      const fillRight = Math.min(cssW, outX);
      if (fillRight > fillLeft) {
        ctx.fillStyle = 'rgba(76, 194, 255, 0.12)';
        ctx.fillRect(fillLeft, 0, fillRight - fillLeft, cssH);
      }
    }

    // Loop-in line — yellow-green
    const inX = markerX(loopIn);
    if (inX !== null) drawMarker(ctx, inX, cssH, '#a8e063', 'IN');

    // Loop-out line — orange
    const outX = markerX(loopOut);
    if (outX !== null) drawMarker(ctx, outX, cssH, '#ff8c42', 'OUT');

    // Cue line — green (only when a cue has been set)
    if (cueNorm > 0) {
      const cueX = markerX(cueNorm);
      if (cueX !== null) drawMarker(ctx, cueX, cssH, '#4caf50', 'CUE');
    }
  }, [position, windowFor, cueNorm, loopIn, loopOut, loopActive]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  // Wheel zoom — attached natively so we can preventDefault (React's onWheel is passive).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
      setWindowFrac((f) => Math.max(MIN_WINDOW, Math.min(1, f * factor)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cache = cacheRef.current;
    if (!cache) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    const total = cache.width;
    const { start, win } = windowFor(total);
    onSeek((start + frac * win) / total);
  };

  return <canvas ref={canvasRef} className="waveform" onClick={handleClick} />;
}
