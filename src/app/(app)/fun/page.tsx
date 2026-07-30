import { Sparkles, MousePointerClick, MonitorPlay, Palette, Gamepad2, ArrowRight, Star, Spade, Timer } from "lucide-react";
import Link from "next/link";

export default function FunPage() {
  return (
    <div className="space-y-12 animate-in fade-in pb-12">
      {/* Header */}
      <div>
        <p className="label-title mb-1.5 font-sans" style={{ fontFamily: "Anthropic Sans, var(--font-inter), sans-serif" }}>Made with love</p>
        <h1 className="page-title font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>Fun &amp; Creative</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xl leading-relaxed font-sans" style={{ fontFamily: "Anthropic Sans, var(--font-inter), sans-serif" }}>
          Take a break, play, and get creative. Life isn't all studying — these are our favourite little side projects to brighten your day.
        </p>
      </div>

      {/* Games Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <Gamepad2 className="w-4 h-4" />
          </div>
          <h2 className="text-2xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>Games</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FunCard
            title="Blackjack"
            description="A premium casino experience right in your browser. Place bets, double down, and beat the dealer with glassmorphic cards."
            icon={<Spade className="w-6 h-6" />}
            color="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            href="/fun/blackjack"
            badge="Play Now"
            internal={true}
          />
          <FunCard
            title="Potato Clicker"
            description="A ridiculously addictive clicking game. Grow your potato empire, one click at a time. Idle upgrades, prestige systems — this goes deep."
            icon={<MousePointerClick className="w-6 h-6" />}
            color="bg-amber-500/10 text-amber-500 border-amber-500/20"
            href="https://potato-clicker-cius.vercel.app"
            badge="Play Now"
          />
          <FunCard
            title="Arcade Game Hub"
            description="A whole collection of classic arcade mini-games. The perfect way to blow off steam between revision sessions."
            icon={<MonitorPlay className="w-6 h-6" />}
            color="bg-rose-500/10 text-rose-500 border-rose-500/20"
            href="https://arcadegamehub.vercel.app"
            badge="Play Now"
          />
          <FunCard
            title="10s Reaction Clicker"
            description="How fast can you click? Test your CPS (Clicks Per Second) in 10 seconds and compete on the global leaderboard."
            icon={<MousePointerClick className="w-6 h-6" />}
            color="bg-purple-500/10 text-purple-500 border-purple-500/20"
            href="/fun/clicker"
            badge="Play Now"
            internal={true}
          />
          <FunCard
            title="Blind 10s Timer"
            description="How accurate is your internal clock? Stop the timer exactly at 10.000 seconds. The timer hides itself after 2 seconds."
            icon={<Timer className="w-6 h-6" />}
            color="bg-orange-500/10 text-orange-500 border-orange-500/20"
            href="/fun/ten-seconds"
            badge="Play Now"
            internal={true}
          />
        </div>
      </section>

      {/* Creative Section */}
      <section className="space-y-6 pt-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
            <Palette className="w-4 h-4" />
          </div>
          <h2 className="text-2xl font-bold font-serif" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>Creative</h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FunCard
            title="Elimination Spinner"
            description="Input names or choices, spin the wheel, and watch as items are randomly eliminated until one remains."
            icon={<Palette className="w-6 h-6" />}
            color="bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
            href="/fun/spinner"
            badge="Spin Now"
            internal={true}
          />
        </div>
      </section>
    </div>
  );
}

function FunCard({
  title,
  description,
  icon,
  color,
  href,
  badge,
  internal,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  href?: string;
  badge?: string;
  internal?: boolean;
}) {
  const CardContent = (
    <>
      <div className="absolute top-0 right-0 p-5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
        <ArrowRight className="w-5 h-5 text-primary" />
      </div>

      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border shadow-sm ${color} transition-transform group-hover:scale-110 duration-300`}>
        {icon}
      </div>

      <h3 className="text-lg font-bold mb-2 font-serif text-foreground tracking-tight" style={{ fontFamily: "Anthropic Serif, var(--font-merriweather), serif" }}>
        {title}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed flex-1 font-sans" style={{ fontFamily: "Anthropic Sans, var(--font-inter), sans-serif" }}>
        {description}
      </p>

      <div className="mt-6 pt-4 border-t border-border/50">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
          {href ? (badge ?? "Open") : "Coming Soon"}
        </span>
      </div>
    </>
  );

  const baseClasses =
    "group relative flex flex-col p-6 rounded-2xl border border-border bg-card hover:shadow-xl transition-all duration-300 hover:border-primary/40 overflow-hidden cursor-pointer";

  if (href) {
    if (internal) {
      return (
        <Link href={href} className={baseClasses}>
          {CardContent}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={baseClasses}>
        {CardContent}
      </a>
    );
  }

  return <div className={baseClasses}>{CardContent}</div>;
}
