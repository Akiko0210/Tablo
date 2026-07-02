"use client";

import * as React from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PHOTOS_PER_ACCOUNT } from "@/lib/uploads/limits";
import { cn } from "@/lib/utils";

export interface SettingsValues {
  name: string;
  tagline: string;
  cuisine: string;
  tableCount: number;
  address: string;
  phone: string;
  description: string;
}

const CUISINES = [
  "Italian",
  "American",
  "Mexican",
  "Japanese",
  "Chinese",
  "Indian",
  "Thai",
  "Mediterranean",
  "French",
  "Cafe / Bakery",
  "Other",
];

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const [values, setValues] = React.useState(initial);
  const [pending, setPending] = React.useState(false);

  function set<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const res = await fetch("/api/restaurant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          tableCount: Number(values.tableCount) || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't save your settings.");
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    } catch {
      toast.error("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="s-name" className="mb-1.5 block">
            Restaurant name
          </Label>
          <Input
            id="s-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            className="h-10"
            required
          />
        </div>
        <div>
          <Label htmlFor="s-tagline" className="mb-1.5 block">
            Tagline
          </Label>
          <Input
            id="s-tagline"
            value={values.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="Wood-fired · Dine in"
            className="h-10"
          />
        </div>
        <div>
          <Label htmlFor="s-cuisine" className="mb-1.5 block">
            Cuisine
          </Label>
          <select
            id="s-cuisine"
            value={values.cuisine}
            onChange={(e) => set("cuisine", e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-[14px] outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Not set</option>
            {CUISINES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="s-tables" className="mb-1.5 block">
            Number of tables
          </Label>
          <Input
            id="s-tables"
            type="number"
            min={1}
            max={500}
            value={values.tableCount}
            onChange={(e) => set("tableCount", Number(e.target.value))}
            className="h-10"
          />
          <p className="mt-1 text-[12px] text-muted-foreground">
            Controls how many QR codes you get.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="s-address" className="mb-1.5 block">
            Address
          </Label>
          <Input
            id="s-address"
            value={values.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="123 Main St, Springfield"
            className="h-10"
          />
        </div>
        <div>
          <Label htmlFor="s-phone" className="mb-1.5 block">
            Phone
          </Label>
          <Input
            id="s-phone"
            type="tel"
            value={values.phone}
            onChange={(e) => set("phone", e.target.value)}
            placeholder="(555) 123-4567"
            className="h-10"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="s-description" className="mb-1.5 block">
            Description
          </Label>
          <Textarea
            id="s-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="A cozy neighborhood spot…"
            className="min-h-20 resize-none"
            maxLength={1000}
          />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending} className="h-10 rounded-xl px-5">
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </form>
  );
}

interface PhotoInfo {
  id: string;
  url: string;
  filename: string;
}

export function PhotosManager({ initial }: { initial: PhotoInfo[] }) {
  const [photos, setPhotos] = React.useState(initial);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const atLimit = photos.length >= MAX_PHOTOS_PER_ACCOUNT;

  async function refresh() {
    const res = await fetch("/api/uploads");
    if (res.ok) {
      const data = await res.json();
      setPhotos(data.uploads ?? []);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (const file of Array.from(files)) form.append("files", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json().catch(() => ({ results: [] }));
      const failed = (data.results ?? []).filter(
        (r: { error?: string }) => r.error,
      );
      if (failed.length > 0) {
        toast.error(
          `${failed.length} photo${failed.length === 1 ? "" : "s"} failed: ${failed[0].error}`,
        );
      }
      await refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(photo: PhotoInfo) {
    const res = await fetch(`/api/uploads/${photo.id}`, { method: "DELETE" });
    if (res.ok) {
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } else {
      toast.error("Couldn't delete the photo.");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Menu photos</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Used by the AI menu generator (Menu → Generate from photos). Up to{" "}
            {MAX_PHOTOS_PER_ACCOUNT}.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={atLimit || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          Add photos
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length === 0 ? (
        <p className="mt-4 rounded-xl bg-muted/40 px-4 py-6 text-center text-[13px] text-muted-foreground">
          No photos yet.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className={cn(
                "group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- served from the in-memory upload store */}
              <img
                src={photo.url}
                alt={photo.filename}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => remove(photo)}
                aria-label={`Delete ${photo.filename}`}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
