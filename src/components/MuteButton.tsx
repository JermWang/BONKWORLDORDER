import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { isMuted, toggleMuted, onMuteChange } from "@/lib/mute";

export const MuteButton = () => {
  const [muted, setMuted] = useState<boolean>(isMuted());
  useEffect(() => {
    const off = onMuteChange(setMuted);
    return () => off();
  }, []);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-green-500 hover:text-green-400 glass-panel"
      onClick={() => toggleMuted()}
      aria-pressed={muted}
      aria-label={muted ? "Unmute" : "Mute"}
    >
      {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
    </Button>
  );
};

export default MuteButton;


