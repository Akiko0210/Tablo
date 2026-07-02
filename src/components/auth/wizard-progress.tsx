import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Account", "Photos", "Details", "Done"] as const;

export function WizardProgress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const complete = n < step;
        const current = n === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  complete && "bg-brand text-brand-foreground",
                  current && "bg-brand-soft text-brand-strong ring-2 ring-brand",
                  !complete && !current && "bg-muted text-muted-foreground",
                )}
              >
                {complete ? <Check className="size-3.5" strokeWidth={3} /> : n}
              </span>
              <span
                className={cn(
                  "hidden text-[13px] font-medium sm:inline",
                  current ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {n < STEPS.length && (
              <span
                className={cn(
                  "h-px flex-1",
                  complete ? "bg-brand" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
