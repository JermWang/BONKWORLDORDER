import { ParticleBackground } from "@/components/ParticleBackground";
import { CopyContractButton } from "@/components/CopyContractButton";
import { PFPGenerator } from "@/components/PFPGenerator";
import bwoHero from "@/assets/bwo-hero.gif";

const Index = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
      {/* Particle Background */}
      <ParticleBackground />

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Hero Image */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition duration-1000 animate-glow-pulse" />
              <img
                src={bwoHero}
                alt="BWO Main Hero"
                className="relative rounded-3xl w-full max-w-2xl animate-float glass-panel"
              />
            </div>
            <CopyContractButton />
          </div>

          {/* Right Side - PFP Generator */}
          <div className="flex items-center justify-center">
            <PFPGenerator />
          </div>
        </div>

        {/* Footer Text */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground text-sm">
            Powered by cyber-ethereal technology
          </p>
        </div>
      </div>

      {/* Ambient Glow Effects */}
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-20 pointer-events-none" />
    </div>
  );
};

export default Index;
