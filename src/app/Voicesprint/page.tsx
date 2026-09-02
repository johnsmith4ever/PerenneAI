import { Metadata } from 'next';
import Link from 'next/link';
import { Mic } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Voice Sprint Access',
  description: 'Access the Voice Sprint application.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function VoiceSprintPage() {
  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center font-sans overflow-hidden relative selection:bg-purple-500/30">
      
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none"></div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none z-0 mix-blend-screen opacity-60 animate-pulse duration-3000"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/20 rounded-full blur-[80px] pointer-events-none z-0 mix-blend-screen opacity-80"></div>

      <div className="relative z-10 flex flex-col items-center gap-12 group">
        <Link 
          href="https://voice-sprint.vercel.app/"
          className="relative flex items-center justify-center p-12 rounded-full transition-all duration-500 hover:scale-110"
        >
          {/* Animated rings around the mic */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
          <div className="absolute inset-4 rounded-full border-2 border-blue-500/40 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] animation-delay-1000"></div>
          
          {/* Main button background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 opacity-20 group-hover:opacity-40 blur-xl transition-opacity duration-500"></div>
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/20 to-purple-600/20 backdrop-blur-md border border-white/10 shadow-[0_0_80px_-20px_rgba(147,51,234,0.5)] group-hover:shadow-[0_0_120px_-20px_rgba(147,51,234,0.7)] transition-all duration-500"></div>
          
          {/* Icon */}
          <Mic className="w-32 h-32 text-white relative z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] group-hover:text-purple-200 transition-colors duration-500" strokeWidth={1.5} />
        </Link>
        
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 drop-shadow-sm uppercase text-center">
            Voice Sprint
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-md text-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            Click the microphone to begin
          </p>
        </div>
      </div>
    </div>
  );
}
