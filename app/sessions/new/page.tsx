import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NewSessionForm from "./NewSessionForm";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: sports }, { data: profile }] = await Promise.all([
    supabase.from("sports").select("id, name, category").order("name"),
    supabase.from("profiles").select("city").eq("id", user.id).single(),
  ]);

  return (
    <div className="rounded-3xl border border-border bg-white p-5">
      <p className="mb-4 text-center text-sm font-black tracking-wide text-muted">
        New session
      </p>
      <NewSessionForm
        sports={sports ?? []}
        defaultCity={profile?.city ?? ""}
        error={params.error}
      />
    </div>
  );
}
