import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

type AttemptAnswer = {
  question_id: string;
  selected_options: string[];
  is_correct: boolean | null;
};

type MockData = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number | null;
};

type SlotData = {
  id: string;
  starts_at: string;
  ends_at: string;
};

type AttemptData = {
  id: string;
  user_id: string;
  mock_id: string;
  slot_id: string;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  percentage: number | null;
  status: string;
  created_at: string;
  mocks: MockData | MockData[] | null;
  exam_slots: SlotData | SlotData[] | null;
};

type MockQuestion = {
  question_id: string;
  question_order: number;
  question:
    | {
        id: string;
        question_text: string;
        category: string | null;
        explanation: string | null;
        question_options: QuestionOption[];
      }
    | {
        id: string;
        question_text: string;
        category: string | null;
        explanation: string | null;
        question_options: QuestionOption[];
      }[]
    | null;
};

type QuestionOption = {
  id: string;
  option_text: string;
  option_order: number;
  is_correct: boolean;
};

function getSingleRelation<T>(
  relation: T | T[] | null | undefined,
): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function normalizeSelectedOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string => typeof item === "string",
  );
}

export default async function ResultsPage({
  params,
}: PageProps) {
  const user = await requireCore();
  const { attemptId } = await params;

  if (!attemptId) {
    notFound();
  }

  const supabase = await createClient();

  // ---------------------------------------------------------
  // FETCH ATTEMPT
  // ---------------------------------------------------------

  const {
    data: rawAttempt,
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
        submitted_at,
        score,
        percentage,
        status,
        created_at,
        mocks (
          id,
          title,
          description,
          duration_minutes,
          passing_score
        ),
        exam_slots (
          id,
          starts_at,
          ends_at
        )
      `,
    )
    .eq("id", attemptId)
    .single();

  if (attemptError || !rawAttempt) {
    notFound();
  }

  const attempt =
    rawAttempt as unknown as AttemptData;

  // ---------------------------------------------------------
  // OWNERSHIP CHECK
  // ---------------------------------------------------------

  if (attempt.user_id !== user.profile.id) {
    redirect("/results");
  }

  // ---------------------------------------------------------
  // ONLY SHOW SUBMITTED ATTEMPTS
  // ---------------------------------------------------------

  if (
    attempt.status !== "submitted" &&
    attempt.status !== "auto_submitted"
  ) {
    redirect(`/exam/${attempt.id}`);
  }

  const mock = getSingleRelation(attempt.mocks);

  // ---------------------------------------------------------
  // FETCH ANSWERS
  // ---------------------------------------------------------

  const { data: rawAnswers } = await supabase
    .from("attempt_answers")
    .select(
      `
        question_id,
        selected_options,
        is_correct
      `,
    )
    .eq("attempt_id", attempt.id);

  const attemptAnswers: AttemptAnswer[] = (
    rawAnswers ?? []
  ).map((answer) => ({
    question_id: answer.question_id,
    selected_options: normalizeSelectedOptions(
      answer.selected_options,
    ),
    is_correct: answer.is_correct,
  }));

  // ---------------------------------------------------------
  // FETCH MOCK QUESTIONS
  // ---------------------------------------------------------

  const { data: rawMockQuestions } = await supabase
    .from("mock_questions")
    .select(
      `
        question_id,
        question_order,
        question:questions (
          id,
          question_text,
          category,
          explanation,
          question_options (
            id,
            option_text,
            option_order,
            is_correct
          )
        )
      `,
    )
    .eq("mock_id", attempt.mock_id)
    .order("question_order", {
      ascending: true,
    });

  const questions =
    (rawMockQuestions ?? []) as unknown as MockQuestion[];

  // ---------------------------------------------------------
  // RESULT METRICS
  // ---------------------------------------------------------

  const totalQuestions = questions.length;

  const answeredQuestions = attemptAnswers.filter(
    (answer) => answer.selected_options.length > 0,
  ).length;

  const correctQuestions = attemptAnswers.filter(
    (answer) => answer.is_correct === true,
  ).length;

  const incorrectQuestions = attemptAnswers.filter(
    (answer) => answer.is_correct === false,
  ).length;

  const unansweredQuestions = Math.max(
    0,
    totalQuestions - answeredQuestions,
  );

  const percentage = Number(
    attempt.percentage ?? 0,
  );

  const score = Number(
    attempt.score ?? 0,
  );

  const passingScore =
    mock?.passing_score !== null &&
    mock?.passing_score !== undefined
      ? Number(mock.passing_score)
      : null;

  const passed =
    passingScore === null
      ? percentage >= 70
      : percentage >= passingScore;

  // ---------------------------------------------------------
  // CATEGORY PERFORMANCE
  // ---------------------------------------------------------

  const answerMap = new Map<
    string,
    AttemptAnswer
  >(
    attemptAnswers.map((answer) => [
      answer.question_id,
      answer,
    ]),
  );

  const categoryMap = new Map<
    string,
    {
      total: number;
      correct: number;
    }
  >();

  for (const item of questions) {
    const question = getSingleRelation(
      item.question,
    );

    const category =
      question?.category || "General";

    const current =
      categoryMap.get(category) ?? {
        total: 0,
        correct: 0,
      };

    current.total += 1;

    const answer = answerMap.get(
      item.question_id,
    );

    if (answer?.is_correct === true) {
      current.correct += 1;
    }

    categoryMap.set(category, current);
  }

  const categoryPerformance = Array.from(
    categoryMap.entries(),
  )
    .map(([category, data]) => ({
      category,
      total: data.total,
      correct: data.correct,
      percentage:
        data.total > 0
          ? Math.round(
              (data.correct / data.total) * 100,
            )
          : 0,
    }))
    .sort(
      (a, b) => b.percentage - a.percentage,
    );

  // ---------------------------------------------------------
  // TIME
  // ---------------------------------------------------------

  const startedAt = attempt.started_at
    ? new Date(attempt.started_at)
    : null;

  const submittedAt = attempt.submitted_at
    ? new Date(attempt.submitted_at)
    : null;

  let durationSeconds = 0;

  if (startedAt && submittedAt) {
    durationSeconds = Math.max(
      0,
      Math.floor(
        (submittedAt.getTime() -
          startedAt.getTime()) /
          1000,
      ),
    );
  }

  const durationMinutes = Math.floor(
    durationSeconds / 60,
  );

  const durationRemainingSeconds =
    durationSeconds % 60;

  const durationLabel =
    startedAt && submittedAt
      ? `${durationMinutes}m ${String(
          durationRemainingSeconds,
        ).padStart(2, "0")}s`
      : "—";

  const submittedLabel = submittedAt
    ? submittedAt.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="aws-grid min-h-screen">
        <div className="mx-auto max-w-7xl px-5 py-8">
          {/* HEADER */}

          <header className="mb-8 flex flex-col justify-between gap-5 border-b border-[#3b4556] pb-6 md:flex-row md:items-end">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#ff9900]">
                Examination Result
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                {mock?.title ?? "Mock Examination"}
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Your examination has been
                successfully submitted. Here is
                your final performance summary.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/mocks"
                className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                My Mocks
              </Link>

              <Link
                href="/dashboard"
                className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
              >
                Dashboard
              </Link>
            </div>
          </header>

          {/* RESULT HERO */}

          <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div
              className={`relative overflow-hidden border ${
                passed
                  ? "border-green-500/40"
                  : "border-red-500/40"
              } bg-[#151e2d]`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 ${
                  passed
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />

              <div className="p-7">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                      Final Status
                    </div>

                    <div
                      className={`mt-3 text-5xl font-black tracking-tight ${
                        passed
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {passed ? "PASSED" : "FAILED"}
                    </div>
                  </div>

                  <div
                    className={`flex h-20 w-20 items-center justify-center border font-mono text-xl font-bold ${
                      passed
                        ? "border-green-500/40 bg-green-500/10 text-green-400"
                        : "border-red-500/40 bg-red-500/10 text-red-400"
                    }`}
                  >
                    {Math.round(percentage)}%
                  </div>
                </div>

                <div className="mt-8">
                  <div className="mb-2 flex items-end justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-gray-500">
                      Overall Score
                    </span>

                    <span className="font-mono text-sm text-gray-300">
                      {score} / {totalQuestions}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden bg-[#0d1420]">
                    <div
                      className={`h-full ${
                        passed
                          ? "bg-green-500"
                          : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, percentage),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6 border-t border-[#2d3544] pt-5">
                  <div className="text-sm leading-6 text-gray-400">
                    {passed
                      ? "Congratulations. You achieved the required passing score for this examination."
                      : "You did not reach the required passing score for this examination."}
                  </div>
                </div>
              </div>
            </div>

            {/* SCORE DETAILS */}

            <div className="border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#3b4556] px-5 py-4">
                <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Score Details
                </div>
              </div>

              <div className="divide-y divide-[#2d3544]">
                <Metric
                  label="Score"
                  value={`${score} / ${totalQuestions}`}
                />

                <Metric
                  label="Percentage"
                  value={`${percentage.toFixed(2)}%`}
                />

                <Metric
                  label="Passing Score"
                  value={
                    passingScore !== null
                      ? `${passingScore}%`
                      : "Not specified"
                  }
                />

                <Metric
                  label="Correct"
                  value={`${correctQuestions}`}
                  valueClass="text-green-400"
                />

                <Metric
                  label="Incorrect"
                  value={`${incorrectQuestions}`}
                  valueClass="text-red-400"
                />

                <Metric
                  label="Unanswered"
                  value={`${unansweredQuestions}`}
                  valueClass="text-yellow-400"
                />
              </div>
            </div>
          </section>

          {/* ATTEMPT INFORMATION */}

          <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Attempt Information
              </div>
            </div>

            <div className="grid gap-px bg-[#2d3544] sm:grid-cols-2 lg:grid-cols-4">
              <InfoBlock
                label="Submitted"
                value={submittedLabel}
              />

              <InfoBlock
                label="Time Taken"
                value={durationLabel}
              />

              <InfoBlock
                label="Exam Duration"
                value={
                  mock?.duration_minutes
                    ? `${mock.duration_minutes} min`
                    : "—"
                }
              />

              <InfoBlock
                label="Attempt ID"
                value={attempt.id}
                mono
              />
            </div>
          </section>

          {/* QUESTION SUMMARY */}

          <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Question Summary
              </div>
            </div>

            <div className="grid gap-px bg-[#2d3544] md:grid-cols-3">
              <SummaryCard
                label="Correct"
                value={correctQuestions}
                description="Questions answered correctly"
                className="text-green-400"
              />

              <SummaryCard
                label="Incorrect"
                value={incorrectQuestions}
                description="Questions answered incorrectly"
                className="text-red-400"
              />

              <SummaryCard
                label="Unanswered"
                value={unansweredQuestions}
                description="Questions left unanswered"
                className="text-yellow-400"
              />
            </div>
          </section>

          {/* CATEGORY PERFORMANCE */}

          <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Question Review
              </div>
            </div>

            <div className="divide-y divide-[#2d3544]">
              {questions.map((item, index) => {
                const question = getSingleRelation(item.question);

                if (!question) {
                  return null;
                }

                const answer = answerMap.get(item.question_id);
                const selectedIds = answer?.selected_options ?? [];
                const correctIds = question.question_options
                  .filter((option) => option.is_correct)
                  .map((option) => option.id);
                const isUnanswered = selectedIds.length === 0;
                const isCorrect = answer?.is_correct === true;

                return (
                  <div key={question.id} className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-mono text-xs uppercase tracking-widest text-[#6b7280]">
                          Question {index + 1}
                        </div>
                        <h2 className="mt-2 text-base font-medium leading-relaxed">
                          {question.question_text}
                        </h2>
                      </div>
                      <span className={`shrink-0 border px-2 py-1 font-mono text-[10px] uppercase ${
                        isUnanswered
                          ? "border-yellow-500/50 text-yellow-400"
                          : isCorrect
                            ? "border-green-500/50 text-green-400"
                            : "border-red-500/50 text-red-400"
                      }`}>
                        {isUnanswered ? "Unanswered" : isCorrect ? "Correct" : "Incorrect"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {[...question.question_options]
                        .sort((a, b) => a.option_order - b.option_order)
                        .map((option, optionIndex) => {
                          const selected = selectedIds.includes(option.id);
                          return (
                            <div
                              key={option.id}
                              className={`flex items-start gap-3 border p-3 ${
                                option.is_correct
                                  ? "border-green-500/50 bg-green-500/5"
                                  : selected
                                    ? "border-red-500/50 bg-red-500/5"
                                    : "border-[#2d3544]"
                              }`}
                            >
                              <span className="font-mono text-xs text-[#6b7280]">
                                {String.fromCharCode(65 + optionIndex)}
                              </span>
                              <span className="flex-1 text-sm">
                                {option.option_text}
                              </span>
                              <div className="flex gap-2 font-mono text-[9px] uppercase">
                                {selected && <span className="text-white">Selected</span>}
                                {option.is_correct && <span className="text-green-400">Correct</span>}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {question.explanation && (
                      <details className="mt-4 border border-[#3b4556]">
                        <summary className="cursor-pointer px-4 py-3 font-mono text-xs uppercase tracking-wider text-[#ff9900]">
                          View Explanation
                        </summary>
                        <p className="border-t border-[#3b4556] px-4 py-4 text-sm leading-6 text-gray-300">
                          {question.explanation}
                        </p>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {categoryPerformance.length > 0 && (
            <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#3b4556] px-5 py-4">
                <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Performance by Category
                </div>
              </div>

              <div className="divide-y divide-[#2d3544]">
                {categoryPerformance.map(
                  (category) => (
                    <div
                      key={category.category}
                      className="px-5 py-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-medium text-gray-200">
                            {category.category}
                          </div>

                          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-gray-600">
                            {category.correct} /{" "}
                            {category.total} correct
                          </div>
                        </div>

                        <div className="font-mono text-sm text-gray-300">
                          {category.percentage}%
                        </div>
                      </div>

                      <div className="mt-3 h-2 bg-[#0d1420]">
                        <div
                          className={`h-full ${
                            category.percentage >= 70
                              ? "bg-green-500"
                              : category.percentage >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{
                            width: `${category.percentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </section>
          )}

          {/* SECURITY */}

          <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Examination Security
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3">
              <SecurityStatus
                label="Submission"
                value={
                  attempt.status ===
                  "auto_submitted"
                    ? "Automatic"
                    : "Candidate Submitted"
                }
              />

              <SecurityStatus
                label="Screen Monitoring"
                value="Enabled"
              />

              <SecurityStatus
                label="Browser Monitoring"
                value="Enabled"
              />
            </div>

            <div className="border-t border-[#2d3544] px-5 py-4 text-xs leading-5 text-gray-500">
              Security events recorded during the
              examination are retained with the
              attempt and may be reviewed by
              authorized administrators.
            </div>
          </section>

          {/* FOOTER ACTIONS */}

          <div className="mt-8 flex flex-col gap-3 border-t border-[#3b4556] pt-6 sm:flex-row">
            <Link
              href="/mocks"
              className="border border-[#3b4556] px-5 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
            >
              Back to Mocks
            </Link>

            <Link
              href="/dashboard"
              className="bg-[#ff9900] px-5 py-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------
// COMPONENTS
// ---------------------------------------------------------

function Metric({
  label,
  value,
  valueClass = "text-gray-200",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span
        className={`font-mono text-sm font-medium ${valueClass}`}
      >
        {value}
      </span>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-[#151e2d] px-5 py-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </div>

      <div
        className={`mt-2 truncate text-sm text-gray-200 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
  className,
}: {
  label: string;
  value: number;
  description: string;
  className: string;
}) {
  return (
    <div className="bg-[#151e2d] px-6 py-6">
      <div className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </div>

      <div
        className={`mt-2 text-4xl font-bold ${className}`}
      >
        {value}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {description}
      </div>
    </div>
  );
}

function SecurityStatus({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border border-[#3b4556] bg-[#111827] px-4 py-4">
      <div className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
        <span className="h-2 w-2 bg-green-400" />
        {value}
      </div>
    </div>
  );
}