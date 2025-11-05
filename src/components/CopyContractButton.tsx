import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyContractButtonProps {
  contractAddress?: string;
  className?: string;
}

export const CopyContractButton = ({ 
  contractAddress = "",
  className,
}: CopyContractButtonProps) => {
  const [copied, setCopied] = useState(false);
  const hasAddress = typeof contractAddress === 'string' && contractAddress.startsWith('0x') && contractAddress.length >= 10;
  const preview = hasAddress ? `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : "coming soon";

  const handleCopy = async () => {
    try {
      if (!hasAddress) {
        toast.message("Contract address coming soon");
        return;
      }
      await navigator.clipboard.writeText(contractAddress);
      setCopied(true);
      toast.success("Contract address copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy address");
    }
  };

  return (
    <Button
      onClick={handleCopy}
      className={cn(
        "glass-panel glow-border px-8 py-6 text-lg font-bold transition-all duration-300 hover:scale-105 bg-primary/10 hover:bg-primary/20 text-foreground border-2",
        className,
      )}
    >
      {copied ? (
        <>
          <Check className="mr-2 h-5 w-5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="mr-2 h-5 w-5" />
          {preview}
        </>
      )}
    </Button>
  );
};
