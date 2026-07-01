"use client";

import * as React from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { Download, ExternalLink, QrCode, ArrowLeft } from "lucide-react";
import { restaurant } from "@/lib/menu-data";
import { tableMenuUrl, tableMenuPath } from "@/lib/menu-url";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function QrPage() {
  // Read the live origin without a setState-in-effect. useSyncExternalStore
  // returns "" during SSR/hydration, then the real origin on the client — so a
  // scanned code always points at whatever host is actually serving the app.
  const origin = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );
  const [tables, setTables] = React.useState(restaurant.tableCount);

  const tableList = Array.from({ length: Math.max(1, tables) }, (_, i) => i + 1);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to home
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-[13px] font-medium text-brand-strong">
            <QrCode className="size-3.5" /> Table QR codes
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{restaurant.name}</h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
            Print one code per table. A guest scans it with their phone camera —
            no app, no login — and lands straight on that table&apos;s menu.
          </p>
        </div>

        <div className="w-40">
          <Label htmlFor="tables" className="mb-1.5 block text-[13px]">
            Number of tables
          </Label>
          <Input
            id="tables"
            type="number"
            min={1}
            max={100}
            value={tables}
            onChange={(e) =>
              setTables(Math.min(100, Math.max(1, Number(e.target.value) || 1)))
            }
            className="h-10"
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tableList.map((table) =>
          origin ? (
            <QrCard key={table} table={table} origin={origin} />
          ) : (
            <Skeleton key={table} className="h-[300px] rounded-2xl" />
          ),
        )}
      </div>
    </main>
  );
}

function QrCard({ table, origin }: { table: number; origin: string }) {
  const url = tableMenuUrl(origin, table);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  function download() {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${restaurant.id}-table-${table}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold">Table {table}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {tableMenuPath(table)}
        </span>
      </div>

      <div
        ref={wrapRef}
        className="my-4 rounded-xl border border-border bg-white p-3"
      >
        <QRCodeCanvas
          value={url}
          size={168}
          level="M"
          marginSize={2}
          fgColor="#18181b"
          bgColor="#ffffff"
          title={`QR code for Table ${table}`}
        />
      </div>

      <p className="mb-3 w-full truncate text-center text-[11px] text-muted-foreground">
        {url}
      </p>

      <div className="flex w-full gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={download}>
          <Download className="size-3.5" /> PNG
        </Button>
        <ButtonLink href={tableMenuPath(table)} size="sm" className="flex-1">
          <ExternalLink className="size-3.5" /> Open
        </ButtonLink>
      </div>
    </div>
  );
}
