"use client";

// The kitchen companion app. Lives outside the dashboard: a shared device in
// the kitchen signs in once with the restaurant's kitchen code, then workers
// clock in/out with their personal PIN and run the live order queue.

import * as React from "react";
import { toast } from "sonner";
import {
  ChefHat,
  ClipboardList,
  Clock3,
  Loader2,
  LogOut,
  UserRound,
} from "lucide-react";
import type { Order, OrderStatus } from "@/lib/orders/types";
import { useNow } from "@/lib/use-now";
import { sinceLabel } from "@/lib/workers/time";
import { initialsFrom } from "@/lib/auth/initials";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "@/components/dashboard/order-card";
import { Logo } from "@/components/landing/logo";

interface KitchenRestaurant {
  id: string;
  name: string;
}

type Phase =
  | { kind: "checking" }
  | { kind: "signedOut" }
  | { kind: "app"; restaurant: KitchenRestaurant };

export default function KitchenPage() {
  const [phase, setPhase] = React.useState<Phase>({ kind: "checking" });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/kitchen/session");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setPhase({ kind: "app", restaurant: data.restaurant });
        } else {
          setPhase({ kind: "signedOut" });
        }
      } catch {
        if (!cancelled) setPhase({ kind: "signedOut" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (phase.kind === "checking") {
    return (
      <main className="grid min-h-dvh place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (phase.kind === "signedOut") {
    return (
      <CodeEntry
        onSignedIn={(restaurant) => setPhase({ kind: "app", restaurant })}
      />
    );
  }

  return (
    <KitchenApp
      restaurant={phase.restaurant}
      onSignOut={async () => {
        await fetch("/api/kitchen/session", { method: "DELETE" });
        setPhase({ kind: "signedOut" });
      }}
    />
  );
}

function CodeEntry({
  onSignedIn,
}: {
  onSignedIn: (restaurant: KitchenRestaurant) => void;
}) {
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !code.trim()) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/kitchen/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't sign in.");
        return;
      }
      onSignedIn(data.restaurant);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-5">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Logo href={null} />
        </div>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-md">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <ChefHat className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold">Kitchen app</h1>
              <p className="text-[13px] text-muted-foreground">
                Clock in and work the order queue.
              </p>
            </div>
          </div>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
            <div>
              <Label htmlFor="kitchen-code" className="mb-1.5 block">
                Kitchen code
              </Label>
              <Input
                id="kitchen-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="BELLA-1234"
                autoComplete="off"
                className="h-12 text-center text-lg font-semibold tracking-widest"
              />
              <p className="mt-1.5 text-[12px] text-muted-foreground">
                Your manager finds this on the dashboard&apos;s Team page.
              </p>
            </div>
            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={pending || !code.trim()}
              className="h-12 rounded-xl text-[15px] font-semibold"
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Enter kitchen"
              )}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

type Tab = "clock" | "orders";

function KitchenApp({
  restaurant,
  onSignOut,
}: {
  restaurant: KitchenRestaurant;
  onSignOut: () => void;
}) {
  const [tab, setTab] = React.useState<Tab>("clock");

  return (
    <main className="min-h-dvh bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-bold text-brand-foreground">
              {initialsFrom(restaurant.name)}
            </span>
            <div className="leading-tight">
              <div className="text-sm font-bold">{restaurant.name}</div>
              <div className="text-[11px] text-muted-foreground">Kitchen</div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onSignOut}>
            <LogOut className="size-3.5" /> Sign out
          </Button>
        </div>
        <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-3">
          <TabButton
            active={tab === "clock"}
            onClick={() => setTab("clock")}
            icon={<Clock3 className="size-4" />}
            label="Time clock"
          />
          <TabButton
            active={tab === "orders"}
            onClick={() => setTab("orders")}
            icon={<ClipboardList className="size-4" />}
            label="Orders"
          />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-5">
        {tab === "clock" ? <ClockTab /> : <OrdersTab />}
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
        active
          ? "bg-brand text-brand-foreground"
          : "bg-muted text-muted-foreground hover:bg-secondary",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Time clock — PIN-first. The device never sees a worker roster: the worker
// types their PIN and the server resolves who it belongs to and toggles
// their shift. (Names/roles/contacts stay private to the dashboard.)
// ---------------------------------------------------------------------------

function ClockTab() {
  const [pin, setPin] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [last, setLast] = React.useState<{
    firstName: string;
    action: "in" | "out";
    at: string;
  } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || pin.length !== 4) return;
    setPending(true);
    try {
      const res = await fetch("/api/kitchen/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Couldn't clock you in.");
        setPin("");
        return;
      }
      const firstName: string = data.worker?.firstName ?? "there";
      const action: "in" | "out" = data.action === "out" ? "out" : "in";
      toast.success(
        action === "in"
          ? `Welcome, ${firstName} — you're clocked in.`
          : `See you, ${firstName} — you're clocked out.`,
      );
      setLast({ firstName, action, at: sinceLabel(new Date().toISOString()) });
      setPin("");
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="grid size-12 place-items-center rounded-xl bg-brand-soft text-brand-strong">
          <UserRound className="size-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold tracking-tight">Time clock</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Enter your 4-digit PIN to clock in or out. Your shift toggles
          automatically.
        </p>
        <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="••••"
            aria-label="PIN"
            className="h-14 text-center text-2xl font-bold tracking-[0.5em]"
          />
          <Button
            type="submit"
            disabled={pin.length !== 4 || pending}
            className="h-12 rounded-xl text-[15px] font-semibold"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Clock in / out"}
          </Button>
        </form>
      </div>

      {last && (
        <div
          className={cn(
            "mt-3 rounded-2xl border px-4 py-3 text-sm",
            last.action === "in"
              ? "border-green-200 bg-green-50/60 text-green-800"
              : "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          {last.firstName} clocked {last.action} at {last.at}.
        </div>
      )}

      <p className="mt-3 text-center text-[12px] text-muted-foreground">
        Forgot your PIN? Ask your manager — they can set a new one on the Team
        page.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const ACTIVE_STATUSES: OrderStatus[] = ["new", "preparing", "ready"];

function OrdersTab() {
  const [orders, setOrders] = React.useState<Order[] | null>(null);
  const now = useNow();

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/kitchen/orders", { cache: "no-store" });
      if (res.status === 401) {
        window.location.reload();
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders ?? []);
    } catch {
      // next poll retries
    }
  }, []);

  React.useEffect(() => {
    // Polling an external system; setState happens in the async continuation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const advance = React.useCallback(
    async (id: string, status: OrderStatus) => {
      setOrders(
        (prev) =>
          prev?.map((o) => (o.id === id ? { ...o, status } : o)) ?? prev,
      );
      try {
        const res = await fetch(`/api/kitchen/orders/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
      } catch {
        load();
      }
    },
    [load],
  );

  if (!orders) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 rounded-xl" />
        ))}
      </div>
    );
  }

  const active = orders
    .filter((o) => ACTIVE_STATUSES.includes(o.status))
    .sort(
      (a, b) =>
        ACTIVE_STATUSES.indexOf(a.status) - ACTIVE_STATUSES.indexOf(b.status) ||
        a.createdAt.localeCompare(b.createdAt),
    );
  const servedToday = orders.filter((o) => o.status === "served").length;

  if (active.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
        <ClipboardList className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">Queue&apos;s clear</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          New orders appear here the moment a guest sends them.
          {servedToday > 0 && ` ${servedToday} served so far.`}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {active.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onAdvance={advance}
          now={now}
          escalate
        />
      ))}
    </div>
  );
}
