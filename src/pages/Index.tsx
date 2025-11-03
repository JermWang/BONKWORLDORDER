import { useState } from "react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { CopyContractButton } from "@/components/CopyContractButton";
import { PFPGenerator } from "@/components/PFPGenerator";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import bwoHero from "@/assets/bwo-hero.gif";

const Index = () => {
  const [showPFPGenerator, setShowPFPGenerator] = useState(false);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center gap-8">
          {/* Hero Image */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-1000 animate-glow-pulse" />
            <img
              src={bwoHero}
              alt="BWO Main Hero"
              className="relative rounded-3xl w-full max-w-3xl animate-float glass-panel"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center">
            <CopyContractButton />
            <Button
              onClick={() => setShowPFPGenerator(!showPFPGenerator)}
              className="glass-panel glow-border px-8 py-6 text-lg font-bold transition-all duration-300 hover:scale-105 bg-secondary/10 hover:bg-secondary/20 text-foreground border-2"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {showPFPGenerator ? "Close" : "Create"} PFP
            </Button>
          </div>

          {/* PFP Generator Modal */}
          {showPFPGenerator && (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative">
                <Button
                  onClick={() => setShowPFPGenerator(false)}
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 z-20 glass-panel glow-border rounded-full hover:bg-destructive/20"
                >
                  <X className="h-5 w-5" />
                </Button>
                <PFPGenerator />
              </div>
            </div>
          )}
        </div>

        {/* Footer Text */}
        <div className="text-center mt-12">
          <p className="text-foreground font-bold text-lg glow-text">
            Bonk World Order
          </p>
        </div>
      </div>

      {/* Ambient Glow Effects */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />
    </div>
  );
};

export default Index;
