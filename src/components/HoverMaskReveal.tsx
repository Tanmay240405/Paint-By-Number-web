import React, { useRef, useEffect, useCallback } from 'react';
import './HoverMaskReveal.css';

interface HoverMaskRevealProps {
  baseImage: string;      // The default visible image (pbn-template)
  revealImage: string;    // The image revealed on hover (pbn-original)
  blobRadius?: number;    // Size of the reveal blob (0.1 - 1.0)
  fadeSpeed?: number;     // How fast the blob fades (seconds)
}

const HoverMaskReveal: React.FC<HoverMaskRevealProps> = ({
  baseImage,
  revealImage,
  blobRadius = 0.35,
  fadeSpeed = 2.5,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const isHoveringRef = useRef(false);
  const timeRef = useRef(0);

  // Simple hash for noise
  const hash = useCallback((x: number, y: number) => {
    return ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453123) % 1 + 1) % 1;
  }, []);

  // 2D value noise
  const noise2D = useCallback((px: number, py: number) => {
    const ix = Math.floor(px);
    const iy = Math.floor(py);
    const fx = px - ix;
    const fy = py - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }, [hash]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create off-screen canvases (allocated once)
    const maskCanvas = document.createElement('canvas');
    const maskCtx = maskCanvas.getContext('2d')!;

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d')!;

    // Load images
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    baseImg.src = baseImage;

    const revealImg = new Image();
    revealImg.crossOrigin = 'anonymous';
    revealImg.src = revealImage;

    let loadedCount = 0;
    let running = true;

    const onLoad = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        resize();
        lastTime = performance.now();
        animFrameRef.current = requestAnimationFrame(animate);
      }
    };

    baseImg.addEventListener('load', onLoad);
    revealImg.addEventListener('load', onLoad);

    // Resize handler
    let w = 0, h = 0, mw = 0, mh = 0, dpr = 1;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio, 2);
      w = rect.width;
      h = rect.height;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Mask at half-res for performance
      mw = Math.ceil(w / 2);
      mh = Math.ceil(h / 2);
      maskCanvas.width = mw;
      maskCanvas.height = mh;

      // Temp canvas at full DPR res
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
    };

    // Mouse / Touch handlers
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      isHoveringRef.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = container.getBoundingClientRect();
        mouseRef.current.x = e.touches[0].clientX - rect.left;
        mouseRef.current.y = e.touches[0].clientY - rect.top;
        isHoveringRef.current = true;
      }
    };

    const onMouseLeave = () => {
      isHoveringRef.current = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('touchmove', onTouchMove);
    container.addEventListener('mouseleave', onMouseLeave);
    container.addEventListener('touchend', onMouseLeave);

    let lastTime = 0;

    const animate = (now: number) => {
      if (!running) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      timeRef.current += dt;

      if (w === 0 || h === 0) {
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      // --- 1. Fade existing mask ---
      const fadeAmount = dt / fadeSpeed;
      maskCtx.save();
      maskCtx.globalCompositeOperation = 'destination-out';
      maskCtx.fillStyle = `rgba(0,0,0,${fadeAmount})`;
      maskCtx.fillRect(0, 0, mw, mh);
      maskCtx.restore();

      // --- 2. Paint organic blob at cursor ---
      if (isHoveringRef.current && mouseRef.current.x > -100) {
        const mx = (mouseRef.current.x / w) * mw;
        const my = (mouseRef.current.y / h) * mh;
        const time = timeRef.current;
        const baseRadius = blobRadius * Math.min(mw, mh);

        maskCtx.save();
        maskCtx.beginPath();

        const steps = 64;
        for (let i = 0; i <= steps; i++) {
          const angle = (i / steps) * Math.PI * 2;
          const n1 = noise2D(angle * 3 + time * 0.5, baseRadius * 0.05);
          const n2 = noise2D(angle * 5 - time * 0.3, baseRadius * 0.03 + time);
          const variation = 0.7 + n1 * 0.5 + n2 * 0.3;
          const r = baseRadius * variation;

          const px = mx + Math.cos(angle) * r;
          const py = my + Math.sin(angle) * r;

          if (i === 0) maskCtx.moveTo(px, py);
          else maskCtx.lineTo(px, py);
        }
        maskCtx.closePath();

        // Soft radial gradient fill
        const grad = maskCtx.createRadialGradient(mx, my, 0, mx, my, baseRadius * 1.3);
        grad.addColorStop(0, 'rgba(255,255,255,0.3)');
        grad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
        grad.addColorStop(0.85, 'rgba(255,255,255,0.05)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        maskCtx.globalCompositeOperation = 'lighter';
        maskCtx.fillStyle = grad;
        maskCtx.fill();
        maskCtx.restore();
      }

      // --- 3. Composite: base + masked reveal ---
      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Draw base image (template)
      drawImageCover(ctx, baseImg, w, h);

      // Draw reveal image into temp canvas, then mask it
      tempCtx.save();
      tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      tempCtx.clearRect(0, 0, w, h);
      drawImageCover(tempCtx, revealImg, w, h);

      // Apply mask: only show reveal where mask is white
      tempCtx.globalCompositeOperation = 'destination-in';
      tempCtx.drawImage(maskCanvas, 0, 0, mw, mh, 0, 0, w, h);
      tempCtx.restore();

      // Composite masked reveal on top of base
      ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, w, h);
      ctx.restore();

      animFrameRef.current = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (loadedCount >= 2) resize();
    });
    resizeObserver.observe(container);

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('mouseleave', onMouseLeave);
      container.removeEventListener('touchend', onMouseLeave);
      resizeObserver.disconnect();
    };
  }, [baseImage, revealImage, blobRadius, fadeSpeed, noise2D]);

  return (
    <div ref={containerRef} className="hover-mask-container" id="hover-mask-reveal">
      <canvas ref={canvasRef} className="hover-mask-canvas" />
      <div className="hover-mask-hint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>Hover to reveal original</span>
      </div>
    </div>
  );
};

/** Draws an image with CSS "object-fit: cover" behaviour */
function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;

  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export default HoverMaskReveal;
