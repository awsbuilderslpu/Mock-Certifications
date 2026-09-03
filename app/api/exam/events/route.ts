import { NextResponse } from "next/server";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type EventRequest = {
  attemptId?: unknown;
  eventType?: unknown;
  metadata?: unknown;
};

const ALLOWED_EVENTS = new Set([
  "exam_started",
  "screen_share_started",
  "screen_share_stopped",
  "screen_share_watchdog_failure",
  "fullscreen_exited",
  "fullscreen_entered",
  "fullscreen_watchdog_failure",
  "tab_hidden",
  "tab_visible",
  "window_blurred",
  "window_focused",
  "copy_attempt",
  "paste_attempt",
  "cut_attempt",
  "context_menu_attempt",
  "keyboard_attempt",
  "drag_attempt",
  "drop_attempt",
  "print_attempt",
  "auto_submitted",
  "exam_submitted",
]);

const MAX_METADATA_KEYS = 20;
const MAX_METADATA_VALUE_LENGTH = 500;
const MAX_REQUEST_SIZE = 10_000;

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

  const sanitized: Record<string, unknown> = {};

  for (const [key, item] of entries) {
    if (
      key.length === 0 ||
      key.length > 100 ||
      !/^[a-zA-Z0-9_.-]+$/.test(key)
    ) {
      return null;
    }

    if (
      item === null ||
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    ) {
      if (
        typeof item === "string" &&
        item.length > MAX_METADATA_VALUE_LENGTH
      ) {
        return null;
      }

      sanitized[key] = item;
      continue;
    }

    if (Array.isArray(item)) {
      if (item.length > 20) {
        return null;
      }

      const validArray = item.every(
        (arrayItem) =>
          arrayItem === null ||
          typeof arrayItem === "string" ||
          typeof arrayItem === "number" ||
          typeof arrayItem === "boolean",
      );

      if (!validArray) {
        return null;
      }

      if (
        item.some(
          (arrayItem) =>
            typeof arrayItem === "string" &&
            arrayItem.length >
              MAX_METADATA_VALUE_LENGTH,
        )
      ) {
        return null;
      }

      sanitized[key] = item;
      continue;
    }

    return null;
  }

  return sanitized;
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
          slot_id
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

    const { data: slot } = await supabase
      .from("exam_slots")
      .select(
        `
          id,
          starts_at,
          ends_at,
          status
        `,
      )
      .eq("id", attempt.slot_id)
      .maybeSingle();

    if (!slot) {
      return NextResponse.json(
        {
          error: "Exam slot not found.",
        },
        { status: 404 },
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

    const now = Date.now();
    const slotEnd = new Date(
      slot.ends_at,
    ).getTime();

    if (
      Number.isNaN(slotEnd) ||
      now >= slotEnd
    ) {
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