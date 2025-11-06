import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, Sparkles, Layers } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export const PFPGenerator = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  type FrozenOverlay = { src: string; scale: number; offset: { x: number; y: number }; rotation: number };
  const [frozenOverlays, setFrozenOverlays] = useState<FrozenOverlay[]>([]);
  const [saturation, setSaturation] = useState([100]);
  const [noise, setNoise] = useState([0]);
  const [scale, setScale] = useState([100]);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [overlayScale, setOverlayScale] = useState([100]);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });
  const [overlayRotation, setOverlayRotation] = useState(0); // degrees
  const [activeLayer, setActiveLayer] = useState<'photo' | 'overlay'>('photo');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    dragging: boolean;
    lastX: number;
    lastY: number;
    mode: 'move' | 'scale' | 'rotate' | null;
    corner?: 'tl' | 'tr' | 'br' | 'bl';
    startScale?: number;
    startRotation?: number; // degrees
    startOffset?: { x: number; y: number };
    startRadius?: number; // for scale handle
    startAngle?: number; // radians, pointer angle in local space
  }>({ dragging: false, lastX: 0, lastY: 0, mode: null });
  const pendingImageOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingOverlayOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafScheduledRef = useRef(false);
  const [assetUrls, setAssetUrls] = useState<string[]>([]);
  const [renderTick, setRenderTick] = useState(0);
  const [canvasCursor, setCanvasCursor] = useState<string>("default");
  const noiseTileRef = useRef<HTMLCanvasElement | null>(null);

  const removeOverlay = useCallback(() => {
    setOverlayImage(null);
    setOverlayScale([100]);
    setOverlayOffset({ x: 0, y: 0 });
    setOverlayRotation(0);
    setActiveLayer('photo');
    setCanvasCursor('default');
  }, []);

  const addOverlay = useCallback((src: string) => {
    // If there is a current overlay, freeze it in place
    if (overlayImage) {
      setFrozenOverlays((prev) => [...prev, { src: overlayImage, scale: overlayScale[0], offset: { ...overlayOffset }, rotation: overlayRotation }]);
    }
    setOverlayImage(src);
    setOverlayScale([60]); // smaller default so handles are clearly visible
    setOverlayOffset({ x: 0, y: 0 });
    setOverlayRotation(0);
    setActiveLayer('overlay');
  }, [overlayImage, overlayScale, overlayOffset, overlayRotation]);

  // Keyboard shortcuts: Delete/Backspace to remove overlay, Esc to deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveLayer('photo');
        setCanvasCursor('default');
        return;
      }
      if (!overlayImage) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeOverlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlayImage, removeOverlay]);

  // Compute appropriate cursor string for a given point over the overlay
  const getCursorForPoint = (px: number, py: number): string => {
    const canvas = canvasRef.current;
    if (!canvas || !overlayImage) return "default";
    const viewW = canvas.clientWidth;
    const viewH = canvas.clientHeight;
    const ovScale = overlayScale[0] / 100;
    const ovW = viewW * ovScale;
    const ovH = viewH * ovScale;
    const cx = viewW / 2 + overlayOffset.x;
    const cy = viewH / 2 + overlayOffset.y;
    const theta = (overlayRotation * Math.PI) / 180;
    const lx = Math.cos(-theta) * (px - cx) - Math.sin(-theta) * (py - cy);
    const ly = Math.sin(-theta) * (px - cx) + Math.cos(-theta) * (py - cy);
    const halfW = ovW / 2;
    const halfH = ovH / 2;
    const handleRadius = 14;
    const corners: [number, number, 'tl' | 'tr' | 'br' | 'bl'][] = [
      [-halfW, -halfH, 'tl'],
      [halfW, -halfH, 'tr'],
      [halfW, halfH, 'br'],
      [-halfW, halfH, 'bl'],
    ];
    for (const [hx, hy, tag] of corners) {
      if (Math.hypot(lx - hx, ly - hy) <= handleRadius) {
        return tag === 'tl' || tag === 'br' ? 'nwse-resize' : 'nesw-resize';
      }
    }
    const ry = -halfH - 24;
    if (Math.hypot(lx - 0, ly - ry) <= handleRadius) return 'crosshair';
    if (lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH) return 'grab';
    return 'default';
  };

  useEffect(() => {
    const defaults = [
      "Bonk World Order.png",
      "BWO nwo.png",
      "bwo-glow-green.png",
      "button-pressed.png",
      "button-unpressed.png",
    ];
    fetch('/assets/manifest.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const list: string[] = (j?.items ?? defaults)
          .map((it: any) => (typeof it === 'string' ? it : it?.file))
          .filter((s: any) => typeof s === 'string');
        const urls = list.map((name) => `/assets/${encodeURIComponent(name)}`);
        setAssetUrls(urls);
      })
      .catch(() => {
        const urls = defaults.map((name) => `/assets/${encodeURIComponent(name)}`);
        setAssetUrls(urls);
      });
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        toast.success("Image uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        addOverlay(event.target?.result as string);
        toast.success("Overlay added!");
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!uploadedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Size canvas to its container (square), with DPR scaling for crisp output
      const parent = (canvas.parentElement as HTMLElement) || canvas;
      const rect = parent.getBoundingClientRect();
      const cssSize = Math.floor(Math.max(320, Math.min(720, Math.min(rect.width, rect.height || rect.width))));
      const dpr = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
      canvas.width = Math.floor(cssSize * dpr);
      canvas.height = Math.floor(cssSize * dpr);
      canvas.style.width = `${cssSize}px`;
      canvas.style.height = `${cssSize}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Compute cover scale preserving original aspect ratio (no stretch)
      const viewW = cssSize;
      const viewH = cssSize;
      const coverScale = Math.max(viewW / img.width, viewH / img.height);
      const userScale = Math.max(1, (scale[0] || 100) / 100);
      const drawW = img.width * coverScale * userScale;
      const drawH = img.height * coverScale * userScale;
      const offsetX = (viewW - drawW) / 2 + imageOffset.x;
      const offsetY = (viewH - drawH) / 2 + imageOffset.y;

      // Apply saturation to the base photo (no blur to avoid softening)
      ctx.filter = `saturate(${Math.max(0, (saturation[0] || 100)) / 100})`;

      // High quality resampling for better output
      ctx.imageSmoothingEnabled = true;
      // @ts-ignore
      ctx.imageSmoothingQuality = "high";
      // Draw main image (cropped by square viewport)
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      ctx.filter = "none";

      // Optional noise overlay using a repeated tile for performance
      if ((noise[0] ?? 0) > 0) {
        if (!noiseTileRef.current) {
          const tile = document.createElement("canvas");
          tile.width = 128; tile.height = 128;
          const tctx = tile.getContext("2d");
          if (tctx) {
            const data = tctx.createImageData(tile.width, tile.height);
            for (let i = 0; i < data.data.length; i += 4) {
              const v = Math.floor(Math.random() * 256);
              data.data[i] = v; // R
              data.data[i + 1] = v; // G
              data.data[i + 2] = v; // B
              data.data[i + 3] = 255; // A
            }
            tctx.putImageData(data, 0, 0);
          }
          noiseTileRef.current = tile;
        }
        const pattern = ctx.createPattern(noiseTileRef.current!, "repeat");
        if (pattern) {
          ctx.save();
          ctx.globalAlpha = Math.min(0.45, (noise[0] || 0) / 100 * 0.35);
          ctx.fillStyle = pattern;
          ctx.fillRect(0, 0, viewW, viewH);
          ctx.restore();
        }
      }

      // Draw frozen overlays first (no guides)
      for (const fo of frozenOverlays) {
        const ov = new Image();
        ov.onload = () => {
          const ovScale = fo.scale / 100;
          const ovW = viewW * ovScale;
          const ovH = viewH * ovScale;
          const cx = viewW / 2 + fo.offset.x;
          const cy = viewH / 2 + fo.offset.y;
          const theta = (fo.rotation * Math.PI) / 180;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(theta);
          ctx.drawImage(ov, -ovW / 2, -ovH / 2, ovW, ovH);
          ctx.restore();
        };
        ov.src = fo.src;
      }

      // Current overlay with guides
      if (overlayImage) {
        const ov = new Image();
        ov.onload = () => {
          const ovScale = overlayScale[0] / 100;
          const ovW = viewW * ovScale;
          const ovH = viewH * ovScale;
          const cx = viewW / 2 + overlayOffset.x;
          const cy = viewH / 2 + overlayOffset.y;
          const theta = (overlayRotation * Math.PI) / 180;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(theta);
          ctx.drawImage(ov, -ovW / 2, -ovH / 2, ovW, ovH);
          // selection guides
          ctx.strokeStyle = "rgba(16,185,129,0.6)";
          ctx.lineWidth = 2;
          ctx.strokeRect(-ovW / 2, -ovH / 2, ovW, ovH);
          const handle = 12;
          ctx.fillStyle = "rgba(16,185,129,0.9)";
          const corners: [number, number][] = [
            [-ovW / 2, -ovH / 2],
            [ovW / 2, -ovH / 2],
            [ovW / 2, ovH / 2],
            [-ovW / 2, ovH / 2],
          ];
          for (const [hx, hy] of corners) ctx.fillRect(hx - handle / 2, hy - handle / 2, handle, handle);
          const rOff = 24;
          ctx.beginPath();
          ctx.arc(0, -ovH / 2 - rOff, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };
        ov.src = overlayImage;
      }

      // Subtle green preview border (not included in export)
      ctx.save();
      ctx.strokeStyle = "rgba(16,185,129,0.6)"; // emerald-500-ish
      ctx.lineWidth = 1;
      // Align to pixel grid for crispness
      ctx.strokeRect(0.5, 0.5, viewW - 1, viewH - 1);
      ctx.restore();
    };
    img.src = uploadedImage;
  }, [uploadedImage, saturation, noise, scale, imageOffset, overlayImage, overlayScale, overlayOffset, overlayRotation, renderTick]);

  // Redraw on resize for responsive canvas sizing
  useEffect(() => {
    if (!uploadedImage) return;
    let raf: number | null = null;
    const onResize = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setRenderTick((t) => t + 1));
    };
    window.addEventListener('resize', onResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [uploadedImage]);

  const handleDownload = async () => {
    if (!canvasRef.current || !uploadedImage) return;

    // Determine a unique sequential agent number (avoid duplicates within this browser)
    const usedKey = 'bwo:agent:used';
    let used: number[] = [];
    try { used = JSON.parse(localStorage.getItem(usedKey) || '[]'); } catch {}
    const usedSet = new Set<number>(Array.isArray(used) ? used : []);
    let prev = parseInt(localStorage.getItem('bwo:agentCounter') || '0', 10) || 0;
    let next = prev;
    for (let i = 0; i < 10000; i++) {
      next = (next + 1) % 10000;
      if (!usedSet.has(next)) break;
    }
    usedSet.add(next);
    localStorage.setItem('bwo:agentCounter', String(next));
    localStorage.setItem(usedKey, JSON.stringify(Array.from(usedSet).slice(-400)));
    const idStr = String(next).padStart(4, '0');

    // Render to an offscreen canvas WITHOUT transform guides/handles
    const sourceCanvas = canvasRef.current;
    const cssSize = sourceCanvas.clientWidth; // square canvas
    const dpr = Math.max(1, Math.min(2, (window as any).devicePixelRatio || 1));
    const off = document.createElement('canvas');
    off.width = Math.floor(cssSize * dpr);
    off.height = Math.floor(cssSize * dpr);
    const octx = off.getContext('2d');
    if (!octx) return;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Load base image
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = src;
    });

    const baseImg = await load(uploadedImage);
    const viewW = cssSize;
    const viewH = cssSize;
    const coverScale = Math.max(viewW / baseImg.width, viewH / baseImg.height);
    const userScale = Math.max(1, (scale[0] || 100) / 100);
    const drawW = baseImg.width * coverScale * userScale;
    const drawH = baseImg.height * coverScale * userScale;
    const offsetX = (viewW - drawW) / 2 + imageOffset.x;
    const offsetY = (viewH - drawH) / 2 + imageOffset.y;

    octx.imageSmoothingEnabled = true;
    // @ts-ignore
    octx.imageSmoothingQuality = 'high';
    octx.filter = `saturate(${Math.max(0, (saturation[0] || 100)) / 100})`;
    octx.drawImage(baseImg, offsetX, offsetY, drawW, drawH);
    octx.filter = 'none';

    // Noise overlay (same as preview)
    if ((noise[0] ?? 0) > 0) {
      if (!noiseTileRef.current) {
        const tile = document.createElement('canvas');
        tile.width = 128; tile.height = 128;
        const tctx = tile.getContext('2d');
        if (tctx) {
          const data = tctx.createImageData(tile.width, tile.height);
          for (let i = 0; i < data.data.length; i += 4) {
            const v = Math.floor(Math.random() * 256);
            data.data[i] = v; data.data[i+1] = v; data.data[i+2] = v; data.data[i+3] = 255;
          }
          tctx.putImageData(data, 0, 0);
        }
        noiseTileRef.current = tile;
      }
      const pattern = octx.createPattern(noiseTileRef.current!, 'repeat');
      if (pattern) {
        octx.save();
        octx.globalAlpha = Math.min(0.45, (noise[0] || 0) / 100 * 0.35);
        octx.fillStyle = pattern;
        octx.fillRect(0, 0, viewW, viewH);
        octx.restore();
      }
    }

    // Frozen overlays first
    for (const fo of frozenOverlays) {
      const ovImg = await load(fo.src);
      const ovScale = fo.scale / 100;
      const ovW = viewW * ovScale;
      const ovH = viewH * ovScale;
      const cx = viewW / 2 + fo.offset.x;
      const cy = viewH / 2 + fo.offset.y;
      const theta = (fo.rotation * Math.PI) / 180;
      octx.save();
      octx.translate(cx, cy);
      octx.rotate(theta);
      octx.drawImage(ovImg, -ovW / 2, -ovH / 2, ovW, ovH);
      octx.restore();
    }
    // Current overlay last
    if (overlayImage) {
      const ovImg = await load(overlayImage);
      const ovScale = overlayScale[0] / 100;
      const ovW = viewW * ovScale;
      const ovH = viewH * ovScale;
      const cx = viewW / 2 + overlayOffset.x;
      const cy = viewH / 2 + overlayOffset.y;
      const theta = (overlayRotation * Math.PI) / 180;
      octx.save();
      octx.translate(cx, cy);
      octx.rotate(theta);
      octx.drawImage(ovImg, -ovW / 2, -ovH / 2, ovW, ovH);
      octx.restore();
    }

    // No border in export

    const link = document.createElement('a');
    link.download = `BWO_AGENT_#${idStr}.png`;
    link.href = off.toDataURL('image/png');
    link.click();
    toast.success('PFP downloaded!');
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    dragRef.current.dragging = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // seed pending refs
    pendingImageOffsetRef.current = { ...imageOffset } as any;
    pendingOverlayOffsetRef.current = { ...overlayOffset } as any;

    // If an overlay exists, prefer selecting it on hit even if activeLayer is 'photo'
    if (overlayImage) {
      // Determine transform mode by hit-testing handles
      const viewW = canvas.clientWidth;
      const viewH = canvas.clientHeight;
      const ovScale = overlayScale[0] / 100;
      const ovW = viewW * ovScale;
      const ovH = viewH * ovScale;
      const cx = viewW / 2 + overlayOffset.x;
      const cy = viewH / 2 + overlayOffset.y;
      const theta = (overlayRotation * Math.PI) / 180;
      // Convert point to overlay local space
      const lx = Math.cos(-theta) * (px - cx) - Math.sin(-theta) * (py - cy);
      const ly = Math.sin(-theta) * (px - cx) + Math.cos(-theta) * (py - cy);
      const halfW = ovW / 2;
      const halfH = ovH / 2;
      const handleRadius = 14;
      const corners: [number, number, 'tl' | 'tr' | 'br' | 'bl'][] = [
        [-halfW, -halfH, 'tl'],
        [halfW, -halfH, 'tr'],
        [halfW, halfH, 'br'],
        [-halfW, halfH, 'bl'],
      ];
      for (const [hx, hy, tag] of corners) {
        if (Math.hypot(lx - hx, ly - hy) <= handleRadius) {
          setActiveLayer('overlay');
          dragRef.current.mode = 'scale';
          dragRef.current.corner = tag;
          dragRef.current.startScale = overlayScale[0];
          dragRef.current.startRadius = Math.max(1, Math.hypot(lx, ly));
          setCanvasCursor(tag === 'tl' || tag === 'br' ? 'nwse-resize' : 'nesw-resize');
          return;
        }
      }
      // rotate handle near top center
      const ry = -halfH - 24;
      if (Math.hypot(lx - 0, ly - ry) <= handleRadius) {
        setActiveLayer('overlay');
        dragRef.current.mode = 'rotate';
        dragRef.current.startRotation = overlayRotation;
        dragRef.current.startAngle = Math.atan2(ly, lx);
        setCanvasCursor('crosshair');
        return;
      }
      // inside box => move
      if (lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH) {
        setActiveLayer('overlay');
        dragRef.current.mode = 'move';
        dragRef.current.startOffset = { ...overlayOffset };
        setCanvasCursor('grabbing');
        return;
      }
      // default none
      dragRef.current.mode = null;
    } else {
      dragRef.current.mode = 'move';
      setCanvasCursor('grabbing');
    }
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // Hover feedback when not dragging
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (!dragRef.current.dragging) {
      if (overlayImage) {
        const viewW = canvas.clientWidth;
        const viewH = canvas.clientHeight;
        const ovScale = overlayScale[0] / 100;
        const ovW = viewW * ovScale;
        const ovH = viewH * ovScale;
        const cx = viewW / 2 + overlayOffset.x;
        const cy = viewH / 2 + overlayOffset.y;
        const theta = (overlayRotation * Math.PI) / 180;
        const lx = Math.cos(-theta) * (px - cx) - Math.sin(-theta) * (py - cy);
        const ly = Math.sin(-theta) * (px - cx) + Math.cos(-theta) * (py - cy);
        const halfW = ovW / 2;
        const halfH = ovH / 2;
        const handleRadius = 10;
        const corners: [number, number, 'tl' | 'tr' | 'br' | 'bl'][] = [
          [-halfW, -halfH, 'tl'],
          [halfW, -halfH, 'tr'],
          [halfW, halfH, 'br'],
          [-halfW, halfH, 'bl'],
        ];
        let cursor = 'default';
        for (const [hx, hy, tag] of corners) {
          if (Math.hypot(lx - hx, ly - hy) <= handleRadius) {
            cursor = tag === 'tl' || tag === 'br' ? 'nwse-resize' : 'nesw-resize';
            break;
          }
        }
        if (cursor === 'default') {
          const ry = -halfH - 24;
          if (Math.hypot(lx - 0, ly - ry) <= handleRadius) cursor = 'crosshair';
          else if (lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH) cursor = 'grab';
        }
        setCanvasCursor(cursor);
      } else {
        setCanvasCursor('default');
      }
      return;
    }
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    if (activeLayer === 'photo') {
      const next = pendingImageOffsetRef.current;
      next.x += dx; next.y += dy;
    } else {
      // overlay modes
      const viewW = canvas.clientWidth;
      const viewH = canvas.clientHeight;
      const cx = viewW / 2 + overlayOffset.x;
      const cy = viewH / 2 + overlayOffset.y;
      const theta = (overlayRotation * Math.PI) / 180;
      const lx = Math.cos(-theta) * (px - cx) - Math.sin(-theta) * (py - cy);
      const ly = Math.sin(-theta) * (px - cx) + Math.cos(-theta) * (py - cy);

      if (dragRef.current.mode === 'move') {
        const next = pendingOverlayOffsetRef.current;
        next.x += dx; next.y += dy;
        setCanvasCursor('grabbing');
      } else if (dragRef.current.mode === 'scale') {
        const startR = Math.max(1, dragRef.current.startRadius || 1);
        const r = Math.max(1, Math.hypot(lx, ly));
        const s = (dragRef.current.startScale || overlayScale[0]) * (r / startR);
        const clamped = Math.min(300, Math.max(10, s));
        setOverlayScale([clamped]);
      } else if (dragRef.current.mode === 'rotate') {
        const startA = dragRef.current.startAngle || 0;
        const a = Math.atan2(ly, lx);
        const deltaDeg = ((a - startA) * 180) / Math.PI;
        setOverlayRotation((dragRef.current.startRotation || 0) + deltaDeg);
        setCanvasCursor('crosshair');
      }
    }

    if (!rafScheduledRef.current) {
      rafScheduledRef.current = true;
      requestAnimationFrame(() => {
        rafScheduledRef.current = false;
        if (activeLayer === 'photo') {
          setImageOffset({ ...pendingImageOffsetRef.current });
        } else if (dragRef.current.mode === 'move') {
          setOverlayOffset({ ...pendingOverlayOffsetRef.current });
        } else {
          // scale/rotate already update reactive state above
          setRenderTick((t) => t + 1);
        }
      });
    }
  };
  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    dragRef.current.dragging = false;
    dragRef.current.mode = null;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setCanvasCursor(getCursorForPoint(px, py));
  };

  const onCanvasPointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.dragging = false;
    dragRef.current.mode = null;
    setCanvasCursor('default');
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const onCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = -e.deltaY; // wheel up => zoom in
    const step = delta > 0 ? 2 : -2;
    if (activeLayer === 'overlay') {
      setOverlayScale((s) => [clamp(s[0] + step, 10, 200)]);
    } else {
      setScale((s) => [clamp(s[0] + step, 100, 300)]);
    }
  };

  const onDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setImageOffset({ x: 0, y: 0 });
      toast.success("Image added");
    };
    reader.readAsDataURL(file);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  return (
    <div className="w-full" onDrop={onDropFile} onDragOver={onDragOver}>
      <div className="glass-panel rounded-xl p-0 w-full">
      <div className="flex items-center gap-3 mb-2 px-3 pt-3">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold glow-text">PFP Generator</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[720px_360px] gap-2 md:gap-3 px-3 pb-3">
        {/* Upload Section */}
        <div className="flex flex-col items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <input
            ref={overlayInputRef}
            type="file"
            accept="image/*"
            onChange={handleOverlayUpload}
            className="hidden"
          />
          
          {!uploadedImage ? (
            <div
              className="w-full lg:w-[720px] max-w-[720px] aspect-square rounded-xl border border-emerald-500/30 bg-neutral-900/70 flex items-center justify-center text-emerald-200/90 cursor-pointer hover:bg-neutral-900/80 transition"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6" />
                <span className="text-sm">Drag & drop or click to upload</span>
                <span className="text-[10px] opacity-70">PNG/JPG/WebP • up to ~10MB</span>
              </div>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full lg:w-[720px] max-w-[720px] aspect-square rounded-xl max-h-[58vh]"
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onPointerCancel={onCanvasPointerCancel}
              onPointerLeave={() => setCanvasCursor("default")}
              onWheel={onCanvasWheel}
              style={{ cursor: canvasCursor as any, touchAction: "none" }}
            />
          )}
        </div>

        {/* Right Sidebar: controls + assets stacked in one column */}
        <div className="lg:col-start-2 flex flex-col min-h-[60vh] max-h-[60vh]">
          <div className="shrink-0 space-y-2">
            {!uploadedImage ? (
              <div className="text-sm text-emerald-300/80">
                <p className="mb-2">How to use:</p>
                <ol className="list-decimal list-inside space-y-1 opacity-90">
                  <li>Drop or click to upload your photo.</li>
                  <li>Drag to position the image; use Scale/Blur/Tint for styling.</li>
                  <li>Optional: Add Overlay, then drag/scale it.</li>
                  <li>Click Export to download a square PNG.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Saturation: {saturation[0]}%</label>
                  <Slider value={saturation} onValueChange={setSaturation} min={0} max={200} step={1} className="w-full" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Noise: {noise[0]}%</label>
                  <Slider value={noise} onValueChange={setNoise} min={0} max={100} step={1} className="w-full" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={() => overlayInputRef.current?.click()}>
                    <Layers className="mr-2 h-4 w-4" /> Add Overlay
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setActiveLayer(activeLayer === 'photo' ? 'overlay' : 'photo')}>
                    Editing: {activeLayer === 'photo' ? 'Photo' : 'Overlay'}
                  </Button>
                </div>
                {overlayImage && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Overlay Scale: {overlayScale[0]}%</label>
                    <Slider value={overlayScale} onValueChange={setOverlayScale} min={10} max={200} step={1} />
                  </div>
                )}
                {overlayImage && (
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="destructive" className="w-full" onClick={removeOverlay}>
                      Remove Overlay
                    </Button>
                  </div>
                )}
                <div className="flex gap-3 pt-1">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1">
                    <Upload className="mr-2 h-4 w-4" />
                    Change Image
                  </Button>
                <Button onClick={handleDownload} variant="default" className="flex-1 glow-border">
                    <Download className="mr-2 h-4 w-4" />
                    Export PNG
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Separator className="my-3 bg-emerald-500/30" />
          <div className="flex-1 min-h-0 overflow-auto">
            <div className="text-sm font-medium text-emerald-300/80">Assets</div>
            {assetUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 mt-2">
                {assetUrls.slice(0, 30).map((url) => (
                  <button
                    key={url}
                    type="button"
                    className="group relative aspect-square rounded-md overflow-hidden border border-emerald-500/30 hover:border-emerald-500/60 bg-neutral-900/60"
                    onClick={() => { addOverlay(url); }}
                  >
                    <img src={url} alt="asset" className="w-full h-full object-contain" />
                    <span className="absolute bottom-0 left-0 right-0 text-[10px] text-emerald-300/80 bg-black/40 opacity-0 group-hover:opacity-100 transition">Use</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-emerald-300/70">
                Place overlay files in <code className="text-emerald-200">public/assets</code> and (optionally) add a manifest:
                <pre className="mt-2 p-2 bg-black/40 rounded text-[10px] overflow-auto">{`/assets/manifest.json\n{ "items": [ "overlay1.png", "overlay2.png" ] }`}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
