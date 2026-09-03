"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SlotInput = {
  mockId: string;
  startsAt: string;
  endsAt: string;
};

type ActionResult = {
  success: boolean;
  slotId?: string;
  error?: string;
};

const MAX_SLOT_DURATION_MS =
  30 * 24 * 60 * 60 * 1000;

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function parseDate(value: unknown): Date | null {
  if (
    typeof value !== "string" ||
    value.length > 100
  ) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function createExamSlot(
  input: SlotInput,
): Promise<ActionResult> {
  const user = await requireAdmin();
  const supabase = await createClient();

  if (
    !input ||
    typeof input !== "object"
  ) {
    return {
      success: false,
      error: "Invalid slot data.",
    };
  }

  if (!isValidUuid(input.mockId)) {
    return {
      success: false,
      error: "Invalid mock.",
    };
  }

  const startsAt = parseDate(
    input.startsAt,
  );

  const endsAt = parseDate(
    input.endsAt,
  );

  if (!startsAt || !endsAt) {
    return {
      success: false,
      error: "Invalid date/time.",
    };
  }

  if (endsAt <= startsAt) {
    return {
      success: false,
      error: "End time must be after start time.",
    };
  }

  if (
    endsAt.getTime() -
      startsAt.getTime() >
    MAX_SLOT_DURATION_MS
  ) {
    return {
      success: false,
      error:
        "Exam slot cannot be longer than 30 days.",
    };
  }

  const now = Date.now();

  if (endsAt.getTime() <= now) {
    return {
      success: false,
      error:
        "Exam slot must end in the future.",
    };
  }

  if (startsAt.getTime() <= now) {
    return {
      success: false,
      error:
        "Exam slot must start in the future.",
    };
  }

  const {
    data: mock,
    error: mockError,
  } = await supabase
    .from("mocks")
    .select(
      "id, status, duration_minutes",
    )
    .eq("id", input.mockId)
    .maybeSingle();

  if (mockError || !mock) {
    return {
      success: false,
      error: "Mock not found.",
    };
  }

  if (mock.status !== "published") {
    return {
      success: false,
      error:
        "Only published mocks can be scheduled.",
    };
  }

  if (
    !Number.isInteger(
      mock.duration_minutes,
    ) ||
    mock.duration_minutes <= 0
  ) {
    return {
      success: false,
      error:
        "The mock has an invalid duration.",
    };
  }

  const examDuration =
    mock.duration_minutes *
    60 *
    1000;

  if (
    examDuration >
    endsAt.getTime() -
      startsAt.getTime()
  ) {
    return {
      success: false,
      error:
        "The exam duration cannot exceed the slot duration.",
    };
  }

  const { data: overlappingSlot } =
    await supabase
      .from("exam_slots")
      .select("id")
      .eq("mock_id", input.mockId)
      .eq("status", "scheduled")
      .lt("starts_at", endsAt.toISOString())
      .gt("ends_at", startsAt.toISOString())
      .limit(1)
      .maybeSingle();

  if (overlappingSlot) {
    return {
      success: false,
      error:
        "This mock already has an overlapping scheduled slot.",
    };
  }

  const {
    data: slot,
    error: slotError,
  } = await supabase
    .from("exam_slots")
    .insert({
      mock_id: input.mockId,
      starts_at:
        startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "scheduled",
      created_by: user.profile.id,
    })
    .select("id")
    .single();

  if (slotError || !slot) {
    return {
      success: false,
      error:
        "Failed to create exam slot.",
    };
  }

  revalidatePath("/admin/slots");
  revalidatePath("/mocks");

  return {
    success: true,
    slotId: slot.id,
  };
}

export async function cancelExamSlot(
  slotId: string,
  _formData?: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  void _formData;

  const supabase = await createClient();

  if (!isValidUuid(slotId)) {
    return {
      success: false,
      error: "Invalid exam slot.",
    };
  }

  const {
    data: slot,
    error: slotError,
  } = await supabase
    .from("exam_slots")
    .select(
      "id, status, starts_at, ends_at",
    )
    .eq("id", slotId)
    .maybeSingle();

  if (slotError || !slot) {
    return {
      success: false,
      error: "Exam slot not found.",
    };
  }

  if (slot.status !== "scheduled") {
    return {
      success: false,
      error:
        "Only scheduled exam slots can be cancelled.",
    };
  }

  const now = Date.now();
  const startsAt = new Date(
    slot.starts_at,
  ).getTime();
  const endsAt = new Date(
    slot.ends_at,
  ).getTime();

  if (
    Number.isNaN(startsAt) ||
    Number.isNaN(endsAt)
  ) {
    return {
      success: false,
      error:
        "Invalid exam slot timing.",
    };
  }

  if (now >= endsAt) {
    return {
      success: false,
      error:
        "This exam slot has already ended.",
    };
  }

  const {
    data: updatedSlot,
    error: updateError,
  } = await supabase
    .from("exam_slots")
    .update({
      status: "cancelled",
    })
    .eq("id", slotId)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return {
      success: false,
      error:
        "Failed to cancel exam slot.",
    };
  }

  if (!updatedSlot) {
    return {
      success: false,
      error:
        "The exam slot could not be cancelled.",
    };
  }

  revalidatePath("/admin/slots");
  revalidatePath(
    `/admin/slots/${slotId}`,
  );
  revalidatePath("/mocks");

  return {
    success: true,
    slotId,
  };
}