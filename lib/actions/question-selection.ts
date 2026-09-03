"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DIFFICULTIES = [
  "easy",
  "medium",
  "hard",
] as const;

const QUESTION_TYPES = [
  "single",
  "multiple",
] as const;

type Difficulty =
  (typeof DIFFICULTIES)[number];

type QuestionType =
  (typeof QUESTION_TYPES)[number];

function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

function isDifficulty(
  value: string,
): value is Difficulty {
  return DIFFICULTIES.includes(
    value as Difficulty,
  );
}

function isQuestionType(
  value: string,
): value is QuestionType {
  return QUESTION_TYPES.includes(
    value as QuestionType,
  );
}

export async function getRandomQuestions({
  count,
  certificationId,
  difficulty = "all",
  questionType = "all",
  category = "all",
  excludeIds = [],
}: {
  count: number;
  certificationId: string;
  difficulty?: Difficulty | "all";
  questionType?: QuestionType | "all";
  category?: string;
  excludeIds?: string[];
}) {
  await requireAdmin();

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 500
  ) {
    return {
      success: false,
      error:
        "Question count must be between 1 and 500.",
      questionIds: [],
    };
  }

  if (!isUuid(certificationId)) {
    return {
      success: false,
      error: "Invalid certification.",
      questionIds: [],
    };
  }

  if (
    difficulty !== "all" &&
    !isDifficulty(difficulty)
  ) {
    return {
      success: false,
      error: "Invalid difficulty filter.",
      questionIds: [],
    };
  }

  if (
    questionType !== "all" &&
    !isQuestionType(questionType)
  ) {
    return {
      success: false,
      error: "Invalid question type filter.",
      questionIds: [],
    };
  }

  if (
    !Array.isArray(excludeIds) ||
    excludeIds.length > 500
  ) {
    return {
      success: false,
      error: "Invalid excluded question list.",
      questionIds: [],
    };
  }

  const uniqueExcludeIds = [
    ...new Set(excludeIds),
  ];

  if (
    uniqueExcludeIds.some(
      (id) =>
        typeof id !== "string" ||
        !isUuid(id),
    )
  ) {
    return {
      success: false,
      error: "Invalid question ID.",
      questionIds: [],
    };
  }

  const cleanCategory =
    typeof category === "string"
      ? category.trim()
      : "all";

  if (cleanCategory.length > 100) {
    return {
      success: false,
      error: "Category filter is too long.",
      questionIds: [],
    };
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.rpc(
      "get_random_question_ids",
      {
        question_count: count,
        certification_id_filter:
          certificationId,
        difficulty_filter:
          difficulty === "all"
            ? null
            : difficulty,
        question_type_filter:
          questionType === "all"
            ? null
            : questionType,
        category_filter:
          cleanCategory === "all"
            ? null
            : cleanCategory,
        excluded_ids: uniqueExcludeIds,
      },
    );

  if (error) {
    return {
      success: false,
      error:
        "Failed to generate random questions.",
      questionIds: [],
    };
  }

  const questionIds = Array.isArray(data)
    ? data
        .map(
          (question: { id: string }) =>
            question.id,
        )
        .filter(isUuid)
    : [];

  if (questionIds.length < count) {
    return {
      success: false,
      error: `Only ${questionIds.length} questions match the selected filters.`,
      questionIds,
    };
  }

  return {
    success: true,
    error: "",
    questionIds,
  };
}