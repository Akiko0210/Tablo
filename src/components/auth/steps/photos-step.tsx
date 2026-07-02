"use client";

import * as React from "react";
import { ImagePlus, Loader2, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_PHOTOS_PER_ACCOUNT } from "@/lib/uploads/limits";

export interface PhotoItem {
  localId: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "done" | "error";
  id?: string;
  url?: string;
  error?: string;
}

export function PhotosStep({
  photos,
  onAddFiles,
  onRemove,
  onBack,
  onContinue,
}: {
  photos: PhotoItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (localId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const atLimit = photos.length >= MAX_PHOTOS_PER_ACCOUNT;
  const uploading = photos.some((p) => p.status === "uploading");

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    onAddFiles(Array.from(fileList));
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Upload your menu photos</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Add a few photos of your dishes — guests see these on the menu. You
          can add more later. Up to {MAX_PHOTOS_PER_ACCOUNT} photos, 5MB each.
        </p>
      </div>

      <button
        type="button"
        onClick={() => !atLimit && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!atLimit) handleFiles(e.dataTransfer.files);
        }}
        disabled={atLimit}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          dragOver ? "border-brand bg-brand-soft" : "border-border bg-muted/30",
          atLimit && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="grid size-10 place-items-center rounded-full bg-brand-soft text-brand">
          <ImagePlus className="size-5" />
        </span>
        <span className="text-sm font-medium">
          {atLimit
            ? `Limit of ${MAX_PHOTOS_PER_ACCOUNT} photos reached`
            : "Click to upload or drag photos here"}
        </span>
        <span className="text-[12px] text-muted-foreground">
          JPEG, PNG, WebP, or GIF
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {photos.map((p) => (
            <div
              key={p.localId}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- object URL / local blob preview */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              {p.status === "uploading" && (
                <div className="absolute inset-0 grid place-items-center bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}
              {p.status === "error" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-destructive/80 px-1.5 text-center">
                  <TriangleAlert className="size-4 text-white" />
                  <span className="text-[10px] leading-tight text-white">
                    {p.error ?? "Failed"}
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(p.localId)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          {photos.length === 0 && (
            <span className="text-[12px] text-muted-foreground">
              You can skip this for now
            </span>
          )}
          <Button
            type="button"
            onClick={onContinue}
            disabled={uploading}
            className="h-11 rounded-xl px-6 text-[15px] font-semibold"
          >
            {uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
