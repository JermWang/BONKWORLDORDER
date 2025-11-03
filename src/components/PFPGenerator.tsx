import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Upload, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const PFPGenerator = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [opacity, setOpacity] = useState([80]);
  const [tint, setTint] = useState([0]);
  const [blur, setBlur] = useState([0]);
  const [scale, setScale] = useState([100]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!uploadedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = 500;
      canvas.height = 500;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply scale
      const scaleValue = scale[0] / 100;
      const scaledWidth = canvas.width * scaleValue;
      const scaledHeight = canvas.height * scaleValue;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;

      // Apply blur
      ctx.filter = `blur(${blur[0]}px)`;

      // Draw image
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

      // Apply tint overlay
      ctx.filter = "none";
      ctx.globalAlpha = opacity[0] / 100;
      ctx.fillStyle = `hsl(${tint[0]}, 100%, 50%)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add cyber border effect
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "hsl(180, 100%, 50%)";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    };
    img.src = uploadedImage;
  }, [uploadedImage, opacity, tint, blur, scale]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const link = document.createElement("a");
    link.download = "cyber-pfp.png";
    link.href = canvasRef.current.toDataURL();
    link.click();
    toast.success("PFP downloaded!");
  };

  return (
    <div className="glass-panel rounded-2xl p-8 w-full max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold glow-text">PFP Generator</h2>
      </div>

      <div className="space-y-6">
        {/* Upload Section */}
        <div className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          {!uploadedImage ? (
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="glass-panel glow-border w-full py-8 bg-muted/20 hover:bg-muted/30 transition-all duration-300"
            >
              <Upload className="mr-2 h-5 w-5" />
              Upload Your Image
            </Button>
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full max-w-md aspect-square rounded-xl glow-border"
            />
          )}
        </div>

        {/* Controls */}
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
                max={150}
                step={1}
                className="w-full"
              />
            </div>

            <div className="flex gap-3 pt-4">
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
                Download PFP
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
