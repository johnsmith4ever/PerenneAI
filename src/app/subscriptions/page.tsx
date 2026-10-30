"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      <header className="border-b border-white/10 p-4 flex items-center">
        <Link href="/dashboard" className="flex items-center gap-2 hover:bg-white/5 p-2 rounded-lg transition-colors text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span className="font-semibold">Back to Dashboard</span>
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center space-y-8">
          {/* Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-2xl" />
            <div className="relative w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-amber-400" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="text-4xl font-serif font-black text-white tracking-tight">
              Subscriptions
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                aren't available
              </span>
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed">
              PerenneAI is completely free to use for everyone — no plans, no payments, no limits beyond your daily credit allowance.
            </p>
          </div>

          {/* Info box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Guests</p>
                <p className="text-slate-500 text-sm">50,000 daily credits · Powered by Deepseek V4.1 Flash</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-green-400 mt-2 shrink-0" />
              <div>
                <p className="text-white font-semibold text-sm">Signed In</p>
                <p className="text-slate-500 text-sm">100,000 daily credits · GPT 6 Luna for Study Assistant · Deepseek V4.1 Flash for everything else</p>
              </div>
            </div>
          </div>

          <Link href="/dashboard">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 rounded-xl text-base shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
