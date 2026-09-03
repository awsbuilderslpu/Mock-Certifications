import { NextResponse } from "next/server";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type EventRequest = {
  attemptId?: unknown;
  eventType?: unknown;
  metadata?: unknown;
};

const ALLOWED_EVENTS = new Set([
  "tab_hidden",
  "tab_visible",
  "fullscreen_exited",
  "fullscreen_entered",
  "fullscreen_watchdog_failure",
  "copy_attempt",
  "paste_attempt",
  "cut_attempt",
  "context_menu_attempt",
  "screen_share_started",
  "screen_share_stopped",
  "screen_share_watchdog_failure",
  "window_blurred",
  "window_focused",
  "keyboard_attempt",
  "drag_attempt",
  "drop_attempt",
  "print_attempt",
  "auto_submitted",
  "exam_started",
  "exam_submitted",
]);

const MAX_REQUEST_SIZE = 10_000;
const MAX_METADATA_KEYS = 20;
const MAX_METADATA_STRING_LENGTH = 500;

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function sanitizeMetadata(
  value: unknown,
): Record<string, unknown> | null {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return null;
  }

  const entries = Object.entries(
    value as Record<string, unknown>,
  );

  if (entries.length > MAX_METADATA_KEYS) {
    return null;
  }

  const result: Record<string, unknown> = {};

  for (const [key, item] of entries) {
    if (
      !key ||
      key.length > 100 ||
      !/^[a-zA-Z0-9_.-]+$/.test(key)
    ) {
      return null;
    }

    if (
      item === null ||
      typeof item === "boolean" ||
      typeof item === "number"
    ) {
      result[key] = item;
      continue;
    }

    if (typeof item === "string") {
      if (
        item.length >
        MAX_METADATA_STRING_LENGTH
      ) {
        return null;
      }

      result[key] = item;
      continue;
    }

    if (Array.isArray(item)) {
      if (item.length > 20) {
        return null;
      }

      for (const arrayItem of item) {
        if (
          arrayItem !== null &&
          typeof arrayItem !== "string" &&
          typeof arrayItem !== "number" &&
          typeof arrayItem !== "boolean"
        ) {
          return null;
        }

        if (
          typeof arrayItem === "string" &&
          arrayItem.length >
            MAX_METADATA_STRING_LENGTH
        ) {
          return null;
        }
      }

      result[key] = item;
      continue;
    }

    return null;
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get(
      "content-length",
    );

    if (
      contentLength &&
      Number(contentLength) > MAX_REQUEST_SIZE
    ) {
      return NextResponse.json(
        {
          error: "Request is too large.",
        },
        { status: 413 },
      );
    }

    const user = await requireCore();
    const supabase = await createClient();

    let body: EventRequest;

    try {
      body =
        (await request.json()) as EventRequest;
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON payload.",
        },
        { status: 400 },
      );
    }

    const {
      attemptId,
      eventType,
      metadata = {},
    } = body;

    if (!isValidUuid(attemptId)) {
      return NextResponse.json(
        {
          error: "Invalid attempt ID.",
        },
        { status: 400 },
      );
    }

    if (
      typeof eventType !== "string" ||
      !ALLOWED_EVENTS.has(eventType)
    ) {
      return NextResponse.json(
        {
          error: "Invalid exam event.",
        },
        { status: 400 },
      );
    }

    const sanitizedMetadata =
      sanitizeMetadata(metadata);

    if (sanitizedMetadata === null) {
      return NextResponse.json(
        {
          error: "Invalid event metadata.",
        },
        { status: 400 },
      );
    }

    const {
      data: attempt,
      error: attemptError,
    } = await supabase
      .from("attempts")
      .select(
        `
          id,
          user_id,
          status,
          started_at,
          slot_id,
          mocks (
            duration_minutes
          ),
          exam_slots (
            ends_at,
            status
          )
        `,
      )
      .eq("id", attemptId)
      .eq("user_id", user.profile.id)
      .maybeSingle();

    if (attemptError || !attempt) {
      return NextResponse.json(
        {
          error: "Attempt not found.",
        },
        { status: 404 },
      );
    }

    if (attempt.status !== "in_progress") {
      return NextResponse.json(
        {
          error:
            "This examination is no longer active.",
        },
        { status: 409 },
      );
    }

    if (!attempt.started_at) {
      return NextResponse.json(
        {
          error:
            "Attempt start time is missing.",
        },
        { status: 409 },
      );
    }

    const mock = Array.isArray(attempt.mocks)
      ? attempt.mocks[0]
      : attempt.mocks;

    const slot = Array.isArray(attempt.exam_slots)
      ? attempt.exam_slots[0]
      : attempt.exam_slots;

    if (!mock || !slot) {
      return NextResponse.json(
        {
          error:
            "Examination configuration is invalid.",
        },
        { status: 409 },
      );
    }

    if (slot.status !== "scheduled") {
      return NextResponse.json(
        {
          error:
            "This examination is no longer active.",
        },
        { status: 409 },
      );
    }

    if (
      !Number.isInteger(mock.duration_minutes) ||
      mock.duration_minutes <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid examination configuration.",
        },
        { status: 409 },
      );
    }

    const startedAt = new Date(
      attempt.started_at,
    ).getTime();

    const slotEnd = new Date(
      slot.ends_at,
    ).getTime();

    if (
      Number.isNaN(startedAt) ||
      Number.isNaN(slotEnd)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid examination timing.",
        },
        { status: 409 },
      );
    }

    const durationDeadline =
      startedAt +
      mock.duration_minutes * 60 * 1000;

    const deadline = Math.min(
      durationDeadline,
      slotEnd,
    );

    if (Date.now() >= deadline) {
      return NextResponse.json(
        {
          error:
            "The examination time has expired.",
        },
        { status: 409 },
      );
    }

    const { error: insertError } =
      await supabase
        .from("exam_events")
        .insert({
          attempt_id: attemptId,
          event_type: eventType,
          metadata: sanitizedMetadata,
        });

    if (insertError) {
      return NextResponse.json(
        {
          error:
            "Failed to record exam event.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unauthorized.",
      },
      { status: 401 },
    );
  }
}