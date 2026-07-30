"use client";

import { useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DonationPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("success") === "true") {
        alert("Thank you so much for your donation! You're a legend!");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleDonate = async (amount: number, productId: string) => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, productId })
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to connect to Stripe: " + data.message);
      }
    } catch (e) {
      console.error(e);
      alert("Something went wrong connecting to Stripe.");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in">
      <div className="text-center mt-12">
        <h1 className="text-4xl font-bold font-serif flex items-center justify-center gap-3 mb-4" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
          <Heart className="w-10 h-10 text-pink-500 fill-pink-500" /> Support Perenne
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Help cover server costs and API usage to keep Perenne running smoothly. Your donation means the world to us!
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-3xl p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white dark:bg-black rounded-full flex items-center justify-center shadow-lg mb-6 border border-border">
            <Heart className="w-10 h-10 text-pink-500 fill-pink-500" />
          </div>
          
          <h2 className="text-2xl font-bold mb-3">Support Perenne</h2>
          <p className="text-base text-muted-foreground mb-10">
            Help cover server costs and API usage to keep Perenne running smoothly. Every penny helps!
          </p>

          <div className="w-full space-y-4">
            <Button 
              onClick={() => handleDonate(40, "prod_UyuL7uhkXiAweA")}
              variant="outline" 
              className="w-full h-14 rounded-xl border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 group font-bold text-lg"
            >
              40p
            </Button>
            
            <Button 
              onClick={() => handleDonate(50, "prod_UyuKNoD3dVEJxW")}
              variant="outline" 
              className="w-full h-14 rounded-xl border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 group font-bold text-lg"
            >
              50p
            </Button>
            
            <Button 
              onClick={() => handleDonate(100, "prod_UyuH9s1lgDfznP")}
              className="w-full h-14 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg group border-none font-bold text-lg tracking-wide"
            >
              £1.00
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
