import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUserTrips } from "@/server/actions/trip.actions";
import { TripsShell } from "@/components/features/trips/TripsShell";

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const result = await listUserTrips();
  if (!result.success) redirect("/auth/login");

  const { trips, total } = result.data;

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <TripsShell trips={trips} total={total} />
    </main>
  );
}
