"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import type { MenuItem } from "@/lib/types";
import { restaurant, itemsForCategory, searchItems } from "@/lib/menu-data";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { MenuItemRow } from "./menu-item-row";

export function BrowseScreen({
  tableId,
  onSelectItem,
}: {
  tableId: string;
  onSelectItem: (item: MenuItem) => void;
}) {
  const [category, setCategory] = React.useState(restaurant.categories[0].id);
  const [query, setQuery] = React.useState("");

  const searching = query.trim().length > 0;
  const results: MenuItem[] = searching
    ? searchItems(query)
    : itemsForCategory(category);

  return (
    <div className="flex flex-col">
      {/* Restaurant header */}
      <header className="sticky top-0 z-10 bg-card/90 px-4 pt-4 pb-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-lg font-bold text-brand-foreground">
            {restaurant.initials}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold leading-tight">
              {restaurant.name}
            </h1>
            <p className="text-[13px] text-muted-foreground">
              Table {tableId} · {restaurant.tagline}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu"
            aria-label="Search the menu"
            className="h-11 rounded-xl pl-9 pr-9"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Category chips */}
        {!searching && (
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            {restaurant.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                aria-pressed={category === c.id}
                className={cn(
                  "shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  category === c.id
                    ? "bg-brand text-brand-foreground"
                    : "bg-muted text-muted-foreground hover:bg-secondary",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Item list */}
      <div className="flex flex-col gap-1 px-2 py-2">
        {results.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-muted-foreground">
            No dishes match “{query}”.
          </div>
        ) : (
          results.map((item) => (
            <MenuItemRow key={item.id} item={item} onSelect={onSelectItem} />
          ))
        )}
      </div>
    </div>
  );
}
