import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MockEditor from "@/components/admin/mock-editor";

interface QuestionOption {
  id: string;
  option_text: string;
  option_order: number;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string | null;
  category: string | null;
  explanation: string | null;
  question_options: QuestionOption[];
}

export default async function MockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();

  const { id } = await params;

  const supabase = await createClient();

  const { data: mock, error } = await supabase
    .from("mocks")
    .select(`
      id,
      title,
      description,
      duration_minutes,
      passing_score,
      settings,
      status,
      created_at,
      updated_at,
      mock_questions (
        id,
        question_id,
        question_order,
        questions (
          id,
          question_text,
          question_type,
          difficulty,
          category,
          explanation,
          question_options (
            id,
            option_text,
            option_order,
            is_correct
          )
        )
      )
    `)
    .eq("id", id)
    .single();

  if (error || !mock) {
    notFound();
  }

  const questions: Question[] = mock.mock_questions
    .sort(
      (a, b) =>
        a.question_order - b.question_order,
    )
    .map((item) => {
      const question = Array.isArray(item.questions)
        ? item.questions[0]
        : item.questions;

      if (!question) {
        return null;
      }

      return {
        id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        difficulty: question.difficulty,
        category: question.category,
        explanation: question.explanation,
        question_options: Array.isArray(
          question.question_options,
        )
          ? question.question_options.map(
              (option: QuestionOption) => ({
                id: option.id,
                option_text: option.option_text,
                option_order: option.option_order,
                is_correct: option.is_correct,
              }),
            )
          : [],
      };
    })
    .filter(
      (question): question is Question =>
        question !== null,
    );

  return (
    <MockEditor
      mock={{
        id: mock.id,
        title: mock.title,
        description: mock.description,
        duration_minutes: mock.duration_minutes,
        passing_score: mock.passing_score,
        settings:
          (mock.settings as Record<
            string,
            boolean
          >) ?? {},
        status: mock.status,
      }}
      questions={questions}
    />
  );
}