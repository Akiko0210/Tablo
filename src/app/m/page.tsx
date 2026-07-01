import { redirect } from "next/navigation";

// A bare /m has no table — send guests to a sensible default table.
export default function MenuIndex() {
  redirect("/m/1");
}
