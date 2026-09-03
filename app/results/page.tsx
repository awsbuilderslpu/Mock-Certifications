import Link from "next/link";
import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type Attempt = {
  id: string;
  mock_id: string;
  slot_id: string;
  started_at: string | null;
  submitted_at: string | null;
  score: number | null;
  percentage: number | null;
  status: "submitted" | "auto_submitted";
  created_at: string;
};

type Mock = {
  id: string;
  title: string;
  duration_minutes: number;
  passing_score: number | null;
};

type Slot = {
  id: string;
  starts_at: string;
  ends_at: string;
};

export default async function ResultsPage() {
  const user = await requireCore();
  const supabase = await createClient();

  // ---------------------------------------------------------
  // FETCH USER ATTEMPTS
  // ---------------------------------------------------------

  const { data: attemptsData, error: attemptsError } =
    await supabase
      .from("attempts")
      .select(
        `
          id,
          mock_id,
          slot_id,
          started_at,
          submitted_at,
          score,
          percentage,
          status,
          created_at
        `,
      )
      .eq("user_id", user.profile.id)
      .in("status", ["submitted", "auto_submitted"])
      .order("submitted_at", {
        ascending: false,
      });

  if (attemptsError) {
    console.error(
      "Failed to load results:",
      attemptsError,
    );
  }

  const attempts = (attemptsData ?? []) as Attempt[];

  // ---------------------------------------------------------
  // FETCH MOCKS
  // ---------------------------------------------------------

  const mockIds = [
    ...new Set(
      attempts.map((attempt) => attempt.mock_id),
    ),
  ];

  let mocks: Mock[] = [];

  if (mockIds.length > 0) {
    const { data: mocksData } = await supabase
      .from("mocks")
      .select(
        `
          id,
          title,
          duration_minutes,
          passing_score
        `,
      )
      .in("id", mockIds);

    mocks = (mocksData ?? []) as Mock[];
  }

  const mockMap = new Map(
    mocks.map((mock) => [mock.id, mock]),
  );

  // ---------------------------------------------------------
  // FETCH SLOTS
  // ---------------------------------------------------------

  const slotIds = [
    ...new Set(
      attempts.map((attempt) => attempt.slot_id),
    ),
  ];

  let slots: Slot[] = [];

  if (slotIds.length > 0) {
    const { data: slotsData } = await supabase
      .from("exam_slots")
      .select(
        `
          id,
          starts_at,
          ends_at
        `,
      )
      .in("id", slotIds);

    slots = (slotsData ?? []) as Slot[];
  }

  const slotMap = new Map(
    slots.map((slot) => [slot.id, slot]),
  );

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------

  const totalAttempts = attempts.length;

  const passedAttempts = attempts.filter(
    (attempt) => {
      const mock = mockMap.get(
        attempt.mock_id,
      );

      const percentage = Number(
        attempt.percentage ?? 0,
      );

      const passingScore =
        mock?.passing_score !== null &&
        mock?.passing_score !== undefined
          ? Number(mock.passing_score)
          : 70;

      return percentage >= passingScore;
    },
  ).length;

  const failedAttempts =
    totalAttempts - passedAttempts;

  const percentages = attempts.map((attempt) =>
    Number(attempt.percentage ?? 0),
  );

  const averageScore =
    percentages.length > 0
      ? percentages.reduce(
          (sum, value) => sum + value,
          0,
        ) / percentages.length
      : 0;

  const personalBest =
    percentages.length > 0
      ? Math.max(...percentages)
      : 0;

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
                Examination Results
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                My Results
              </h1>

              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Review your completed mock examinations,
                scores, and performance history.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/mocks"
                className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Browse Mocks
              </Link>

              <Link
                href="/dashboard"
                className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
              >
                Dashboard
              </Link>
            </div>
          </header>

          {/* SUMMARY */}

          <section className="grid gap-px border border-[#3b4556] bg-[#3b4556] sm:grid-cols-2 lg:grid-cols-5">
            <SummaryMetric
              label="Total Attempts"
              value={totalAttempts.toString()}
            />

            <SummaryMetric
              label="Passed"
              value={passedAttempts.toString()}
              valueClass="text-green-400"
            />

            <SummaryMetric
              label="Failed"
              value={failedAttempts.toString()}
              valueClass="text-red-400"
            />

            <SummaryMetric
              label="Average Score"
              value={`${averageScore.toFixed(1)}%`}
            />

            <SummaryMetric
              label="Personal Best"
              value={`${personalBest.toFixed(1)}%`}
              valueClass="text-[#ff9900]"
            />
          </section>

          {/* RESULTS */}

          <section className="mt-6 border border-[#3b4556] bg-[#151e2d]">
            <div className="flex items-center justify-between border-b border-[#3b4556] px-5 py-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Result History
                </div>

                <div className="mt-1 text-xs text-gray-600">
                  {totalAttempts} completed{" "}
                  {totalAttempts === 1
                    ? "attempt"
                    : "attempts"}
                </div>
              </div>
            </div>

            {attempts.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-[#2d3544]">
                {attempts.map((attempt) => {
                  const mock = mockMap.get(
                    attempt.mock_id,
                  );

                  const slot = slotMap.get(
                    attempt.slot_id,
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
                      ? Number(
                          mock.passing_score,
                        )
                      : 70;

                  const passed =
                    percentage >= passingScore;

                  const submittedAt =
                    attempt.submitted_at
                      ? new Date(
                          attempt.submitted_at,
                        )
                      : null;

                  const submittedLabel =
                    submittedAt
                      ? submittedAt.toLocaleString(
                          "en-IN",
                          {
                            dateStyle: "medium",
                            timeStyle: "short",
                          },
                        )
                      : "—";

                  const durationSeconds =
                    attempt.started_at &&
                    attempt.submitted_at
                      ? Math.max(
                          0,
                          Math.floor(
                            (new Date(
                              attempt.submitted_at,
                            ).getTime() -
                              new Date(
                                attempt.started_at,
                              ).getTime()) /
                              1000,
                          ),
                        )
                      : 0;

                  const durationMinutes =
                    Math.floor(
                      durationSeconds / 60,
                    );

                  const durationRemainder =
                    durationSeconds % 60;

                  const durationLabel =
                    attempt.started_at &&
                    attempt.submitted_at
                      ? `${durationMinutes}m ${String(
                          durationRemainder,
                        ).padStart(2, "0")}s`
                      : "—";

                  return (
                    <div
                      key={attempt.id}
                      className="px-5 py-5 transition hover:bg-[#182234]"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        {/* MOCK INFO */}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-base font-semibold text-gray-100">
                              {mock?.title ??
                                "Mock Examination"}
                            </h2>

                            <span
                              className={`border px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
                                passed
                                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                                  : "border-red-500/30 bg-red-500/10 text-red-400"
                              }`}
                            >
                              {passed
                                ? "Passed"
                                : "Failed"}
                            </span>

                            {attempt.status ===
                              "auto_submitted" && (
                              <span className="border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-yellow-400">
                                Auto Submitted
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-gray-600">
                            <span>
                              Submitted:{" "}
                              {submittedLabel}
                            </span>

                            <span>
                              Duration:{" "}
                              {durationLabel}
                            </span>

                            {slot && (
                              <span>
                                Slot:{" "}
                                {new Date(
                                  slot.starts_at,
                                ).toLocaleDateString(
                                  "en-IN",
                                  {
                                    dateStyle:
                                      "medium",
                                  },
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* SCORE */}

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-gray-600">
                              Score
                            </div>

                            <div className="mt-1 font-mono text-lg font-bold text-gray-200">
                              {score}
                            </div>
                          </div>

                          <div className="h-10 w-px bg-[#2d3544]" />

                          <div className="text-right">
                            <div className="font-mono text-[9px] uppercase tracking-wider text-gray-600">
                              Result
                            </div>

                            <div
                              className={`mt-1 font-mono text-lg font-bold ${
                                passed
                                  ? "text-green-400"
                                  : "text-red-400"
                              }`}
                            >
                              {percentage.toFixed(1)}%
                            </div>
                          </div>

                          <Link
                            href={`/results/${attempt.id}`}
                            className="border border-[#3b4556] px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900]"
                          >
                            View Result
                          </Link>
                        </div>
                      </div>

                      {/* SCORE BAR */}

                      <div className="mt-5">
                        <div className="h-1.5 bg-[#0d1420]">
                          <div
                            className={`h-full ${
                              passed
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  0,
                                  percentage,
                                ),
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-wider text-gray-700">
                          <span>
                            Passing:{" "}
                            {passingScore}%
                          </span>

                          <span>
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* FOOTER */}

          <div className="mt-8 flex flex-col gap-3 border-t border-[#3b4556] pt-6 sm:flex-row">
            <Link
              href="/mocks"
              className="border border-[#3b4556] px-5 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
            >
              Take Another Mock
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

function SummaryMetric({
  label,
  value,
  valueClass = "text-gray-200",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#151e2d] px-5 py-5">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">
        {label}
      </div>

      <div
        className={`mt-2 font-mono text-2xl font-bold ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="font-mono text-xs uppercase tracking-[0.2em] text-gray-600">
        No Results
      </div>

      <h2 className="mt-3 text-xl font-semibold text-gray-200">
        No completed examinations yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        Once you complete a mock examination,
        your score and performance details will
        appear here.
      </p>

      <Link
        href="/mocks"
        className="mt-6 inline-block bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
      >
        Browse Available Mocks
      </Link>
    </div>
  );
}