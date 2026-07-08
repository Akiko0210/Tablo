"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ImageIcon,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { MenuItemRecord } from "@/lib/menu/store";
import type { GenerationJob } from "@/lib/menu/generation-store";
import { validateUploadFile } from "@/lib/uploads/limits";
import type { Category, ModifierGroup } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

// Last fetched menu, shared across mounts so switching back to this tab
// renders instantly instead of re-showing skeletons (a fresh fetch still
// runs in the background on every mount).
let cachedMenu: MenuPayload | null = null;

export function MenuManager() {
  const [data, setData] = React.useState<MenuPayload | null>(cachedMenu);
  const [editor, setEditor] = React.useState<EditorState>({
    open: false,
    item: null,
  });

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/menu");
      if (!res.ok) return;
      const payload = (await res.json()) as MenuPayload;
      cachedMenu = payload;
      setData(payload);
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
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- user upload served from /api/uploads
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="size-10 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-muted to-secondary text-muted-foreground">
                        <ImageIcon className="size-4" strokeWidth={1.5} />
                      </span>
                    )}
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

      <ItemEditorDialog
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

// Draft rows for the guest-facing choice groups. `key` keeps React list
// identity stable across edits; `id` preserves an existing group/option's id
// (empty for a row the user just added — the store assigns one on save).
interface OptionDraft {
  key: number;
  id: string;
  label: string;
  priceDelta: string;
  note: string;
}

interface GroupDraft {
  key: number;
  id: string;
  label: string;
  min: string;
  max: string;
  required: boolean;
  options: OptionDraft[];
}

interface EditorFields {
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  groups: GroupDraft[];
}

/** Mirrors MAX_GROUPS in src/lib/menu/validate.ts. */
const MAX_GROUPS = 6;

let optionKeySeq = 0;
const nextKey = () => (optionKeySeq += 1);

function optionDraftFrom(o: ModifierGroup["options"][number]): OptionDraft {
  return {
    key: nextKey(),
    id: o.id,
    label: o.label,
    priceDelta: String(o.priceDelta),
    note: o.note ?? "",
  };
}

function groupDraftFrom(g: ModifierGroup): GroupDraft {
  return {
    key: nextKey(),
    id: g.id,
    label: g.label,
    min: String(g.min),
    max: String(g.max),
    required: g.required,
    options: g.options.map(optionDraftFrom),
  };
}

function emptyOptionDraft(): OptionDraft {
  return { key: nextKey(), id: "", label: "", priceDelta: "0", note: "" };
}

function emptyGroupDraft(): GroupDraft {
  return {
    key: nextKey(),
    id: "",
    label: "",
    min: "0",
    max: "1",
    required: false,
    options: [emptyOptionDraft()],
  };
}

function ItemEditorDialog({
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
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      // Reset the form to the item being edited each time the dialog opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFields(
        item
          ? {
              name: item.name,
              description: item.description,
              price: String(item.price),
              category: labelFromCategoryId(item.categoryId),
              imageUrl: item.imageUrl ?? "",
              groups: (item.modifierGroups ?? []).map(groupDraftFrom),
            }
          : emptyFields(),
      );
    }
  }, [open, item]);

  function set<K extends keyof EditorFields>(key: K, value: EditorFields[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  async function uploadImage(file: File) {
    // Same rules the server enforces — fail fast with a friendlier message.
    const check = validateUploadFile({ type: file.type, size: file.size });
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("files", file);
      form.append("kind", "item-image");
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      const result = data?.results?.[0];
      if (!res.ok || !result?.url) {
        toast.error(result?.error ?? "Couldn't upload the image.");
        return;
      }
      setFields((f) => ({ ...f, imageUrl: result.url }));
    } catch {
      toast.error("Couldn't upload the image.");
    } finally {
      setUploading(false);
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
    // Reset so re-selecting the same file still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateGroup(key: number, patch: Partial<GroupDraft>) {
    set(
      "groups",
      fields.groups.map((g) => (g.key === key ? { ...g, ...patch } : g)),
    );
  }
  function updateOption(
    groupKey: number,
    optionKey: number,
    patch: Partial<OptionDraft>,
  ) {
    set(
      "groups",
      fields.groups.map((g) =>
        g.key === groupKey
          ? {
              ...g,
              options: g.options.map((o) =>
                o.key === optionKey ? { ...o, ...patch } : o,
              ),
            }
          : g,
      ),
    );
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
      // "" clears the photo server-side; a set path swaps it in.
      imageUrl: fields.imageUrl,
      // Drop unnamed groups/rows, then hand ids back so existing rows keep
      // theirs. Min/max are clamped to the surviving option count so the
      // server's `min ≤ max ≤ options` rule can't trip on stale numbers.
      modifierGroups: fields.groups
        .map((g) => ({ ...g, options: g.options.filter((o) => o.label.trim()) }))
        .filter((g) => g.label.trim() && g.options.length > 0)
        .map((g) => {
          const max = Math.min(
            Math.max(Math.floor(Number(g.max)) || 1, 1),
            g.options.length,
          );
          const min = Math.min(Math.max(Math.floor(Number(g.min)) || 0, 0), max);
          return {
            id: g.id || undefined,
            label: g.label.trim(),
            min,
            max,
            required: g.required,
            options: g.options.map((o) => ({
              id: o.id || undefined,
              label: o.label.trim(),
              priceDelta: Number(o.priceDelta) || 0,
              note: o.note.trim() || undefined,
            })),
          };
        }),
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden">
        <DialogHeader className="border-b border-border p-4 pr-12">
          <DialogTitle>
            {item ? `Edit ${item.name}` : "Add menu item"}
          </DialogTitle>
          <DialogDescription>
            {item
              ? "Changes go live on guests' menus immediately."
              : "New items appear on guests' menus immediately."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto p-4">
          {/* Photo */}
          <div>
            <Label className="mb-1.5 block">Photo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={onPickFile}
            />
            {fields.imageUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element -- user upload served from /api/uploads */}
                <img
                  src={fields.imageUrl}
                  alt=""
                  className="h-40 w-full object-cover"
                />
                {uploading && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                )}
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    aria-label="Remove photo"
                    onClick={() => set("imageUrl", "")}
                    disabled={uploading}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-7 text-center transition-colors hover:bg-muted/50",
                  uploading && "cursor-not-allowed opacity-70",
                )}
              >
                <span className="grid size-9 place-items-center rounded-full bg-brand-soft text-brand">
                  {uploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                </span>
                <span className="text-sm font-medium">
                  {uploading ? "Uploading…" : "Click to upload a photo"}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  JPEG, PNG, WebP, or GIF · up to 5MB
                </span>
              </button>
            )}
          </div>

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
                Base price
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

          {/* Choice groups — sizes, protein, spice level, add-ons… shown on
              the guest item sheet as radios (max 1) or checkboxes. */}
          <OptionGroup
            title="Guest choices"
            hint="Choice groups like Size, Protein, Spice level, or Add-ons. Single-choice groups show as radios, the rest as checkboxes."
            addLabel="Add group"
            onAdd={() =>
              fields.groups.length < MAX_GROUPS &&
              set("groups", [...fields.groups, emptyGroupDraft()])
            }
          >
            {fields.groups.map((g) => (
              <div
                key={g.key}
                className="rounded-xl border border-border bg-muted/30 p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={g.label}
                    onChange={(e) => updateGroup(g.key, { label: e.target.value })}
                    placeholder="Size / Protein / Spice level…"
                    className="h-9 flex-1"
                    aria-label="Group label"
                  />
                  <RemoveButton
                    label="Remove group"
                    onClick={() =>
                      set(
                        "groups",
                        fields.groups.filter((x) => x.key !== g.key),
                      )
                    }
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <label className="flex items-center gap-2 text-[13px]">
                    <Switch
                      checked={g.required}
                      onCheckedChange={(v) => updateGroup(g.key, { required: v })}
                      aria-label="Guests must choose from this group"
                    />
                    Required
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    Min
                    <Input
                      type="number"
                      min={0}
                      max={g.options.length}
                      value={g.min}
                      onChange={(e) => updateGroup(g.key, { min: e.target.value })}
                      className="h-8 w-16"
                      aria-label="Minimum selections"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    Max
                    <Input
                      type="number"
                      min={1}
                      max={g.options.length}
                      value={g.max}
                      onChange={(e) => updateGroup(g.key, { max: e.target.value })}
                      className="h-8 w-16"
                      aria-label="Maximum selections"
                    />
                  </label>
                </div>

                <div className="mt-2.5 flex flex-col gap-2">
                  {g.options.map((o) => (
                    <div key={o.key} className="flex items-center gap-2">
                      <Input
                        value={o.label}
                        onChange={(e) =>
                          updateOption(g.key, o.key, { label: e.target.value })
                        }
                        placeholder="Option (e.g. Chicken)"
                        className="h-9 flex-1"
                        aria-label="Option label"
                      />
                      <PriceField
                        prefix="+$"
                        value={o.priceDelta}
                        onChange={(v) =>
                          updateOption(g.key, o.key, { priceDelta: v })
                        }
                        className="w-24"
                        aria-label="Extra charge for this option"
                      />
                      <Input
                        value={o.note}
                        onChange={(e) =>
                          updateOption(g.key, o.key, { note: e.target.value })
                        }
                        placeholder="Note"
                        className="h-9 w-24"
                        aria-label="Option note"
                      />
                      <RemoveButton
                        label="Remove option"
                        onClick={() =>
                          updateGroup(g.key, {
                            options: g.options.filter((x) => x.key !== o.key),
                          })
                        }
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      updateGroup(g.key, {
                        options: [...g.options, emptyOptionDraft()],
                      })
                    }
                  >
                    <Plus className="size-3.5" /> Add option
                  </Button>
                </div>
              </div>
            ))}
          </OptionGroup>
        </div>

        <div className="border-t border-border p-4">
          <Button
            onClick={save}
            disabled={!valid || pending || uploading}
            className="h-11 w-full rounded-xl font-semibold"
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
      </DialogContent>
    </Dialog>
  );
}

/** Titled section wrapping a list of option rows with an "add" button. */
function OptionGroup({
  title,
  hint,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  hint: string;
  addLabel: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const rows = React.Children.toArray(children);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label className="block">{title}</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd}>
          <Plus className="size-3.5" /> {addLabel}
        </Button>
      </div>
      <p className="mb-2 text-[12px] text-muted-foreground">{hint}</p>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-[13px] text-muted-foreground">
          None yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">{children}</div>
      )}
    </div>
  );
}

function PriceField({
  prefix,
  value,
  onChange,
  className,
  ...rest
}: {
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange">) {
  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {prefix}
      </span>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 pl-8"
        {...rest}
      />
    </div>
  );
}

function RemoveButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 text-muted-foreground hover:text-destructive"
      aria-label={label}
      onClick={onClick}
    >
      <X className="size-4" />
    </Button>
  );
}

function emptyFields(): EditorFields {
  return {
    name: "",
    description: "",
    price: "",
    category: "",
    imageUrl: "",
    groups: [],
  };
}
