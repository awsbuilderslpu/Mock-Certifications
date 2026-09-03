import { notFound, redirect } from "next/navigation";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import ExamRunner from "@/components/exam/exam-runner";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isValidDate(value: string) {
  const time = new Date(value).getTime();

  return !Number.isNaN(time);
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

  const result: Record<string, boolean> = {};

  for (const [key, setting] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (typeof setting === "boolean") {
      result[key] = setting;
    }
  }

  return result;
}

function normalizeSelectedOptions(
  value: unknown,
): string[] {
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

export default async function ExamPage({
  params,
}: PageProps) {
  const user = await requireCore();
  const { attemptId } = await params;

  if (!isValidUuid(attemptId)) {
    notFound();
  }

  const supabase = await createClient();

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
          id,
          title,
          duration_minutes,
          settings,
          status
        ),
        exam_slots (
          id,
          mock_id,
          starts_at,
          ends_at,
          status
        )
      `,
    )
    .eq("id", attemptId)
    .eq("user_id", user.profile.id)
    .maybeSingle();

  if (attemptError || !attempt) {
    notFound();
  }

  if (
    attempt.status === "submitted" ||
    attempt.status === "auto_submitted"
  ) {
    redirect(`/results/${attempt.id}`);
  }

  if (
    attempt.status !== "in_progress" ||
    !attempt.started_at
  ) {
    redirect("/mocks");
  }

  const mock = Array.isArray(attempt.mocks)
    ? attempt.mocks[0]
    : attempt.mocks;

  const slot = Array.isArray(attempt.exam_slots)
    ? attempt.exam_slots[0]
    : attempt.exam_slots;

  if (!mock || !slot) {
    notFound();
  }

  if (
    mock.id !== attempt.mock_id ||
    slot.id !== attempt.slot_id ||
    slot.mock_id !== attempt.mock_id
  ) {
    notFound();
  }

  if (mock.status !== "published") {
    redirect("/mocks");
  }

  if (slot.status !== "scheduled") {
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

  if (
    !isValidDate(attempt.started_at) ||
    !isValidDate(slot.starts_at) ||
    !isValidDate(slot.ends_at)
  ) {
    throw new Error(
      "Invalid examination timing.",
    );
  }

  const startedAt = new Date(
    attempt.started_at,
  ).getTime();

  const startsAt = new Date(
    slot.starts_at,
  ).getTime();

  const endsAt = new Date(
    slot.ends_at,
  ).getTime();

  if (endsAt <= startsAt) {
    throw new Error(
      "Invalid examination schedule.",
    );
  }

  const durationDeadline =
    startedAt +
    mock.duration_minutes * 60 * 1000;

  const deadline = Math.min(
    durationDeadline,
    endsAt,
  );

  if (new Date().getTime() >= deadline) {
    redirect(`/results/${attempt.id}`);
  }

  const {
    data: mockQuestions,
    error: questionsError,
  } = await supabase
    .from("mock_questions")
    .select(
      `
        question_id,
        question_order,
        questions (
          id,
          question_text,
          question_type,
          difficulty,
          category,
          question_options (
            id,
            option_text,
            option_order
          )
        )
      `,
    )
    .eq("mock_id", mock.id)
    .order("question_order", {
      ascending: true,
    });

  if (questionsError) {
    throw new Error(
      "Failed to load examination.",
    );
  }

  const questions = (
    mockQuestions ?? []
  ).flatMap((item) => {
    const question = Array.isArray(
      item.questions,
    )
      ? item.questions[0]
      : item.questions;

    if (!question) {
      return [];
    }

    if (
      question.id !== item.question_id
    ) {
      return [];
    }

    const options = [
      ...(question.question_options ?? []),
    ]
      .filter(
        (option) =>
          isValidUuid(option.id) &&
          typeof option.option_text ===
            "string" &&
          Number.isInteger(
            option.option_order,
          ),
      )
      .sort(
        (a, b) =>
          a.option_order -
          b.option_order,
      );

    if (options.length === 0) {
      return [];
    }

    return [
      {
        id: question.id,
        question_text:
          question.question_text,
        question_type:
          question.question_type,
        difficulty:
          question.difficulty,
        category:
          question.category,
        options,
      },
    ];
  });

  if (questions.length === 0) {
    throw new Error(
      "This examination contains no valid questions.",
    );
  }

  if (
    questions.length !==
    (mockQuestions ?? []).length
  ) {
    throw new Error(
      "This examination contains invalid question data.",
    );
  }

  const {
    data: existingAnswers,
    error: answersError,
  } = await supabase
    .from("attempt_answers")
    .select(
      "question_id, selected_options",
    )
    .eq("attempt_id", attempt.id);

  if (answersError) {
    throw new Error(
      "Failed to load examination answers.",
    );
  }

  const validQuestionIds = new Set(
    questions.map(
      (question) => question.id,
    ),
  );

  const answers = (
    existingAnswers ?? []
  )
    .filter((answer) =>
      validQuestionIds.has(
        answer.question_id,
      ),
    )
    .map((answer) => ({
      question_id:
        answer.question_id,
      selected_options:
        normalizeSelectedOptions(
          answer.selected_options,
        ),
    }));

  return (
    <ExamRunner
      attemptId={attempt.id}
      mock={{
        id: mock.id,
        title: mock.title,
        duration_minutes:
          mock.duration_minutes,
        settings: normalizeSettings(
          mock.settings,
        ),
      }}
      questions={questions}
      existingAnswers={answers}
      deadline={deadline}
    />
  );
}