import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ApiErrorFallbackProps {
  message?: string;
  onRetry: () => void;
}

export function ApiErrorFallback({ 
  message = "Something went wrong communicating with the server.", 
  onRetry 
}: ApiErrorFallbackProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8 rounded-2xl border border-destructive/20 bg-destructive/5 text-center animate-in fade-in">
      <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Oops! An error occurred.</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {message}
      </p>
      <Button 
        onClick={onRetry} 
        variant="outline" 
        className="gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <RotateCcw className="w-4 h-4" />
        Try Again
      </Button>
    </div>
  );
}
