import Link from "next/link";
import { BookOpen, PenLine, FileText, ArrowRight, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const tools = [
  {
    href: "/assistant",
    icon: MessageSquare,
    label: "Study Assistant",
    description: "Chat with AI to clarify concepts and answer questions.",
    color: "text-primary bg-primary/10",
  },
  {
    href: "/flashcards",
    icon: BookOpen,
    label: "Flashcards",
    description: "Create decks and study with spaced repetition.",
    color: "text-primary bg-primary/10",
  },
  {
    href: "/quiz",
    icon: PenLine,
    label: "Quiz Maker",
    description: "Generate quizzes from a topic or your notes.",
    color: "text-primary bg-primary/10",
  },
  {
    href: "/essay",
    icon: FileText,
    label: "Essay",
    description: "Score and rewrite essays across 4 dimensions.",
    color: "text-primary bg-primary/10",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <p className="label-title mb-1.5">Dashboard</p>
        <h1 className="font-serif text-2xl font-bold text-foreground tracking-tight">New day, Same grind</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a tool to get started.
        </p>
      </div>

      {/* Tool cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {tools.map(({ href, icon: Icon, label, description, color }) => (
          <Link key={href} href={href} className="group block">
            <Card className="h-full hover:border-primary/40 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`w-9 h-9 rounded-md flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-0.5" />
                </div>
                <CardTitle className="mt-3">{label}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">No activity yet</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Getting started */}
      <div>
        <p className="section-title mb-4">Getting started</p>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { step: "1", text: "Create your first flashcard deck", href: "/flashcards" },
            { step: "2", text: "Generate a quiz from a topic", href: "/quiz" },
            { step: "3", text: "Grade an essay with AI feedback", href: "/essay" },
          ].map(({ step, text, href }) => (
            <Link
              key={step}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-md border border-border bg-card hover:border-primary/40 transition-colors group"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
                {step}
              </span>
              <span className="text-sm text-foreground">{text}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:text-primary transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
