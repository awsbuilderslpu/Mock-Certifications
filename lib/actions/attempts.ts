"use server";

import { revalidatePath } from "next/cache";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ActionResult = {
  success: boolean;
  attemptId?: string;
  error?: string;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeSelections(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" &&
          isValidUuid(item),
      ),
    ),
  ];
}

export async function startAttempt(
  slotId: string,
): Promise<ActionResult> {
  const user = await requireCore();
  const supabase = await createClient();

  if (!isValidUuid(slotId)) {
    return {
      success: false,
      error: "Invalid exam slot.",
    };
  }

  const { data: slot, error: slotError } =
    await supabase
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
            status,
            duration_minutes
          )
        `,
      )
      .eq("id", slotId)
      .maybeSingle();

  if (slotError || !slot) {
    return {
      success: false,
      error: "Exam slot not found.",
    };
  }

  const mock = Array.isArray(slot.mocks)
    ? slot.mocks[0]
    : slot.mocks;

  if (!mock) {
    return {
      success: false,
      error: "Associated mock was not found.",
    };
  }

  if (mock.status !== "published") {
    return {
      success: false,
      error: "This examination is not available.",
    };
  }

  if (slot.status !== "scheduled") {
    return {
      success: false,
      error: "This examination is not available.",
    };
  }

  if (
    !Number.isInteger(mock.duration_minutes) ||
    mock.duration_minutes <= 0
  ) {
    return {
      success: false,
      error: "Invalid examination duration.",
    };
  }

  const now = new Date();
  const startsAt = new Date(slot.starts_at);
  const endsAt = new Date(slot.ends_at);

  if (
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    endsAt <= startsAt
  ) {
    return {
      success: false,
      error: "Invalid examination schedule.",
    };
  }

  if (now < startsAt) {
    return {
      success: false,
      error: "The examination has not started yet.",
    };
  }

  if (now >= endsAt) {
    return {
      success: false,
      error: "The examination slot has ended.",
    };
  }

  const { data: existingAttempt } =
    await supabase
      .from("attempts")
      .select(
        "id, status, started_at, submitted_at",
      )
      .eq("user_id", user.profile.id)
      .eq("slot_id", slotId)
      .maybeSingle();

  if (existingAttempt) {
    if (
      existingAttempt.status === "in_progress"
    ) {
      return {
        success: true,
        attemptId: existingAttempt.id,
      };
    }

    if (
      existingAttempt.status === "submitted" ||
      existingAttempt.status === "auto_submitted"
    ) {
      return {
        success: false,
        error:
          "You have already completed this examination.",
      };
    }

    return {
      success: false,
      error:
        "An attempt already exists for this examination.",
    };
  }

  const startedAt = now.toISOString();

  const { data: attempt, error: attemptError } =
    await supabase
      .from("attempts")
      .insert({
        user_id: user.profile.id,
        mock_id: slot.mock_id,
        slot_id: slot.id,
        started_at: startedAt,
        status: "in_progress",
      })
      .select("id")
      .single();

  if (attemptError || !attempt) {
    if (
      attemptError?.code === "23505"
    ) {
      const { data: concurrentAttempt } =
        await supabase
          .from("attempts")
          .select("id, status")
          .eq("user_id", user.profile.id)
          .eq("slot_id", slotId)
          .maybeSingle();

      if (
        concurrentAttempt?.status ===
        "in_progress"
      ) {
        return {
          success: true,
          attemptId: concurrentAttempt.id,
        };
      }

      if (
        concurrentAttempt?.status ===
          "submitted" ||
        concurrentAttempt?.status ===
          "auto_submitted"
      ) {
        return {
          success: false,
          error:
            "You have already completed this examination.",
        };
      }
    }

    return {
      success: false,
      error: "Failed to start examination.",
    };
  }

  await supabase.from("exam_events").insert({
    attempt_id: attempt.id,
    event_type: "exam_started",
    metadata: {
      started_at: startedAt,
    },
  });

  revalidatePath("/mocks");
  revalidatePath("/dashboard");

  return {
    success: true,
    attemptId: attempt.id,
  };
}

export async function saveAttemptAnswer(
  attemptId: string,
  questionId: string,
  selectedOptions: string[],
): Promise<ActionResult> {
  const user = await requireCore();
  const supabase = await createClient();

  if (
    !isValidUuid(attemptId) ||
    !isValidUuid(questionId)
  ) {
    return {
      success: false,
      error: "Invalid attempt or question.",
    };
  }

  if (!Array.isArray(selectedOptions)) {
    return {
      success: false,
      error: "Invalid answer selection.",
    };
  }

  if (selectedOptions.length > 10) {
    return {
      success: false,
      error: "Too many answer selections.",
    };
  }

  const normalizedSelections =
    normalizeSelections(selectedOptions);

  if (
    normalizedSelections.length !==
    selectedOptions.length
  ) {
    return {
      success: false,
      error: "Invalid answer selection.",
    };
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
        mock_id,
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
    return {
      success: false,
      error: "Attempt not found.",
    };
  }

  if (attempt.status !== "in_progress") {
    return {
      success: false,
      error:
        "This examination is no longer active.",
    };
  }

  const mock = Array.isArray(attempt.mocks)
    ? attempt.mocks[0]
    : attempt.mocks;

  const slot = Array.isArray(attempt.exam_slots)
    ? attempt.exam_slots[0]
    : attempt.exam_slots;

  if (!mock) {
    return {
      success: false,
      error: "Mock not found.",
    };
  }

  if (!slot) {
    return {
      success: false,
      error: "Exam slot not found.",
    };
  }

  if (slot.status !== "scheduled") {
    return {
      success: false,
      error:
        "This examination is no longer available.",
    };
  }

  if (!attempt.started_at) {
    return {
      success: false,
      error: "Attempt start time is missing.",
    };
  }

  if (
    !Number.isInteger(mock.duration_minutes) ||
    mock.duration_minutes <= 0
  ) {
    return {
      success: false,
      error: "Invalid examination duration.",
    };
  }

  const startedAt = new Date(
    attempt.started_at,
  ).getTime();

  const slotEndsAt = new Date(
    slot.ends_at,
  ).getTime();

  if (
    Number.isNaN(startedAt) ||
    Number.isNaN(slotEndsAt)
  ) {
    return {
      success: false,
      error: "Invalid examination timing.",
    };
  }

  const durationDeadline =
    startedAt +
    mock.duration_minutes * 60 * 1000;

  const deadline = Math.min(
    durationDeadline,
    slotEndsAt,
  );

  if (Date.now() >= deadline) {
    return {
      success: false,
      error:
        "The examination time has expired.",
    };
  }

  const {
    data: mockQuestion,
    error: mockQuestionError,
  } = await supabase
    .from("mock_questions")
    .select("question_id")
    .eq("mock_id", attempt.mock_id)
    .eq("question_id", questionId)
    .maybeSingle();

  if (
    mockQuestionError ||
    !mockQuestion
  ) {
    return {
      success: false,
      error:
        "This question does not belong to the examination.",
    };
  }

  const {
    data: options,
    error: optionsError,
  } = await supabase
    .from("question_options")
    .select("id")
    .eq("question_id", questionId);

  if (optionsError) {
    return {
      success: false,
      error: "Failed to validate answer.",
    };
  }

  const validOptionIds = new Set(
    (options ?? []).map(
      (option) => option.id,
    ),
  );

  if (
    normalizedSelections.some(
      (optionId) =>
        !validOptionIds.has(optionId),
    )
  ) {
    return {
      success: false,
      error: "Invalid answer selection.",
    };
  }

  const { error } = await supabase
    .from("attempt_answers")
    .upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected_options:
          normalizedSelections,
        answered_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "attempt_id,question_id",
      },
    );

  if (error) {
    return {
      success: false,
      error: "Failed to save answer.",
    };
  }

  return {
    success: true,
  };
}

export async function submitAttempt(
  attemptId: string,
  _autoSubmitted = false,
): Promise<ActionResult> {
  const user = await requireCore();
  void _autoSubmitted;
  const supabase = await createClient();

  if (!isValidUuid(attemptId)) {
    return {
      success: false,
      error: "Invalid attempt ID.",
    };
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
        mock_id,
        slot_id,
        started_at,
        status,
        mocks (
          passing_score,
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
    return {
      success: false,
      error: "Attempt not found.",
    };
  }

  if (
    attempt.status === "submitted" ||
    attempt.status === "auto_submitted"
  ) {
    return {
      success: true,
      attemptId,
    };
  }

  if (attempt.status !== "in_progress") {
    return {
      success: false,
      error:
        "This attempt cannot be submitted.",
    };
  }

  const mock = Array.isArray(attempt.mocks)
    ? attempt.mocks[0]
    : attempt.mocks;

  const slot = Array.isArray(attempt.exam_slots)
    ? attempt.exam_slots[0]
    : attempt.exam_slots;

  if (!mock || !slot) {
    return {
      success: false,
      error:
        "Examination configuration is invalid.",
    };
  }

  if (!attempt.started_at) {
    return {
      success: false,
      error: "Attempt start time is missing.",
    };
  }

  const startedAt = new Date(
    attempt.started_at,
  ).getTime();

  const slotEndsAt = new Date(
    slot.ends_at,
  ).getTime();

  if (
    Number.isNaN(startedAt) ||
    Number.isNaN(slotEndsAt) ||
    !Number.isInteger(mock.duration_minutes) ||
    mock.duration_minutes <= 0
  ) {
    return {
      success: false,
      error:
        "Invalid examination timing.",
    };
  }

  const durationDeadline =
    startedAt +
    mock.duration_minutes * 60 * 1000;

  const deadline = Math.min(
    durationDeadline,
    slotEndsAt,
  );

  const now = Date.now();
  const autoSubmitted = now >= deadline;

  const {
    data: mockQuestions,
    error: questionsError,
  } = await supabase
    .from("mock_questions")
    .select("question_id")
    .eq("mock_id", attempt.mock_id);

  if (questionsError) {
    return {
      success: false,
      error:
        "Failed to load examination questions.",
    };
  }

  const questionIds =
    (mockQuestions ?? []).map(
      (question) => question.question_id,
    );

  if (questionIds.length === 0) {
    return {
      success: false,
      error:
        "This examination contains no questions.",
    };
  }

  const {
    data: correctOptions,
    error: correctError,
  } = await supabase
    .from("question_options")
    .select("question_id, id")
    .in("question_id", questionIds)
    .eq("is_correct", true);

  if (correctError) {
    return {
      success: false,
      error:
        "Failed to calculate result.",
    };
  }

  const {
    data: answers,
    error: answersError,
  } = await supabase
    .from("attempt_answers")
    .select(
      "question_id, selected_options",
    )
    .eq("attempt_id", attemptId);

  if (answersError) {
    return {
      success: false,
      error:
        "Failed to load submitted answers.",
    };
  }

  const correctMap = new Map<
    string,
    Set<string>
  >();

  for (const option of correctOptions ?? []) {
    if (!correctMap.has(option.question_id)) {
      correctMap.set(
        option.question_id,
        new Set(),
      );
    }

    correctMap
      .get(option.question_id)!
      .add(option.id);
  }

  const answerMap = new Map<
    string,
    string[]
  >();

  for (const answer of answers ?? []) {
    if (
      !questionIds.includes(
        answer.question_id,
      )
    ) {
      continue;
    }

    answerMap.set(
      answer.question_id,
      normalizeSelections(
        answer.selected_options,
      ),
    );
  }

  let correctCount = 0;

  for (const questionId of questionIds) {
    const expected =
      correctMap.get(questionId) ??
      new Set<string>();

    const selected = new Set(
      answerMap.get(questionId) ?? [],
    );

    if (
      selected.size === expected.size &&
      [...selected].every((optionId) =>
        expected.has(optionId),
      )
    ) {
      correctCount++;
    }
  }

  const totalQuestions =
    questionIds.length;

  const percentage =
    totalQuestions > 0
      ? Number(
          (
            (correctCount /
              totalQuestions) *
            100
          ).toFixed(2),
        )
      : 0;

  const score = correctCount;

  const newStatus = autoSubmitted
    ? "auto_submitted"
    : "submitted";

  const submittedAt =
    new Date().toISOString();

  const {
    data: updatedAttempt,
    error: updateError,
  } = await supabase
    .from("attempts")
    .update({
      score,
      percentage,
      submitted_at: submittedAt,
      status: newStatus,
    })
    .eq("id", attemptId)
    .eq("user_id", user.profile.id)
    .eq("status", "in_progress")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return {
      success: false,
      error:
        "Failed to submit examination.",
    };
  }

  if (!updatedAttempt) {
    const { data: currentAttempt } =
      await supabase
        .from("attempts")
        .select("status")
        .eq("id", attemptId)
        .eq("user_id", user.profile.id)
        .maybeSingle();

    if (
      currentAttempt?.status ===
        "submitted" ||
      currentAttempt?.status ===
        "auto_submitted"
    ) {
      return {
        success: true,
        attemptId,
      };
    }

    return {
      success: false,
      error:
        "The examination could not be submitted.",
    };
  }

  await supabase
    .from("exam_events")
    .insert({
      attempt_id: attemptId,
      event_type: autoSubmitted
        ? "auto_submitted"
        : "exam_submitted",
      metadata: {
        score,
        percentage,
        correct_count: correctCount,
        total_questions: totalQuestions,
      },
    });

  revalidatePath("/mocks");
  revalidatePath("/dashboard");
  revalidatePath("/results");
  revalidatePath(
    `/results/${attemptId}`,
  );

  return {
    success: true,
    attemptId,
  };
}