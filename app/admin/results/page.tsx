import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminResultsPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: attempts, error } = await supabase
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
        title,
        passing_score
      ),
      exam_slots (
        starts_at,
        ends_at
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      "Failed to load examination results.",
    );
  }

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="aws-grid min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* HEADER */}
          <div className="mb-8 border-b border-[#2d3544] pb-6">
            <Link
              href="/admin"
              className="mb-4 inline-block font-mono text-xs uppercase tracking-widest text-[#6b7280] hover:text-[#ff9900]"
            >
              ← Admin Console
            </Link>

            <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#ff9900]">
              AWS LPU // RESULTS
            </div>

            <h1 className="mt-2 text-3xl font-bold">
              Candidate Results
            </h1>

            <p className="mt-2 text-sm text-[#9ca3af]">
              Review examination attempts, scores,
              percentages, and submission status.
            </p>
          </div>

          {/* SUMMARY */}
          <div className="mb-8 grid grid-cols-2 gap-px border border-[#2d3544] bg-[#2d3544] md:grid-cols-4">
            <SummaryItem
              label="TOTAL ATTEMPTS"
              value={attempts?.length ?? 0}
            />

            <SummaryItem
              label="COMPLETED"
              value={
                attempts?.filter(
                  (attempt) =>
                    attempt.status ===
                      "submitted" ||
                    attempt.status ===
                      "auto_submitted",
                ).length ?? 0
              }
            />

            <SummaryItem
              label="IN PROGRESS"
              value={
                attempts?.filter(
                  (attempt) =>
                    attempt.status ===
                    "in_progress",
                ).length ?? 0
              }
            />

            <SummaryItem
              label="NOT STARTED"
              value={
                attempts?.filter(
                  (attempt) =>
                    attempt.status ===
                    "not_started",
                ).length ?? 0
              }
            />
          </div>

          {/* RESULTS TABLE */}
          <section className="border border-[#2d3544] bg-[#151e2d]">
            <div className="border-b border-[#2d3544] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-widest text-[#9ca3af]">
                Examination Attempts
              </div>
            </div>

            {attempts && attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#2d3544] text-left">
                      <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                        Candidate
                      </th>

                      <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                        Examination
                      </th>

                      <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                        Score
                      </th>

                      <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                        Percentage
                      </th>

                      <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                        Status
                      </th>

                      <th className="px-5 py-4 font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                        Submitted
                      </th>

                      <th className="px-5 py-4"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {attempts.map((attempt) => {
                      const profile = Array.isArray(
                        attempt.profiles,
                      )
                        ? attempt.profiles[0]
                        : attempt.profiles;

                      const mock = Array.isArray(
                        attempt.mocks,
                      )
                        ? attempt.mocks[0]
                        : attempt.mocks;

                      const completed =
                        attempt.status ===
                          "submitted" ||
                        attempt.status ===
                          "auto_submitted";

                      const passingScore =
                        mock?.passing_score;

                      const passed =
                        completed &&
                        attempt.percentage !==
                          null &&
                        passingScore !== null &&
                        passingScore !== undefined &&
                        Number(
                          attempt.percentage,
                        ) >=
                          Number(passingScore);

                      return (
                        <tr
                          key={attempt.id}
                          className="border-b border-[#2d3544] last:border-b-0 hover:bg-[#1a2435]"
                        >
                          {/* CANDIDATE */}
                          <td className="px-5 py-4">
                            <div className="font-medium">
                              {profile?.full_name ||
                                "Unknown Candidate"}
                            </div>

                            <div className="mt-1 font-mono text-xs text-[#6b7280]">
                              {profile?.email ||
                                "—"}
                            </div>
                          </td>

                          {/* MOCK */}
                          <td className="px-5 py-4">
                            <div className="font-medium">
                              {mock?.title ||
                                "Unknown Examination"}
                            </div>

                            {mock?.passing_score !==
                              null &&
                              mock?.passing_score !==
                                undefined && (
                                <div className="mt-1 font-mono text-[10px] text-[#6b7280]">
                                  PASS:{" "}
                                  {
                                    mock.passing_score
                                  }
                                  %
                                </div>
                              )}
                          </td>

                          {/* SCORE */}
                          <td className="px-5 py-4 font-mono">
                            {attempt.score !==
                            null
                              ? attempt.score
                              : "—"}
                          </td>

                          {/* PERCENTAGE */}
                          <td className="px-5 py-4">
                            {attempt.percentage !==
                            null ? (
                              <span
                                className={
                                  passed
                                    ? "font-mono text-[#ff9900]"
                                    : "font-mono"
                                }
                              >
                                {
                                  attempt.percentage
                                }
                                %
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* STATUS */}
                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                attempt.status
                              }
                            />
                          </td>

                          {/* SUBMITTED */}
                          <td className="px-5 py-4 font-mono text-xs text-[#9ca3af]">
                            {attempt.submitted_at
                              ? formatDate(
                                  attempt.submitted_at,
                                )
                              : "—"}
                          </td>

                          {/* ACTION */}
                          <td className="px-5 py-4 text-right">
                            <Link
                              href={`/admin/results/${attempt.id}`}
                              className="font-mono text-xs uppercase text-[#9ca3af] hover:text-[#ff9900]"
                            >
                              View →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-16 text-center">
                <div className="font-mono text-xs uppercase tracking-widest text-[#6b7280]">
                  No examination attempts
                </div>

                <p className="mt-2 text-sm text-[#9ca3af]">
                  Candidate submissions will appear
                  here once examinations are attempted.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="bg-[#151e2d] p-5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "auto_submitted"
      ? "AUTO SUBMITTED"
      : status.replace("_", " ").toUpperCase();

  return (
    <span className="border border-[#3b4556] px-2 py-1 font-mono text-[10px] uppercase tracking-wide text-[#9ca3af]">
      {label}
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}