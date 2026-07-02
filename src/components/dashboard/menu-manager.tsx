"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { MenuItemRecord } from "@/lib/menu/store";
import type { GenerationJob } from "@/lib/menu/generation-store";
import type { Category } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface MenuPayload {
  items: MenuItemRecord[];
  categories: Category[];
  generation: GenerationJob;
}

interface EditorState {
  open: boolean;
  /** Null = creating a new item. */
  item: MenuItemRecord | null;
}

export function MenuManager() {
  const [data, setData] = React.useState<MenuPayload | null>(null);
  const [editor, setEditor] = React.useState<EditorState>({
    open: false,
    item: null,
  });

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) return;
      setData(await res.json());
    } catch {
      // Network hiccup — the next poll retries.
    }
  }, []);

  React.useEffect(() => {
    // Polling an external system; setState happens in the async continuation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Poll while the AI analysis runs so items appear as soon as it finishes.
  const generating = data?.generation.status === "running";
  React.useEffect(() => {
    if (!generating) return;
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [generating, load]);

  async function regenerate() {
    const res = await fetch("/api/menu/generate", { method: "POST" });
    if (res.ok) {
      toast("Analyzing your photos…");
      load();
    }
  }

  async function toggleSoldOut(item: MenuItemRecord) {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soldOut: !item.soldOut }),
    });
    if (res.ok) load();
    else toast.error("Couldn't update the item.");
  }

  async function remove(item: MenuItemRecord) {
    const res = await fetch(`/api/menu/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`Deleted “${item.name}”.`);
      load();
    } else {
      toast.error("Couldn't delete the item.");
    }
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const { items, generation } = data;
  const grouped = groupByCategory(items);

  return (
    <div>
      <GenerationBanner job={generation} onRetry={regenerate} />

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          {items.length} item{items.length === 1 ? "" : "s"} · changes appear on
          guests&apos; menus instantly
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={regenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            Generate from photos
          </Button>
          <Button size="sm" onClick={() => setEditor({ open: true, item: null })}>
            <Plus className="size-3.5" /> Add item
          </Button>
        </div>
      </div>

      {items.length === 0 && !generating ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium">No menu items yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            Generate items from the photos you uploaded during signup, or add
            your first dish by hand.
          </p>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-6">
          {grouped.map(([category, categoryItems]) => (
            <section key={category}>
              <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                {category}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {categoryItems.map((item, i) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      i > 0 && "border-t border-border",
                      item.soldOut && "opacity-60",
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-lg">
                      {item.emoji ?? "🍽️"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {item.name}
                        </span>
                        {item.source === "ai" && (
                          <Badge
                            variant="outline"
                            className="gap-1 border-brand/40 text-[10px] text-brand-strong"
                          >
                            <Sparkles className="size-2.5" /> AI
                          </Badge>
                        )}
                        {item.price === 0 && (
                          <Badge variant="outline" className="text-[10px]">
                            Set a price
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-[13px] text-muted-foreground">
                        {item.description || "No description"}
                      </p>
                    </div>
                    <span className="w-16 text-right text-sm font-semibold tabular-nums">
                      {formatMoney(item.price)}
                    </span>
                    <div className="flex items-center gap-1.5 pl-2">
                      <div className="flex flex-col items-center gap-0.5">
                        <Switch
                          checked={!item.soldOut}
                          onCheckedChange={() => toggleSoldOut(item)}
                          aria-label={`${item.name} availability`}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {item.soldOut ? "Sold out" : "Available"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${item.name}`}
                        onClick={() => setEditor({ open: true, item })}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${item.name}`}
                        onClick={() => remove(item)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ItemEditorSheet
        state={editor}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        onSaved={() => {
          setEditor({ open: false, item: null });
          load();
        }}
      />
    </div>
  );
}

function groupByCategory(items: MenuItemRecord[]): [string, MenuItemRecord[]][] {
  const map = new Map<string, MenuItemRecord[]>();
  for (const item of items) {
    const label = labelFromCategoryId(item.categoryId);
    const list = map.get(label) ?? [];
    list.push(item);
    map.set(label, list);
  }
  return [...map.entries()];
}

function labelFromCategoryId(id: string): string {
  return id
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

function GenerationBanner({
  job,
  onRetry,
}: {
  job: GenerationJob;
  onRetry: () => void;
}) {
  if (job.status === "idle") return null;

  if (job.status === "running") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3">
        <Loader2 className="size-4 shrink-0 animate-spin text-brand" />
        <div className="text-[13px]">
          <span className="font-semibold text-brand-strong">
            Claude is reading your menu photos.
          </span>{" "}
          <span className="text-muted-foreground">
            {job.message ?? "This usually takes under a minute."}
          </span>
        </div>
      </div>
    );
  }

  if (job.status === "failed" || job.status === "skipped") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 px-4 py-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 text-[13px] text-muted-foreground">
          {job.message ?? "Photo analysis didn't run."}
        </div>
        {job.status === "failed" && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  }

  // done
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-brand/30 bg-brand-soft px-4 py-3">
      <Sparkles className="size-4 shrink-0 text-brand" />
      <div className="text-[13px]">
        <span className="font-semibold text-brand-strong">{job.message}</span>{" "}
        <span className="text-muted-foreground">
          Review names, descriptions, and prices below — dishes photographed
          without a menu card come in at $0.
        </span>
      </div>
    </div>
  );
}

interface EditorFields {
  name: string;
  description: string;
  price: string;
  category: string;
  emoji: string;
}

function ItemEditorSheet({
  state,
  onOpenChange,
  onSaved,
}: {
  state: EditorState;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { open, item } = state;
  const [fields, setFields] = React.useState<EditorFields>(emptyFields());
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // Reset the form to the item being edited each time the sheet opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFields(
        item
          ? {
              name: item.name,
              description: item.description,
              price: String(item.price),
              category: labelFromCategoryId(item.categoryId),
              emoji: item.emoji ?? "",
            }
          : emptyFields(),
      );
    }
  }, [open, item]);

  function set<K extends keyof EditorFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const valid =
    fields.name.trim().length > 0 &&
    fields.category.trim().length > 0 &&
    fields.price.trim() !== "" &&
    Number.isFinite(Number(fields.price)) &&
    Number(fields.price) >= 0;

  async function save() {
    if (!valid || pending) return;
    setPending(true);
    const payload = {
      name: fields.name,
      description: fields.description,
      price: Number(fields.price),
      category: fields.category,
      emoji: fields.emoji || undefined,
    };
    try {
      const res = item
        ? await fetch(`/api/menu/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/menu", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't save the item.");
        return;
      }
      toast.success(item ? "Item updated." : "Item added.");
      onSaved();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{item ? `Edit ${item.name}` : "Add menu item"}</SheetTitle>
          <SheetDescription>
            {item
              ? "Changes go live on guests' menus immediately."
              : "New items appear on guests' menus immediately."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div>
            <Label htmlFor="mi-name" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="mi-name"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Margherita"
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mi-price" className="mb-1.5 block">
                Price
              </Label>
              <Input
                id="mi-price"
                type="number"
                min={0}
                step="0.01"
                value={fields.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="14"
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="mi-emoji" className="mb-1.5 block">
                Emoji <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="mi-emoji"
                value={fields.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                placeholder="🍕"
                className="h-10"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mi-category" className="mb-1.5 block">
              Category
            </Label>
            <Input
              id="mi-category"
              value={fields.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Pizza"
              className="h-10"
            />
          </div>

          <div>
            <Label htmlFor="mi-description" className="mb-1.5 block">
              Description
            </Label>
            <Textarea
              id="mi-description"
              value={fields.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="San Marzano tomatoes, fior di latte, basil."
              className="min-h-20 resize-none"
              maxLength={300}
            />
          </div>

          <Button
            onClick={save}
            disabled={!valid || pending}
            className="h-11 rounded-xl font-semibold"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Saving…
              </>
            ) : item ? (
              "Save changes"
            ) : (
              "Add item"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function emptyFields(): EditorFields {
  return { name: "", description: "", price: "", category: "", emoji: "" };
}
