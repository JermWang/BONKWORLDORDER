import { useState, useEffect, useRef, useCallback } from "react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { CopyContractButton } from "@/components/CopyContractButton";
import { PFPGenerator } from "@/components/PFPGenerator";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkles, X } from "lucide-react";
import { XLogo } from "@/components/icons/XLogo";
import { SatelliteMapBackground } from "@/components/background/SatelliteMapBackground";
import { SatelliteFrame } from "@/components/background/SatelliteFrame";
import { SatelliteHUD } from "@/components/background/SatelliteHUD";
import { NukeButton } from "@/components/nuke/NukeButton";
import BlastFX, { BlastFXHandle } from "@/components/nuke/BlastFX";
import CounterWidget from "@/components/nuke/CounterWidget";
import { NukeHUD } from "@/components/nuke/NukeHUD";
import ExplosionVideo, { ExplosionVideoHandle } from "@/components/nuke/ExplosionVideo";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getGlobalStrikes, logStrike, subscribeToStrikes } from "@/lib/supabase";

const Index = () => {
  const [showPFPGenerator, setShowPFPGenerator] = useState(false);
  const blastRef = useRef<BlastFXHandle>(null);
  const explosionRef = useRef<ExplosionVideoHandle>(null);
  
  // Launch sequence state
  const [isArmed, setIsArmed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [globalStrikes, setGlobalStrikes] = useState(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial global strikes and subscribe to real-time updates
  useEffect(() => {
    getGlobalStrikes().then(setGlobalStrikes);
    const unsubscribe = subscribeToStrikes(setGlobalStrikes);
    return unsubscribe;
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    if (countdown === 0) {
      // resume background motion shortly after blast
      // Trigger explosion at T-0
      explosionRef.current?.trigger();
      blastRef.current?.blast();
      
      // Reset after explosion
      setTimeout(() => {
        setCountdown(null);
        setIsArmed(false);
        setIsLaunching(false);
        window.dispatchEvent(new Event('bwo:resume'));
      }, 2000);
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((c) => (c !== null && c > 0 ? c - 1 : null));
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdown]);

  const handleNukeLaunch = useCallback(async () => {
    if (isLaunching || countdown !== null) return;
    setIsLaunching(true);
    setIsArmed(true);
    setCountdown(3); // 3 second countdown
    // Pause background motion to reduce jank during sequence
    window.dispatchEvent(new Event('bwo:pause'));
    
    // Increment counter immediately (non-blocking)
    logStrike().then((nextCount) => {
      if (nextCount !== null) {
        setGlobalStrikes(nextCount);
        window.dispatchEvent(new CustomEvent('strikes:update', { detail: nextCount }));
      }
    });
  }, [isLaunching, countdown]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'rgb(0, 0, 0)' }}>
      <SatelliteMapBackground />
      <SatelliteFrame />
      <SatelliteHUD />
      <ParticleBackground />
      <BlastFX ref={blastRef} />
      <CounterWidget />
      <NukeHUD 
        isArmed={isArmed} 
        countdown={countdown} 
        globalStrikes={globalStrikes}
        onCountdownComplete={() => {
          // Explosion will be triggered automatically at T-0
        }}
      />
      <ExplosionVideo ref={explosionRef} videoSrc="/explosion.gif" audioSrc="/sounds/C4 Explosion FX.wav" postAudioSrc="/sounds/BWO.wav" durationMs={3200} />

      {/* X/Twitter Button - Top Right */}
      <div className="fixed top-6 right-6 md:top-20 md:right-20 z-[9100]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon" className="text-green-500 hover:text-green-400 glass-panel">
              <a
                href="https://x.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Visit us on X (Twitter)"
              >
                <XLogo className="h-5 w-5" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Follow on X</TooltipContent>
        </Tooltip>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          {/* Hero Image with Glow */}
          <div className="relative flex items-center justify-center">
            <img
              src="/BWO-TRANSPARENT.gif"
              alt="BWO Main Hero"
              className="relative z-10 w-full max-w-lg md:max-w-xl"
              style={{ 
                imageRendering: 'auto',
                filter: 'drop-shadow(0 0 40px rgba(0, 255, 120, 0.4)) drop-shadow(0 0 80px rgba(0, 255, 120, 0.2))',
                mixBlendMode: 'normal'
              }}
            />
          </div>

          {/* Title Logo directly under hero */}
          <div className="flex justify-center">
            <img
              src="/assets/Bonk World Order.png"
              alt="Bonk World Order"
              className="w-full max-w-[130px]"
              style={{ 
                filter: 'drop-shadow(0 0 20px rgba(0, 255, 120, 0.3))'
              }}
            />
          </div>

          {/* Nuke Button */}
          <div className="pt-0.5">
              <NukeButton onFire={handleNukeLaunch} disabled={countdown !== null || isLaunching} />
          </div>

          {/* Action Buttons at the bottom */}
          <div className="flex flex-col items-center gap-2 justify-center w-full mt-1">
            <div className="w-full max-w-md">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CopyContractButton className="w-full justify-center px-4 py-2.5 text-sm" />
                <Button
                  onClick={() => setShowPFPGenerator(!showPFPGenerator)}
                  className="w-full glass-panel glow-border px-4 py-2.5 text-sm font-bold transition-all duration-300 hover:scale-105 bg-secondary/10 hover:bg-secondary/20 text-foreground border-2"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  {showPFPGenerator ? "Close" : "Create"} PFP
                </Button>
              </div>
            </div>
          </div>

          {/* PFP Generator Modal */}
          <Dialog open={showPFPGenerator} onOpenChange={setShowPFPGenerator}>
            <DialogContent className="max-w-[1200px] w-[96vw] max-h-[85vh] overflow-auto p-0 bg-black/90 border-emerald-500/20">
              <PFPGenerator />
            </DialogContent>
          </Dialog>
        </div>

        {/* Footer Logo removed; now shown under hero */}
      </div>
    </div>
  );
};

export default Index;
