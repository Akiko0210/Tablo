"use client";

import * as React from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { Download, ExternalLink, Printer } from "lucide-react";
import { tableMenuUrl, tableMenuPath } from "@/lib/menu-url";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Skeleton } from "@/components/ui/skeleton";

/** Per-restaurant QR management grid rendered inside the dashboard. The slug
 * and table count come from the signed-in restaurant's record. */
export function QrGrid({
  slug,
  restaurantId,
  tableCount,
}: {
  slug: string;
  restaurantId: string;
  tableCount: number;
}) {
  // Live origin without setState-in-effect; "" during SSR, real origin after.
  const origin = React.useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => "",
  );

  const tables = Array.from({ length: Math.max(1, tableCount) }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {tableCount} tables · change the count in{" "}
          <Link href="/dashboard/settings" className="underline">
            Settings
          </Link>
        </p>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" /> Print all
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) =>
          origin ? (
            <QrCard
              key={table}
              table={table}
              origin={origin}
              slug={slug}
              restaurantId={restaurantId}
            />
          ) : (
            <Skeleton key={table} className="h-[300px] rounded-2xl" />
          ),
        )}
      </div>
    </div>
  );
}

function QrCard({
  table,
  origin,
  slug,
  restaurantId,
}: {
  table: number;
  origin: string;
  slug: string;
  restaurantId: string;
}) {
  const url = tableMenuUrl(origin, slug, table);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  function download() {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${restaurantId}-table-${table}-qr.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex w-full items-center justify-between">
        <span className="text-sm font-semibold">Table {table}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          {tableMenuPath(slug, table)}
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

      <div className="flex w-full gap-2 print:hidden">
        <Button variant="outline" size="sm" className="flex-1" onClick={download}>
          <Download className="size-3.5" /> PNG
        </Button>
        <ButtonLink
          href={tableMenuPath(slug, table)}
          size="sm"
          className="flex-1"
        >
          <ExternalLink className="size-3.5" /> Open
        </ButtonLink>
      </div>
    </div>
  );
}
