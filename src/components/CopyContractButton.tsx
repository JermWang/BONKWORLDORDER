import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CopyContractButtonProps {
  contractAddress?: string;
}

export const CopyContractButton = ({ 
  contractAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb" 
}: CopyContractButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
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
      className="glass-panel glow-border px-8 py-6 text-lg font-bold transition-all duration-300 hover:scale-105 bg-primary/10 hover:bg-primary/20 text-foreground border-2"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-5 w-5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="mr-2 h-5 w-5" />
          Copy Contract
        </>
      )}
    </Button>
  );
};
