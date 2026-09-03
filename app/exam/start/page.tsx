import { notFound, redirect } from "next/navigation";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import StartExam from "@/components/exam/start-exam";

type SearchParams = {
  slot?: string;
};

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function normalizeSettings(
  value: unknown,
): Record<string, boolean> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  const settings: Record<string, boolean> = {};

  for (const [key, setting] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof setting === "boolean") {
      settings[key] = setting;
    }
  }

  return settings;
}

export default async function StartExamPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireCore();

  const params = await searchParams;
  const slotId = params.slot;

  if (!isValidUuid(slotId)) {
    redirect("/mocks");
  }

  const supabase = await createClient();

  const {
    data: slot,
    error: slotError,
  } = await supabase
    .from("exam_slots")
    .select(
      `
        id,
        mock_id,
        starts_at,
        ends_at,
        status,
        mocks (
          id,
          title,
          description,
          status,
          duration_minutes,
          passing_score,
          settings
        )
      `,
    )
    .eq("id", slotId)
    .maybeSingle();

  if (slotError || !slot) {
    notFound();
  }

  const mock = Array.isArray(slot.mocks)
    ? slot.mocks[0]
    : slot.mocks;

  if (!mock) {
    notFound();
  }

  if (
    mock.id !== slot.mock_id
  ) {
    notFound();
  }

  if (mock.status !== "published") {
    notFound();
  }

  if (slot.status !== "scheduled") {
    redirect("/mocks");
  }

  const startsAt = new Date(
    slot.starts_at,
  ).getTime();

  const endsAt = new Date(
    slot.ends_at,
  ).getTime();

  if (
    Number.isNaN(startsAt) ||
    Number.isNaN(endsAt) ||
    endsAt <= startsAt
  ) {
    throw new Error(
      "Invalid examination schedule.",
    );
  }

  if (Date.now() >= endsAt) {
    redirect("/mocks");
  }

  if (
    !Number.isInteger(
      mock.duration_minutes,
    ) ||
    mock.duration_minutes <= 0
  ) {
    throw new Error(
      "Invalid examination configuration.",
    );
  }

  const {
    data: existingAttempt,
    error: attemptError,
  } = await supabase
    .from("attempts")
    .select(
      "id, status, started_at, submitted_at",
    )
    .eq("user_id", user.profile.id)
    .eq("slot_id", slot.id)
    .maybeSingle();

  if (attemptError) {
    throw new Error(
      "Failed to load examination attempt.",
    );
  }

  if (
    existingAttempt?.status ===
      "submitted" ||
    existingAttempt?.status ===
      "auto_submitted"
  ) {
    redirect(
      `/results/${existingAttempt.id}`,
    );
  }

  if (
    existingAttempt &&
    existingAttempt.status !==
      "in_progress" &&
    existingAttempt.status !==
      "not_started"
  ) {
    redirect("/mocks");
  }

  return (
    <StartExam
      slot={{
        id: slot.id,
        starts_at: slot.starts_at,
        ends_at: slot.ends_at,
      }}
      mock={{
        id: mock.id,
        title: mock.title,
        description: mock.description,
        duration_minutes:
          mock.duration_minutes,
        passing_score:
          mock.passing_score,
        settings:
          normalizeSettings(
            mock.settings,
          ),
      }}
      existingAttempt={
        existingAttempt
          ? {
              id: existingAttempt.id,
              status:
                existingAttempt.status,
            }
          : null
      }
    />
  );
}