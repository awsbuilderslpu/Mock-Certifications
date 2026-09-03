import Link from "next/link";

import { requireCore } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !Number.isNaN(
      new Date(value).getTime(),
    )
  );
}

export default async function MocksPage() {
  const user = await requireCore();
  const supabase = await createClient();

  const now = new Date();

  const {
    data: slots,
    error: slotsError,
  } = await supabase
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
          title,
          description,
          duration_minutes,
          passing_score,
          status,
          settings
        )
      `,
    )
    .eq("status", "scheduled")
    .lte(
      "starts_at",
      now.toISOString(),
    )
    .gt(
      "ends_at",
      now.toISOString(),
    )
    .order("ends_at", {
      ascending: true,
    });

  if (slotsError) {
    throw new Error(
      "Failed to load examinations.",
    );
  }

  const validSlots = (
    slots ?? []
  ).filter((slot) => {
    const mock = Array.isArray(slot.mocks)
      ? slot.mocks[0]
      : slot.mocks;

    if (!mock) {
      return false;
    }

    if (
      !isValidUuid(slot.id) ||
      !isValidUuid(slot.mock_id) ||
      !isValidUuid(mock.id)
    ) {
      return false;
    }

    if (slot.mock_id !== mock.id) {
      return false;
    }

    if (mock.status !== "published") {
      return false;
    }

    if (
      !isValidDate(slot.starts_at) ||
      !isValidDate(slot.ends_at)
    ) {
      return false;
    }

    const startsAt = new Date(
      slot.starts_at,
    ).getTime();

    const endsAt = new Date(
      slot.ends_at,
    ).getTime();

    if (endsAt <= startsAt) {
      return false;
    }

    if (
      endsAt <= now.getTime() ||
      startsAt > now.getTime()
    ) {
      return false;
    }

    if (
      !Number.isInteger(
        mock.duration_minutes,
      ) ||
      mock.duration_minutes <= 0
    ) {
      return false;
    }

    return true;
  });

  const slotIds = validSlots.map(
    (slot) => slot.id,
  );

  const {
    data: attempts,
    error: attemptsError,
  } = slotIds.length
    ? await supabase
        .from("attempts")
        .select(
          "id, slot_id, status, percentage",
        )
        .eq(
          "user_id",
          user.profile.id,
        )
        .in("slot_id", slotIds)
    : {
        data: [],
        error: null,
      };

  if (attemptsError) {
    throw new Error(
      "Failed to load examination attempts.",
    );
  }

  const attemptMap = new Map<
    string,
    {
      id: string;
      slot_id: string;
      status: string;
      percentage: number | null;
    }
  >();

  for (const attempt of attempts ?? []) {
    if (
      !isValidUuid(attempt.id) ||
      !isValidUuid(attempt.slot_id)
    ) {
      continue;
    }

    if (
      attempt.slot_id &&
      !attemptMap.has(attempt.slot_id)
    ) {
      attemptMap.set(
        attempt.slot_id,
        {
          id: attempt.id,
          slot_id: attempt.slot_id,
          status: attempt.status,
          percentage:
            attempt.percentage !== null
              ? Number(
                  attempt.percentage,
                )
              : null,
        },
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#111827]">
      <div className="aws-grid min-h-[calc(100vh-72px)] px-6 py-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
              AWS LPU / Examinations
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Available Exams
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Scheduled mock examinations currently
              available for Core members.
            </p>
          </div>

          {!validSlots.length ? (
            <section className="border border-[#2d3544] bg-[#151e2d] px-6 py-24 text-center">
              <p className="font-mono text-xs uppercase tracking-wider text-gray-500">
                NO ACTIVE EXAMINATIONS
              </p>

              <p className="mt-3 text-sm text-gray-500">
                There are currently no examination
                sessions available.
              </p>
            </section>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {validSlots.map((slot) => {
                const mock = Array.isArray(
                  slot.mocks,
                )
                  ? slot.mocks[0]
                  : slot.mocks;

                if (!mock) {
                  return null;
                }

                const attempt =
                  attemptMap.get(slot.id);

                const completed =
                  attempt?.status ===
                    "submitted" ||
                  attempt?.status ===
                    "auto_submitted";

                const inProgress =
                  attempt?.status ===
                  "in_progress";

                return (
                  <section
                    key={slot.id}
                    className="border border-[#2d3544] bg-[#151e2d]"
                  >
                    <div className="border-b border-[#2d3544] px-5 py-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#ff9900]">
                          Active
                        </span>

                        <span className="font-mono text-[9px] uppercase text-gray-500">
                          {mock.duration_minutes}{" "}
                          MIN
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h2 className="text-lg font-bold text-white">
                        {mock.title}
                      </h2>

                      {mock.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                          {mock.description}
                        </p>
                      )}

                      <div className="mt-6 space-y-2 border-t border-[#2d3544] pt-5 font-mono text-[10px] uppercase text-gray-500">
                        <div className="flex justify-between">
                          <span>Ends</span>

                          <span className="text-gray-300">
                            {formatDate(
                              slot.ends_at,
                            )}
                          </span>
                        </div>

                        {mock.passing_score !==
                          null && (
                          <div className="flex justify-between">
                            <span>
                              Passing
                            </span>

                            <span className="text-gray-300">
                              {
                                mock.passing_score
                              }
                              %
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-6">
                        {completed ? (
                          <div className="border border-[#2d3544] px-4 py-3 text-center">
                            <p className="font-mono text-[10px] uppercase text-gray-500">
                              Completed
                            </p>

                            {attempt?.percentage !==
                              null &&
                              attempt?.percentage !==
                                undefined && (
                                <p className="mt-1 font-mono text-sm text-[#ff9900]">
                                  {attempt.percentage.toFixed(
                                    1,
                                  )}
                                  %
                                </p>
                              )}
                          </div>
                        ) : inProgress &&
                          attempt ? (
                          <Link
                            href={`/exam/${attempt.id}`}
                            className="block bg-[#ff9900] px-4 py-4 text-center font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400"
                          >
                            Resume Examination →
                          </Link>
                        ) : (
                          <Link
                            href={`/exam/start?slot=${slot.id}`}
                            className="block bg-[#ff9900] px-4 py-4 text-center font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400"
                          >
                            Start Examination →
                          </Link>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    },
  ).format(date);
}