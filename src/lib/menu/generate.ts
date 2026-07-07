// Photo → menu extraction with the Claude API. The owner's uploaded photos
// (dishes or printed menus) are sent as vision input; Claude returns
// structured menu items that land in the restaurant's menu store as
// editable "ai"-sourced items.

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { ModifierGroup } from "@/lib/types";
import { getUploadData, listUploadsForOwner } from "@/lib/uploads/store";
import { replaceAiItems, type MenuItemInput } from "./store";
import { setGenerationJob } from "./generation-store";

const MODEL = "claude-opus-4-8";

const ExtractedMenuSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      /** Null when the photo shows no price (e.g. a dish photo). */
      price: z.number().nullable(),
      category: z.string(),
      /** A single emoji that fits the dish, used as the photo stand-in. */
      emoji: z.string().nullable(),
      /** Guest choices printed on the menu (sizes, protein, spice level…).
       * Null when the menu shows none for this item. */
      modifierGroups: z
        .array(
          z.object({
            label: z.string(),
            /** True when the guest must pick (e.g. a size or protein). */
            required: z.boolean(),
            /** Most selections allowed; 1 = single choice. */
            maxSelect: z.number(),
            options: z.array(
              z.object({
                label: z.string(),
                /** Surcharge over the base price; null/0 when included. */
                priceDelta: z.number().nullable(),
              }),
            ),
          }),
        )
        .nullable(),
    }),
  ),
});

const PROMPT = `These photos are from a restaurant owner setting up their digital menu. They may be photos of dishes, printed menus, chalkboards, or a mix.

Extract every distinct menu item you can identify. For each item:
- name: the dish name (title case; infer a sensible name for unlabeled dish photos)
- description: one appetizing sentence describing it (write one if none is visible)
- price: the price as a number if visible anywhere, otherwise null — never invent a price
- category: a short menu section like "Starters", "Mains", "Noodles", "Desserts", "Drinks"
- emoji: one emoji that best represents the dish, or null
- modifierGroups: choices the menu offers for the item — a size list, a protein choice (chicken/pork/tofu), spice level, sides, or paid add-ons. For each group give a short label, whether the guest must pick one (required), how many they may pick (maxSelect), and the options with their surcharge over the base price (priceDelta, 0 or null when included). Only include groups the menu actually shows — use null when there are none; never invent choices.

Skip anything that isn't food or drink. Don't duplicate items that appear in multiple photos.`;

type SupportedMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

/**
 * Runs the analysis and records progress in the generation store. Designed to
 * be fired without awaiting (the signup wizard shouldn't block on it); all
 * failure modes end up as a status the dashboard can show.
 */
export async function runMenuGeneration(
  ownerUserId: string,
  restaurantId: string,
): Promise<void> {
  const uploads = await listUploadsForOwner(ownerUserId);
  if (uploads.length === 0) {
    await setGenerationJob(restaurantId, {
      status: "skipped",
      message: "No photos uploaded yet — add some in Settings, then generate.",
    });
    return;
  }

  await setGenerationJob(restaurantId, {
    status: "running",
    message: `Analyzing ${uploads.length} photo${uploads.length === 1 ? "" : "s"}…`,
  });

  try {
    const client = new Anthropic();
    const imageBlocks = await Promise.all(
      uploads.slice(0, 6).map(async (u) => ({
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: u.mime as SupportedMediaType,
          data: (await getUploadData(u)).toString("base64"),
        },
      })),
    );

    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(ExtractedMenuSchema) },
      messages: [
        {
          role: "user",
          content: [...imageBlocks, { type: "text", text: PROMPT }],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      await setGenerationJob(restaurantId, {
        status: "failed",
        message: "The model couldn't extract a menu from these photos.",
      });
      return;
    }

    const inputs: MenuItemInput[] = response.parsed_output.items
      .filter((item) => item.name.trim())
      .map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price ?? 0,
        category: item.category || "Menu",
        emoji: item.emoji ?? undefined,
        modifierGroups: sanitizeGroups(item.modifierGroups),
      }));

    const created = await replaceAiItems(restaurantId, inputs);
    await setGenerationJob(restaurantId, {
      status: "done",
      itemCount: created.length,
      message: `Created ${created.length} menu item${created.length === 1 ? "" : "s"} from your photos.`,
    });
  } catch (error) {
    await setGenerationJob(restaurantId, {
      status: "failed",
      message: friendlyGenerationError(error),
    });
  }
}

type ExtractedGroups = z.infer<
  typeof ExtractedMenuSchema
>["items"][number]["modifierGroups"];

/** Clamp model output into store-valid groups (min ≤ max ≤ option count);
 * groups without usable options are dropped. Ids are assigned by the store. */
function sanitizeGroups(groups: ExtractedGroups): ModifierGroup[] | undefined {
  if (!groups) return undefined;
  const clean = groups.slice(0, 6).flatMap((g) => {
    const options = g.options
      .filter((o) => o.label.trim())
      .slice(0, 20)
      .map((o) => ({
        id: "",
        label: o.label.trim().slice(0, 60),
        priceDelta: Math.max(0, o.priceDelta ?? 0),
      }));
    if (!g.label.trim() || options.length === 0) return [];
    const max = Math.min(
      Math.max(Math.floor(g.maxSelect) || 1, 1),
      options.length,
    );
    return [
      {
        id: "",
        label: g.label.trim().slice(0, 60),
        min: g.required ? 1 : 0,
        max,
        required: g.required,
        options,
      },
    ];
  });
  return clean.length > 0 ? clean : undefined;
}

const CREDENTIALS_HINT =
  "AI analysis needs Anthropic API credentials on the server (set ANTHROPIC_API_KEY or run `ant auth login`). Add items manually meanwhile.";

function friendlyGenerationError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return CREDENTIALS_HINT;
  }
  // The SDK throws a plain Error at construction when no credential source
  // (env var, auth token, or profile) resolves at all.
  if (
    error instanceof Error &&
    error.message.includes("authentication method")
  ) {
    return CREDENTIALS_HINT;
  }
  if (error instanceof Anthropic.RateLimitError) {
    return "The AI service is rate-limited right now — try again in a minute.";
  }
  if (error instanceof Anthropic.APIError) {
    return `AI analysis failed (${error.status ?? "API error"}). Try again or add items manually.`;
  }
  const message = error instanceof Error ? error.message : "Unknown error";
  return `AI analysis failed: ${message}`;
}
