import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Tier } from "@/hooks/use-subscription";

export function PaywallOverlay({ tierRequired, title, description }: { tierRequired: Tier, title: string, description: string }) {
  const router = useRouter();

  return (
    <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center rounded-3xl overflow-hidden border border-border">
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div className="relative z-10 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)]">
        <Lock className="w-8 h-8 text-primary" />
      </div>
      <h2 className="relative z-10 text-3xl font-serif font-black text-foreground mb-3">{title}</h2>
      <p className="relative z-10 text-muted-foreground mb-8 max-w-md leading-relaxed">{description}</p>
      <Button 
        size="lg" 
        onClick={() => router.push("/subscriptions")}
        className="relative z-10 font-bold tracking-wide shadow-lg hover:scale-105 transition-transform"
      >
        Upgrade to {tierRequired}
      </Button>
    </div>
  );
}
