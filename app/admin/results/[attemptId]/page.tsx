import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    attemptId: string;
  }>;
};

export default async function AdminResultDetailPage({
  params,
}: PageProps) {
  await requireAdmin();

  const { attemptId } = await params;

  const supabase = await createClient();

  const { data: attempt, error: attemptError } =
    await supabase
      .from("attempts")
      .select(`
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
        profiles (
          full_name,
          email
        ),
        mocks (
          id,
          title,
          description,
          duration_minutes,
          passing_score
        ),
        exam_slots (
          starts_at,
          ends_at
        )
      `)
      .eq("id", attemptId)
      .single();

  if (attemptError || !attempt) {
    notFound();
  }

  const profile = Array.isArray(attempt.profiles)
    ? attempt.profiles[0]
    : attempt.profiles;

  const mock = Array.isArray(attempt.mocks)
    ? attempt.mocks[0]
    : attempt.mocks;

  const slot = Array.isArray(attempt.exam_slots)
    ? attempt.exam_slots[0]
    : attempt.exam_slots;

  /*
   * Load all questions in the mock.
   */
  const { data: mockQuestions } = await supabase
    .from("mock_questions")
    .select(`
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
          option_order,
          is_correct
        )
      )
    `)
    .eq("mock_id", attempt.mock_id)
    .order("question_order", {
      ascending: true,
    });

  /*
   * Load this candidate's answers.
   */
  const { data: answers } = await supabase
    .from("attempt_answers")
    .select(`
      question_id,
      selected_options,
      is_correct,
      answered_at
    `)
    .eq("attempt_id", attempt.id);

  /*
   * Load security / examination events.
   */
  const { data: events } = await supabase
    .from("exam_events")
    .select(`
      id,
      event_type,
      metadata,
      created_at
    `)
    .eq("attempt_id", attempt.id)
    .order("created_at", {
      ascending: true,
    });

  const answerMap = new Map(
    (answers ?? []).map((answer) => [
      answer.question_id,
      answer,
    ]),
  );

  const completed =
    attempt.status === "submitted" ||
    attempt.status === "auto_submitted";

  const passed =
    completed &&
    attempt.percentage !== null &&
    mock?.passing_score !== null &&
    mock?.passing_score !== undefined &&
    Number(attempt.percentage) >=
      Number(mock.passing_score);

  const securityEvents =
    (events ?? []).filter((event) =>
      [
        "tab_hidden",
        "tab_visible",
        "fullscreen_exited",
        "fullscreen_entered",
        "copy_attempt",
        "paste_attempt",
        "context_menu_attempt",
      ].includes(event.event_type),
    );

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="aws-grid min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* HEADER */}
          <div className="mb-8 border-b border-[#2d3544] pb-6">
            <Link
              href="/admin/results"
              className="mb-4 inline-block font-mono text-xs uppercase tracking-widest text-[#6b7280] hover:text-[#ff9900]"
            >
              ← Candidate Results
            </Link>

            <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#ff9900]">
              AWS LPU // RESULT DETAIL
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              {mock?.title || "Examination Result"}
            </h1>

            <div className="mt-3 text-sm text-[#9ca3af]">
              {profile?.full_name ||
                "Unknown Candidate"}
              {" · "}
              {profile?.email || "No email"}
            </div>
          </div>

          {/* RESULT SUMMARY */}
          <section className="mb-8 grid gap-px border border-[#2d3544] bg-[#2d3544] md:grid-cols-4">
            <ResultMetric
              label="STATUS"
              value={
                attempt.status
                  .replace("_", " ")
                  .toUpperCase()
              }
            />

            <ResultMetric
              label="SCORE"
              value={
                attempt.score !== null
                  ? String(attempt.score)
                  : "—"
              }
            />

            <ResultMetric
              label="PERCENTAGE"
              value={
                attempt.percentage !== null
                  ? `${attempt.percentage}%`
                  : "—"
              }
            />

            <ResultMetric
              label="RESULT"
              value={
                !completed
                  ? "PENDING"
                  : passed
                    ? "PASS"
                    : "FAIL"
              }
            />
          </section>

          {/* EXAM INFORMATION */}
          <section className="mb-8 border border-[#2d3544] bg-[#151e2d]">
            <SectionHeader title="Examination Information" />

            <div className="grid gap-px bg-[#2d3544] md:grid-cols-2 lg:grid-cols-4">
              <InfoItem
                label="Candidate"
                value={
                  profile?.full_name ||
                  "Unknown"
                }
              />

              <InfoItem
                label="Email"
                value={
                  profile?.email || "—"
                }
              />

              <InfoItem
                label="Duration"
                value={
                  mock
                    ? `${mock.duration_minutes} minutes`
                    : "—"
                }
              />

              <InfoItem
                label="Passing Score"
                value={
                  mock?.passing_score !==
                  null &&
                  mock?.passing_score !==
                    undefined
                    ? `${mock.passing_score}%`
                    : "Not configured"
                }
              />

              <InfoItem
                label="Exam Started"
                value={
                  attempt.started_at
                    ? formatDate(
                        attempt.started_at,
                      )
                    : "Not started"
                }
              />

              <InfoItem
                label="Submitted"
                value={
                  attempt.submitted_at
                    ? formatDate(
                        attempt.submitted_at,
                      )
                    : "Not submitted"
                }
              />

              <InfoItem
                label="Slot Start"
                value={
                  slot?.starts_at
                    ? formatDate(
                        slot.starts_at,
                      )
                    : "—"
                }
              />

              <InfoItem
                label="Slot End"
                value={
                  slot?.ends_at
                    ? formatDate(
                        slot.ends_at,
                      )
                    : "—"
                }
              />
            </div>
          </section>

          {/* ANSWER REVIEW */}
          <section className="mb-8 border border-[#2d3544] bg-[#151e2d]">
            <SectionHeader title="Answer Review" />

            <div className="divide-y divide-[#2d3544]">
              {(mockQuestions ?? []).map(
                (item, index) => {
                  const question = Array.isArray(
                    item.questions,
                  )
                    ? item.questions[0]
                    : item.questions;

                  if (!question) {
                    return null;
                  }

                  const answer =
                    answerMap.get(
                      question.id,
                    );

                  const selectedIds =
                    Array.isArray(
                      answer?.selected_options,
                    )
                      ? answer.selected_options.filter(
                          (
                            value,
                          ): value is string =>
                            typeof value ===
                            "string",
                        )
                      : [];

                  const correctIds =
                    question.question_options
                      .filter(
                        (option) =>
                          option.is_correct,
                      )
                      .map(
                        (option) =>
                          option.id,
                      );

                  const isCorrect =
                    answer?.is_correct ??
                    (selectedIds.length ===
                      correctIds.length &&
                      selectedIds.every(
                        (id) =>
                          correctIds.includes(
                            id,
                          ),
                      ));

                  return (
                    <div
                      key={question.id}
                      className="p-6"
                    >
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div>
                          <div className="font-mono text-xs uppercase tracking-widest text-[#6b7280]">
                            Question{" "}
                            {index + 1}
                          </div>

                          <h2 className="mt-2 text-base font-medium leading-relaxed">
                            {
                              question.question_text
                            }
                          </h2>
                        </div>

                        <span
                          className={`shrink-0 border px-2 py-1 font-mono text-[10px] uppercase ${
                            isCorrect
                              ? "border-[#ff9900] text-[#ff9900]"
                              : "border-[#3b4556] text-[#9ca3af]"
                          }`}
                        >
                          {answer
                            ? isCorrect
                              ? "Correct"
                              : "Incorrect"
                            : "Unanswered"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {[
                          ...question.question_options,
                        ]
                          .sort(
                            (a, b) =>
                              a.option_order -
                              b.option_order,
                          )
                          .map(
                            (
                              option,
                              optionIndex,
                            ) => {
                              const selected =
                                selectedIds.includes(
                                  option.id,
                                );

                              const correct =
                                option.is_correct;

                              return (
                                <div
                                  key={
                                    option.id
                                  }
                                  className={`flex items-start gap-3 border p-3 ${
                                    correct
                                      ? "border-[#ff9900]/50 bg-[#ff9900]/5"
                                      : selected
                                        ? "border-[#3b4556] bg-[#2d3544]"
                                        : "border-[#2d3544]"
                                  }`}
                                >
                                  <span className="font-mono text-xs text-[#6b7280]">
                                    {String.fromCharCode(
                                      65 +
                                        optionIndex,
                                    )}
                                  </span>

                                  <span className="flex-1 text-sm">
                                    {
                                      option.option_text
                                    }
                                  </span>

                                  <div className="flex gap-2 font-mono text-[9px] uppercase">
                                    {selected && (
                                      <span className="text-white">
                                        Selected
                                      </span>
                                    )}

                                    {correct && (
                                      <span className="text-[#ff9900]">
                                        Correct
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            },
                          )}
                      </div>

                      {answer?.answered_at && (
                        <div className="mt-3 font-mono text-[10px] text-[#6b7280]">
                          ANSWERED:{" "}
                          {formatDate(
                            answer.answered_at,
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </section>

          {/* SECURITY EVENTS */}
          <section className="border border-[#2d3544] bg-[#151e2d]">
            <SectionHeader
              title="Security & Examination Events"
              count={
                securityEvents.length
              }
            />

            {securityEvents.length > 0 ? (
              <div className="divide-y divide-[#2d3544]">
                {securityEvents.map(
                  (event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div>
                        <div
                          className={`font-mono text-xs uppercase ${
                            event.event_type.includes(
                              "attempt",
                            ) ||
                            event.event_type.includes(
                              "exited",
                            ) ||
                            event.event_type ===
                              "tab_hidden"
                              ? "text-[#ff9900]"
                              : "text-[#9ca3af]"
                          }`}
                        >
                          {formatEventType(
                            event.event_type,
                          )}
                        </div>

                        {event.metadata &&
                          Object.keys(
                            event.metadata,
                          ).length >
                            0 && (
                            <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-[#6b7280]">
                              {JSON.stringify(
                                event.metadata,
                              )}
                            </pre>
                          )}
                      </div>

                      <div className="shrink-0 font-mono text-[10px] text-[#6b7280]">
                        {formatDate(
                          event.created_at,
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="px-6 py-10 text-center font-mono text-xs uppercase tracking-widest text-[#6b7280]">
                No security events recorded
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHeader({
  title,
  count,
}: {
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#2d3544] px-5 py-4">
      <div className="font-mono text-xs uppercase tracking-widest text-[#9ca3af]">
        {title}
      </div>

      {count !== undefined && (
        <div className="font-mono text-[10px] text-[#6b7280]">
          {count} EVENT
          {count === 1 ? "" : "S"}
        </div>
      )}
    </div>
  );
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#151e2d] p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
        {label}
      </div>

      <div className="mt-2 text-xl font-bold">
        {value}
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#151e2d] p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
        {label}
      </div>

      <div className="mt-2 text-sm text-white">
        {value}
      </div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatEventType(value: string) {
  return value
    .replaceAll("_", " ")
    .toUpperCase();
}