import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function StyleGuide() {
  return (
    <main className="max-w-3xl mx-auto p-8 space-y-14">
      <header className="space-y-2">
        <p className="label-title">Perenne</p>
        <h1 className="page-title">Design System</h1>
        <p className="text-sm text-muted-foreground max-w-xl">
          Anthropic-inspired aesthetic: warm off-white backgrounds, muted terracotta
          accents, and a blend of serif headings with a clean sans body.
        </p>
      </header>

      {/* Typography */}
      <section className="space-y-5">
        <div className="border-b border-border pb-1.5">
          <p className="section-title">Typography</p>
        </div>
        <div className="space-y-5">
          <div>
            <p className="page-title">Page Title (Merriweather 24px bold)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used as the primary heading on each page
            </p>
          </div>
          <div>
            <p className="section-title">Section Title (Merriweather 18px semibold)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used for sub-sections within a page
            </p>
          </div>
          <div>
            <p className="label-title">Label title (Inter 12px caps)</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used for overlines and form labels
            </p>
          </div>
          <div className="max-w-2xl pt-2">
            <p className="text-sm leading-relaxed text-foreground">
              Body Text (Inter): The Perenne platform uses Inter for highly legible
              paragraph text. This humanist touch ensures reading long passages—like
              essays or detailed flashcards—feels effortless and calm.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Inter, 14px, relaxed leading
            </p>
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-5">
        <div className="border-b border-border pb-1.5">
          <p className="section-title">Colors</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { bg: "bg-background", name: "Background", desc: "Warm off-white" },
            { bg: "bg-primary", name: "Primary", desc: "Muted terracotta" },
            { bg: "bg-secondary", name: "Secondary", desc: "Soft clay/tan" },
            { bg: "bg-muted", name: "Muted", desc: "Gray-beige" },
          ].map(({ bg, name, desc }) => (
            <div key={name} className="space-y-2">
              <div className={`h-16 w-full rounded-md border border-border ${bg}`} />
              <div className="text-sm">
                <p className="font-medium">{name}</p>
                <p className="text-muted-foreground text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-5">
        <div className="border-b border-border pb-1.5">
          <p className="section-title">Buttons</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Inputs */}
      <section className="space-y-5">
        <div className="border-b border-border pb-1.5">
          <p className="section-title">Inputs</p>
        </div>
        <div className="max-w-xs space-y-3">
          <Input placeholder="Email address" />
          <Input placeholder="Password" type="password" />
          <Input placeholder="Disabled" disabled />
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-5">
        <div className="border-b border-border pb-1.5">
          <p className="section-title">Cards</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>A-Level Biology</CardTitle>
              <CardDescription>Cellular Respiration deck · 24 cards</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/80">
                Covers glycolysis, the Krebs cycle, and the electron transport chain,
                aligned to the AQA specification.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Study Deck</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Essay Grader</CardTitle>
              <CardDescription>Upload or paste your essay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input placeholder="Essay Title" />
              <div className="min-h-[80px] w-full rounded-md border border-border px-3 py-2 text-sm text-muted-foreground">
                Paste your essay here…
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button variant="outline">Cancel</Button>
              <Button>Grade Essay</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </main>
  );
}
