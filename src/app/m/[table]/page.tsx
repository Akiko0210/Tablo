import type { Metadata } from "next";
import { MenuApp } from "@/components/menu/menu-app";
import { restaurant } from "@/lib/menu-data";

export const metadata: Metadata = {
  title: `${restaurant.name} — Menu`,
  description: `Browse the menu and order from your table at ${restaurant.name}.`,
};

// Next 16: params is async and must be awaited.
export default async function TableMenuPage({
  params,
}: {
  params: Promise<{ table: string }>;
}) {
  const { table } = await params;
  return <MenuApp tableId={decodeURIComponent(table)} />;
}
