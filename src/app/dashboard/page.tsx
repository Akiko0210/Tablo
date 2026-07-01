import { getSession } from "@/lib/auth/current";
import { Overview } from "@/components/dashboard/overview";

export default async function DashboardPage() {
  const session = await getSession();
  const firstName = (session?.name ?? "there").split(" ")[0];
  return <Overview firstName={firstName} />;
}
