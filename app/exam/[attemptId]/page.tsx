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

function normalizeSettings(value: unknown): Record<string, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, boolean> = {};

  for (const [key, setting] of Object.entries(value as Record<string, unknown>)) {
    if (typeof setting === "boolean") {
      result[key] = setting;
    }
  }

  return result;
}

function normalizeSelectedOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && isValidUuid(item),
      ),
    ),
  ];
}

export default async function ExamPage({ params }: PageProps) {
  const user = await requireCore();
  const { attemptId } = await params;

  const supabase = await createClient();
  const { data: attempt, error: attemptError } = await supabase
    .from("attempts")
    .select("id, user_id, mock_id, slot_id, started_at, status")
    .eq("id", attemptId)
    .maybeSingle();

  if (attemptError) {
    console.error("[EXAM DEBUG] Attempt query failed:", attemptError);
    throw new Error(`Attempt query failed: ${attemptError.message}`);
  }

  if (!attempt) {
    notFound();
  }

  if (attempt.user_id !== user.profile.id) {
    redirect("/mocks");
  }

  if (attempt.status === "submitted" || attempt.status === "auto_submitted") {
    redirect(`/results/${attempt.id}`);
  }

  if (attempt.status !== "in_progress" || !attempt.started_at) {
    redirect("/mocks");
  }

  const { data: mock, error: mockError } = await supabase
    .from("mocks")
    .select("id, title, duration_minutes, settings")
    .eq("id", attempt.mock_id)
    .maybeSingle();

  if (mockError) {
    console.error("[EXAM DEBUG] Mock query failed:", mockError);
    throw new Error(`Mock query failed: ${mockError.message}`);
  }

  if (!mock) {
    throw new Error("Exam mock was not found.");
  }

  if (!Number.isInteger(mock.duration_minutes) || mock.duration_minutes <= 0) {
    throw new Error("Invalid examination configuration.");
  }

  const startedAt = new Date(attempt.started_at).getTime();
  const deadline = startedAt + mock.duration_minutes * 60 * 1000;

  const { data: mockQuestions, error: questionsError } = await supabase
    .from("mock_questions")
    .select("question_id, question_order")
    .eq("mock_id", mock.id)
    .order("question_order", { ascending: true });

  if (questionsError) {
    console.error("[EXAM DEBUG] Mock questions query failed:", questionsError);
    throw new Error(`Mock questions query failed: ${questionsError.message}`);
  }

  const questionIds = (mockQuestions ?? []).map((item) => item.question_id);
  const { data: rawQuestions, error: rawQuestionsError } = questionIds.length
    ? await supabase
        .from("questions")
        .select("id, question_text, question_type, difficulty, category")
        .in("id", questionIds)
    : { data: [], error: null };

  if (rawQuestionsError) {
    console.error("[EXAM DEBUG] Questions query failed:", rawQuestionsError);
    throw new Error(`Questions query failed: ${rawQuestionsError.message}`);
  }

  const { data: rawOptions, error: optionsError } = questionIds.length
    ? await supabase
        .from("question_options")
        .select("id, question_id, option_text, option_order")
        .in("question_id", questionIds)
    : { data: [], error: null };

  if (optionsError) {
    console.error("[EXAM DEBUG] Options query failed:", optionsError);
    throw new Error(`Options query failed: ${optionsError.message}`);
  }

  const questionsById = new Map((rawQuestions ?? []).map((question) => [question.id, question]));
  type ExamOption = {
    id: string;
    question_id: string;
    option_text: string;
    option_order: number;
  };
  const optionsByQuestion = new Map<string, ExamOption[]>();
  for (const option of rawOptions ?? []) {
    const options = optionsByQuestion.get(option.question_id) ?? [];
    options.push(option);
    optionsByQuestion.set(option.question_id, options);
  }

  const questions = (mockQuestions ?? []).flatMap((item) => {
    const question = questionsById.get(item.question_id);
    if (!question) return [];
    return [{
      ...question,
      options: (optionsByQuestion.get(question.id) ?? []).sort(
        (a, b) => a.option_order - b.option_order,
      ),
    }];
  });

  const { data: existingAnswers, error: answersError } = await supabase
    .from("attempt_answers")
    .select("question_id, selected_options")
    .eq("attempt_id", attempt.id);

  if (answersError) {
    console.error("[EXAM DEBUG] Answers query failed:", answersError);
    throw new Error(`Answers query failed: ${answersError.message}`);
  }

  const validQuestionIds = new Set(questions.map((question) => question.id));
  const answers = (existingAnswers ?? [])
    .filter((answer) => validQuestionIds.has(answer.question_id))
    .map((answer) => ({
      question_id: answer.question_id,
      selected_options: normalizeSelectedOptions(answer.selected_options),
    }));

  return (
    <ExamRunner
      attemptId={attempt.id}
      mock={{
        id: mock.id,
        title: mock.title,
        duration_minutes: mock.duration_minutes,
        settings: normalizeSettings(mock.settings),
      }}
      questions={questions}
      existingAnswers={answers}
      deadline={deadline}
    />
  );
}
