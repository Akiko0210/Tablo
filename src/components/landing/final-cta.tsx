import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button-link";
import { Logo } from "./logo";

export function FinalCta() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="rounded-3xl bg-foreground px-6 py-16 text-center text-background md:px-16">
        <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
          See your restaurant clearly — starting today
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-background/70">
          Set up the menu and QR codes in an afternoon. The rest gets smarter as
          you serve.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink
            href="/signup"
            size="lg"
            className="h-12 rounded-xl px-7 text-[15px]"
          >
            Start free <ArrowRight className="size-4" />
          </ButtonLink>
          <ButtonLink
            href="/m/7"
            size="lg"
            variant="outline"
            className="h-12 rounded-xl border-background/25 bg-transparent px-7 text-[15px] text-background hover:bg-background/10 hover:text-background"
          >
            Book a demo
          </ButtonLink>
        </div>
        <p className="mt-6 text-[13px] text-background/60">
          No credit card · Cancel anytime
        </p>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo href={null} />
          <span className="hidden sm:inline">·</span>
          <span>Restaurant operations, in one calm place.</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hover:text-foreground">
            Features
          </a>
          <a href="#menu" className="hover:text-foreground">
            Product
          </a>
          <a href="#pricing" className="hover:text-foreground">
            Pricing
          </a>
        </div>
        <div>© {new Date().getFullYear()} Tablo</div>
      </div>
    </footer>
  );
}
