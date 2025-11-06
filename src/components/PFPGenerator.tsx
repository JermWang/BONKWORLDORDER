import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";

export const PFPGenerator = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [overlayImage, setOverlayImage] = useState<string | null>(null);
  const [opacity, setOpacity] = useState([0]);
  const [tint, setTint] = useState([0]);
  const [blur, setBlur] = useState([0]);
  const [scale, setScale] = useState([100]);
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [overlayScale, setOverlayScale] = useState([100]);
  const [overlayOffset, setOverlayOffset] = useState({ x: 0, y: 0 });
  const [activeLayer, setActiveLayer] = useState<'photo' | 'overlay'>('photo');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const overlayInputRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ dragging: boolean; lastX: number; lastY: number }>({ dragging: false, lastX: 0, lastY: 0 });
  const pendingImageOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pendingOverlayOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafScheduledRef = useRef(false);
  const [assetUrls, setAssetUrls] = useState<string[]>([]);

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
        setOverlayImage(event.target?.result as string);
        setActiveLayer('overlay');
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
      const maxByHeight = Math.floor(window.innerHeight * 0.62);
      const maxByWidth = Math.floor(window.innerWidth * 0.48);
      const size = Math.max(360, Math.min(720, maxByHeight, maxByWidth));
      canvas.width = size;
      canvas.height = size;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply scale & position
      const scaleValue = scale[0] / 100;
      const scaledWidth = canvas.width * scaleValue;
      const scaledHeight = canvas.height * scaleValue;
      const offsetX = (canvas.width - scaledWidth) / 2 + imageOffset.x;
      const offsetY = (canvas.height - scaledHeight) / 2 + imageOffset.y;

      // Apply blur
      ctx.filter = `blur(${blur[0]}px)`;

      // Draw main image
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Tint (only if opacity > 0)
      if ((opacity[0] ?? 0) > 0) {
        ctx.filter = "none";
        ctx.globalAlpha = opacity[0] / 100;
        ctx.fillStyle = `hsl(${tint[0]}, 100%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Overlay image
      if (overlayImage) {
        const ov = new Image();
        ov.onload = () => {
          const ovScale = overlayScale[0] / 100;
          const ovW = canvas.width * ovScale;
          const ovH = canvas.height * ovScale;
          const ovX = (canvas.width - ovW) / 2 + overlayOffset.x;
          const ovY = (canvas.height - ovH) / 2 + overlayOffset.y;
          ctx.globalAlpha = 1;
          ctx.drawImage(ov, ovX, ovY, ovW, ovH);
          // highlight border
          ctx.strokeStyle = "rgba(16,185,129,0.4)";
          ctx.lineWidth = 2;
          ctx.strokeRect(ovX, ovY, ovW, ovH);
        };
        ov.src = overlayImage;
      }

      // Cyber border
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "hsl(180, 100%, 50%)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    };
    img.src = uploadedImage;
  }, [uploadedImage, opacity, tint, blur, scale, imageOffset, overlayImage, overlayScale, overlayOffset]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement("a");
    // Generate sequential 4-digit agent number stored per browser
    const prev = parseInt(localStorage.getItem('bwo:agentCounter') || '0', 10) || 0;
    const next = (prev + 1) % 10000;
    localStorage.setItem('bwo:agentCounter', String(next));
    const idStr = String(next).padStart(4, '0');
    link.download = `BWO_AGENT_#${idStr}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
    toast.success("PFP downloaded!");
  };

  const onCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.dragging = true;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    // seed pending refs to current state for smooth updates
    pendingImageOffsetRef.current = { ...imageOffset } as any;
    pendingOverlayOffsetRef.current = { ...overlayOffset } as any;
  };
  const onCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.dragging) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;

    if (activeLayer === 'photo') {
      const next = pendingImageOffsetRef.current;
      next.x += dx; next.y += dy;
    } else {
      const next = pendingOverlayOffsetRef.current;
      next.x += dx; next.y += dy;
    }

    if (!rafScheduledRef.current) {
      rafScheduledRef.current = true;
      requestAnimationFrame(() => {
        rafScheduledRef.current = false;
        if (activeLayer === 'photo') {
          setImageOffset({ ...pendingImageOffsetRef.current });
        } else {
          setOverlayOffset({ ...pendingOverlayOffsetRef.current });
        }
      });
    }
  };
  const onCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragRef.current.dragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const onCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    // smooth zoom for overlay only
    if (activeLayer !== 'overlay') return;
    e.preventDefault();
    const delta = -e.deltaY; // wheel up => zoom in
    const step = delta > 0 ? 2 : -2;
    setOverlayScale((s) => [clamp(s[0] + step, 10, 200)]);
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
      <div className="glass-panel rounded-xl p-4 md:p-6 w-full">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold glow-text">PFP Generator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-4">
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
              className="w-full max-w-[720px] aspect-square rounded-xl border border-emerald-500/30 bg-neutral-900/70 flex items-center justify-center text-emerald-200/90 cursor-pointer hover:bg-neutral-900/80 transition"
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
              className="w-full max-w-[720px] aspect-square rounded-xl glow-border cursor-move max-h-[62vh]"
              onPointerDown={onCanvasPointerDown}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={onCanvasPointerUp}
              onWheel={onCanvasWheel}
            />
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
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
          ) : null}
        {uploadedImage && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Opacity: {opacity[0]}%
              </label>
              <Slider
                value={opacity}
                onValueChange={setOpacity}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Tint: {tint[0]}°
              </label>
              <Slider
                value={tint}
                onValueChange={setTint}
                max={360}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Blur: {blur[0]}px
              </label>
              <Slider
                value={blur}
                onValueChange={setBlur}
                max={20}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Scale: {scale[0]}%
              </label>
              <Slider
                value={scale}
                onValueChange={setScale}
                min={50}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => overlayInputRef.current?.click()}>
                <Layers className="mr-2 h-4 w-4" /> Add Overlay
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setActiveLayer(activeLayer === 'photo' ? 'overlay' : 'photo')}>
                Editing: {activeLayer === 'photo' ? 'Photo' : 'Overlay'}
              </Button>
            </div>
            {overlayImage && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Overlay Scale: {overlayScale[0]}%
                </label>
                <Slider value={overlayScale} onValueChange={setOverlayScale} min={10} max={200} step={1} />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="flex-1 glass-panel border-primary/30 hover:bg-primary/10"
              >
                <Upload className="mr-2 h-4 w-4" />
                Change Image
              </Button>
              <Button
                onClick={handleDownload}
                className="flex-1 bg-primary/20 hover:bg-primary/30 glow-border"
              >
                <Download className="mr-2 h-4 w-4" />
                Export PNG
              </Button>
            </div>
          </div>
        )}
        </div>

        {/* Asset panel */}
        <div className="space-y-4">
          <div className="text-sm font-medium text-emerald-300/80">Assets</div>
          {assetUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 pr-1">
              {assetUrls.slice(0,6).map((url) => (
                <button
                  key={url}
                  type="button"
                  className="group relative aspect-square rounded-md overflow-hidden border border-emerald-500/30 hover:border-emerald-500/60 bg-neutral-900/60"
                  onClick={() => { setOverlayImage(url); setActiveLayer('overlay'); }}
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
  );
};
