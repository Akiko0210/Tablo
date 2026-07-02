"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { formatDuration, sinceLabel } from "@/lib/workers/time";
import { initialsFrom } from "@/lib/auth/initials";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface WorkerRow {
  id: string;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  pin?: string;
  clockedIn: boolean;
  since?: string;
  minutesToday: number;
}

interface EditorState {
  open: boolean;
  worker: WorkerRow | null;
}

export function TeamManager() {
  const [workers, setWorkers] = React.useState<WorkerRow[] | null>(null);
  const [editor, setEditor] = React.useState<EditorState>({
    open: false,
    worker: null,
  });

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/workers");
      if (!res.ok) return;
      const data = await res.json();
      setWorkers(data.workers ?? []);
    } catch {
      // next poll retries
    }
  }, []);

  React.useEffect(() => {
    // Polling an external system; setState happens in the async continuation.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Presence changes as staff clock in/out from the kitchen app.
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  async function remove(worker: WorkerRow) {
    const res = await fetch(`/api/workers/${worker.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`Removed ${worker.name}.`);
      load();
    } else {
      toast.error("Couldn't remove the worker.");
    }
  }

  if (!workers) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    );
  }

  const present = workers.filter((w) => w.clockedIn);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-semibold text-foreground">
            {present.length} of {workers.length}
          </span>{" "}
          on shift right now
        </p>
        <Button size="sm" onClick={() => setEditor({ open: true, worker: null })}>
          <Plus className="size-3.5" /> Add worker
        </Button>
      </div>

      {workers.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <p className="text-sm font-medium">No workers yet</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">
            Add your kitchen and floor staff — they clock in and out from the
            kitchen app with a 4-digit PIN.
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {workers.map((worker, i) => (
            <div
              key={worker.id}
              className={cn(
                "flex flex-wrap items-center gap-3 px-4 py-3",
                i > 0 && "border-t border-border",
              )}
            >
              <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">
                {initialsFrom(worker.name)}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card",
                    worker.clockedIn ? "bg-green-500" : "bg-muted-foreground/40",
                  )}
                />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {worker.name}
                  </span>
                  {worker.clockedIn ? (
                    <Badge className="bg-green-100 text-[10px] text-green-700 hover:bg-green-100">
                      On shift since {worker.since ? sinceLabel(worker.since) : "—"}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">
                      Off shift
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
                  <span>{worker.role}</span>
                  {worker.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" /> {worker.phone}
                    </span>
                  )}
                  {worker.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3" /> {worker.email}
                    </span>
                  )}
                  {worker.pin && (
                    <span className="inline-flex items-center gap-1">
                      <KeyRound className="size-3" /> PIN {worker.pin}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold tabular-nums">
                  {formatDuration(worker.minutesToday)}
                </div>
                <div className="text-[11px] text-muted-foreground">today</div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit ${worker.name}`}
                  onClick={() => setEditor({ open: true, worker })}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${worker.name}`}
                  onClick={() => remove(worker)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <WorkerEditorSheet
        state={editor}
        onOpenChange={(open) => setEditor((e) => ({ ...e, open }))}
        onSaved={() => {
          setEditor({ open: false, worker: null });
          load();
        }}
      />
    </div>
  );
}

interface EditorFields {
  name: string;
  role: string;
  phone: string;
  email: string;
  pin: string;
}

function WorkerEditorSheet({
  state,
  onOpenChange,
  onSaved,
}: {
  state: EditorState;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { open, worker } = state;
  const [fields, setFields] = React.useState<EditorFields>(emptyFields());
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      // Reset the form to the worker being edited each time the sheet opens.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFields(
        worker
          ? {
              name: worker.name,
              role: worker.role,
              phone: worker.phone ?? "",
              email: worker.email ?? "",
              pin: worker.pin ?? "",
            }
          : emptyFields(),
      );
    }
  }, [open, worker]);

  function set<K extends keyof EditorFields>(key: K, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  const valid =
    fields.name.trim().length > 0 &&
    fields.role.trim().length > 0 &&
    /^\d{4}$/.test(fields.pin);

  async function save() {
    if (!valid || pending) return;
    setPending(true);
    try {
      const res = worker
        ? await fetch(`/api/workers/${worker.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          })
        : await fetch("/api/workers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fields),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Couldn't save the worker.");
        return;
      }
      toast.success(worker ? "Profile updated." : "Worker added.");
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
          <SheetTitle>{worker ? `Edit ${worker.name}` : "Add worker"}</SheetTitle>
          <SheetDescription>
            Workers clock in from the kitchen app with their PIN.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-4">
          <div>
            <Label htmlFor="w-name" className="mb-1.5 block">
              Full name
            </Label>
            <Input
              id="w-name"
              value={fields.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Marco Rinaldi"
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="w-role" className="mb-1.5 block">
                Role
              </Label>
              <Input
                id="w-role"
                value={fields.role}
                onChange={(e) => set("role", e.target.value)}
                placeholder="Line cook"
                className="h-10"
              />
            </div>
            <div>
              <Label htmlFor="w-pin" className="mb-1.5 block">
                4-digit PIN
              </Label>
              <Input
                id="w-pin"
                inputMode="numeric"
                maxLength={4}
                value={fields.pin}
                onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className="h-10 tabular-nums"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="w-phone" className="mb-1.5 block">
              Phone <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="w-phone"
              type="tel"
              value={fields.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(555) 123-4567"
              className="h-10"
            />
          </div>
          <div>
            <Label htmlFor="w-email" className="mb-1.5 block">
              Email <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="w-email"
              type="email"
              value={fields.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="marco@restaurant.com"
              className="h-10"
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
            ) : worker ? (
              "Save changes"
            ) : (
              "Add worker"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function emptyFields(): EditorFields {
  return { name: "", role: "", phone: "", email: "", pin: "" };
}
