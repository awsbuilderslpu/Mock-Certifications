import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SlotBuilder from "@/components/admin/slot-builder";

export default async function NewSlotPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: mocks, error } = await supabase
    .from("mocks")
    .select(
      "id, title, duration_minutes, status",
    )
    .eq("status", "published")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <SlotBuilder mocks={mocks ?? []} />
  );
}