import { ArrowRight, QrCode } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { DashboardMock } from "./dashboard-mock";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <span className="inline-flex items-center rounded-full border border-brand-border bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand-strong">
              Built for independent restaurants
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              Run your restaurant on what&apos;s actually happening.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Orders, menu, stock, and money in one calm dashboard. Guests scan a
              QR code to order; AI handles the analysis, the math, and the
              busywork behind it.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <ButtonLink
                href="/login"
                size="lg"
                className="h-12 rounded-xl px-6 text-[15px]"
              >
                Start free <ArrowRight className="size-4" />
              </ButtonLink>
              <ButtonLink
                href="/m/7"
                size="lg"
                variant="outline"
                className="h-12 rounded-xl px-6 text-[15px]"
              >
                <QrCode className="size-4" /> See the guest menu
              </ButtonLink>
            </div>

            <p className="mt-6 text-[13px] text-muted-foreground">
              No app for guests · Live menu &amp; QR codes · Set up in an
              afternoon
            </p>
          </div>

          {/* Dashboard mock */}
          <div className="lg:pl-4">
            <DashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
}
