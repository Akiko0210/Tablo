import {
  QrCode,
  LineChart,
  Boxes,
  Wallet,
  Phone,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  icon: LucideIcon;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: QrCode,
    title: "Digital menu via QR",
    body: "Every table gets a QR code that opens a fast mobile menu — no app. Change a price or mark a dish sold out and it updates instantly for every guest.",
  },
  {
    icon: LineChart,
    title: "AI product analysis",
    body: "Best and worst sellers, hourly trends, and which dishes quietly lose money — surfaced as plain language, not raw tables.",
  },
  {
    icon: Boxes,
    title: "Supply management",
    body: "A specific shopping list — what to reorder, how much, and when — from sales pace and what's left. Alerts come before the shortage, not after.",
  },
  {
    icon: Wallet,
    title: "AI accountant",
    body: "Revenue, expenses, and profit tracked automatically. Running P&L, cash flow, and clean monthly summaries to hand to a human accountant.",
  },
  {
    icon: Phone,
    title: "Voice agent",
    body: "An AI phone assistant that takes reservations and orders, quotes hours and wait times, and logs every call — catching the ones nobody can pick up mid-rush.",
  },
  {
    icon: BarChart3,
    title: "AI analysis graphs",
    body: "The visual layer over everything — sales over time, peak hours, category mix, and forecasts — each chart with a short written takeaway underneath.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="max-w-2xl">
        <div className="text-[13px] font-semibold uppercase tracking-wider text-brand-strong">
          One platform
        </div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Six ways it earns its place
        </h2>
        <p className="mt-3 text-lg text-muted-foreground">
          They aren&apos;t separate tools — they share one stream of data. Each
          gets more accurate as the others are used.
        </p>
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
              {f.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
