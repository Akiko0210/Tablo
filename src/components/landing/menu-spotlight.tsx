import { Check, Plus, ArrowRight, QrCode } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";

const POINTS = [
  {
    title: "Always current",
    body: "Sold-out and price changes appear immediately on every phone in the room.",
  },
  {
    title: "No barriers",
    body: "Works on any phone browser — nothing to install, no login.",
  },
  {
    title: "Your brand, not ours",
    body: "Guests see your logo, photos, and accent colour.",
  },
];

const PREVIEW_ITEMS = [
  { name: "Margherita", meta: "San Marzano, fior di latte, basil", price: "$14" },
  { name: "Diavola", meta: "Spicy salami, chili, mozzarella", price: "$16" },
];

export function MenuSpotlight() {
  return (
    <section id="menu" className="border-y border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 md:py-28 lg:grid-cols-2">
        {/* Menu preview */}
        <div className="order-2 lg:order-1">
          <div className="mx-auto max-w-[340px] rounded-[28px] border border-border bg-card p-4 shadow-xl">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground">
                B
              </span>
              <div className="leading-tight">
                <div className="text-sm font-bold">Bella Trattoria</div>
                <div className="text-[11px] text-muted-foreground">
                  Table 7 · Now serving
                </div>
              </div>
            </div>

            <div className="mt-3 flex gap-1.5">
              {["Pizza", "Pasta", "Drinks"].map((c, i) => (
                <span
                  key={c}
                  className={
                    i === 0
                      ? "rounded-full bg-brand px-2.5 py-1 text-[11px] font-medium text-brand-foreground"
                      : "rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                  }
                >
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-col gap-2">
              {PREVIEW_ITEMS.map((it) => (
                <div
                  key={it.name}
                  className="flex items-center gap-3 rounded-xl border border-border p-2.5"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-muted to-secondary text-lg">
                    🍕
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold">{it.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {it.meta}
                    </div>
                  </div>
                  <div className="text-[13px] font-semibold">{it.price}</div>
                  <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-foreground">
                    <Plus className="size-3.5" />
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-3 rounded-xl border border-border p-2.5 opacity-60">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-muted text-lg grayscale">
                  🧀
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold">Quattro Formaggi</div>
                  <div className="text-[11px] text-muted-foreground">Sold out</div>
                </div>
                <div className="text-[13px] font-semibold text-muted-foreground">
                  $17
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="order-1 lg:order-2">
          <div className="text-[13px] font-semibold uppercase tracking-wider text-brand-strong">
            The menu guests see
          </div>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            Scan, browse, order — no app, no login
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            It mirrors your dashboard in real time, so a price change or a
            sold-out flag shows up instantly on every phone in the room.
          </p>

          <ul className="mt-7 flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                <div>
                  <div className="font-semibold">{p.title}</div>
                  <div className="text-[14px] text-muted-foreground">{p.body}</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/m/7" className="h-12 rounded-xl px-6 text-[15px]">
              Try the live menu <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="/qr"
              variant="outline"
              className="h-12 rounded-xl px-6 text-[15px]"
            >
              <QrCode className="size-4" /> Get table QR codes
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
