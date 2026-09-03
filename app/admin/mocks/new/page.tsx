import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MockBuilder from "@/components/admin/mock-builder";

export default async function NewMockPage() {
  await requireAdmin();

  const supabase = await createClient();

  const [
    questionsResult,
    certificationsResult,
  ] = await Promise.all([
    supabase
      .from("questions")
      .select(`
        id,
        question_text,
        question_type,
        difficulty,
        category,
        certification_id,
        question_options (
          id,
          option_text,
          option_order
        )
      `)
      .order("created_at", {
        ascending: false,
      }),

    supabase
      .from("certifications")
      .select(
        "id, provider, name, code, description",
      )
      .eq("active", true)
      .order("provider", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      }),
  ]);

  if (questionsResult.error) {
    throw new Error(
      "Failed to load question bank.",
    );
  }

  if (certificationsResult.error) {
    throw new Error(
      "Failed to load certifications.",
    );
  }

  return (
    <MockBuilder
      questions={questionsResult.data ?? []}
      certifications={
        certificationsResult.data ?? []
      }
    />
  );
}