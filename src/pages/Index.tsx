import { useState, useEffect, useRef, useCallback } from "react";
import { usePreciseCountdown } from "@/hooks/use-countdown";
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
import MuteButton from "@/components/MuteButton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getGlobalStrikes, logStrike, subscribeToStrikes } from "@/lib/supabase";

const Index = () => {
  const [showPFPGenerator, setShowPFPGenerator] = useState(false);
  const blastRef = useRef<BlastFXHandle>(null);
  const explosionRef = useRef<ExplosionVideoHandle>(null);
  
  // Launch sequence state
  const [isArmed, setIsArmed] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [globalStrikes, setGlobalStrikes] = useState(0);
  const { seconds: countdown, start: startCountdown, reset: resetCountdown } = usePreciseCountdown({
    onComplete: () => {
      // Trigger blast visuals and SFX exactly once at T-0
      explosionRef.current?.trigger();
      blastRef.current?.blast();
    },
  });

  // Load initial global strikes and subscribe to real-time updates
  useEffect(() => {
    getGlobalStrikes().then(setGlobalStrikes);
    const unsubscribe = subscribeToStrikes(setGlobalStrikes);
    return unsubscribe;
  }, []);

  // Countdown handled by usePreciseCountdown

  const handleNukeLaunch = useCallback(async () => {
    if (isLaunching || countdown !== null) return;
    setIsLaunching(true);
    // Pause background motion to reduce jank during sequence
    window.dispatchEvent(new Event('bwo:pause'));

    // Small delay to let the button click finish before sequence starts
    setTimeout(() => {
      setIsArmed(true);
      startCountdown(3);
      // Increment counter immediately (non-blocking)
      logStrike().then((nextCount) => {
        if (nextCount !== null) {
          setGlobalStrikes(nextCount);
          window.dispatchEvent(new CustomEvent('strikes:update', { detail: nextCount }));
        }
      });
    }, 200);
  }, [isLaunching, countdown, startCountdown]);

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
      <ExplosionVideo 
        ref={explosionRef} 
        videoSrc="/explosion.gif" 
        audioSrc="/sounds/C4 Explosion FX.wav" 
        postAudioSrc="/sounds/BWO.wav" 
        durationMs={3200}
        onComplete={() => {
          // Reset sequence state after explosion playback finishes
          resetCountdown();
          setIsArmed(false);
          setIsLaunching(false);
          window.dispatchEvent(new Event('bwo:resume'));
        }}
      />

      {/* X/Twitter Button - Top Right */}
      <div className="fixed top-6 right-6 md:top-20 md:right-20 z-[9100] flex items-center gap-2">
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
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <MuteButton />
            </div>
          </TooltipTrigger>
          <TooltipContent>Toggle sound</TooltipContent>
        </Tooltip>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col items-center gap-3">
          {/* Hero Image with Glow */}
          <div className="relative flex items-center justify-center isolate">
            <img
              src="/BWO-TRANSPARENT.gif"
              alt="BWO Main Hero"
              className="relative z-10 w-full max-w-lg md:max-w-xl"
              style={{ 
                imageRendering: 'auto',
                filter: 'drop-shadow(0 0 28px rgba(0, 255, 120, 0.35)) drop-shadow(0 0 56px rgba(0, 255, 120, 0.18))',
                mixBlendMode: 'normal',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                willChange: 'transform'
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
            <DialogContent className="w-[96vw] max-w-[96vw] md:max-w-[1280px] min-w-0 md:min-w-[980px] max-h-[90vh] overflow-hidden p-0 bg-black/90 border-emerald-500/20">
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
