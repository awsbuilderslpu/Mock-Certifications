import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cancelExamSlot } from "@/lib/actions/exam-slots";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ExamSlotDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  await requireAdmin();

  const supabase = await createClient();

  const { data: slot, error: slotError } = await supabase
    .from("exam_slots")
    .select(
      `
        id,
        starts_at,
        ends_at,
        status,
        mock_id,
        mocks (
          id,
          title,
          description,
          duration_minutes,
          passing_score,
          status
        )
      `,
    )
    .eq("id", id)
    .single();

  if (slotError || !slot) {
    notFound();
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from("attempts")
    .select(
      `
        id,
        user_id,
        started_at,
        submitted_at,
        score,
        percentage,
        status,
        created_at,
        profiles (
          id,
          full_name,
          email
        )
      `,
    )
    .eq("slot_id", slot.id)
    .order("created_at", { ascending: false });

  if (attemptsError) {
    console.error("Failed to fetch attempts:", attemptsError);
  }

  const candidateAttempts = attempts ?? [];

  const totalCandidates = candidateAttempts.length;
  const completedCandidates = candidateAttempts.filter(
    (attempt) =>
      attempt.status === "submitted" ||
      attempt.status === "auto_submitted",
  ).length;

  const inProgressCandidates = candidateAttempts.filter(
    (attempt) => attempt.status === "in_progress",
  ).length;

  const notStartedCandidates = candidateAttempts.filter(
    (attempt) => attempt.status === "not_started",
  ).length;

  const mock = Array.isArray(slot.mocks)
    ? slot.mocks[0]
    : slot.mocks;

  const formatDate = (value: string | null) => {
    if (!value) return "—";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "submitted":
        return "border-green-500/30 bg-green-500/10 text-green-400";

      case "auto_submitted":
        return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400";

      case "in_progress":
        return "border-blue-500/30 bg-blue-500/10 text-blue-400";

      case "not_started":
        return "border-gray-500/30 bg-gray-500/10 text-gray-400";

      default:
        return "border-gray-500/30 bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-[#2d3544] pb-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
              ADMIN / EXAM SLOTS
            </div>

            <h1 className="text-3xl font-bold tracking-tight">
              Exam Slot
            </h1>

            <p className="mt-2 font-mono text-xs text-gray-500">
              SLOT ID: {slot.id}
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/slots"
              className="border border-[#3b4556] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wide text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900]"
            >
              ← Back to Slots
            </Link>

            {slot.status !== "cancelled" &&
              slot.status !== "completed" && (
                <form
                  action={async () => {
                    await cancelExamSlot(slot.id);
                  }}
                >
                  <button
                    type="submit"
                    className="border border-red-500/50 px-4 py-2 font-mono text-xs font-bold uppercase text-red-400 transition hover:bg-red-500/10"
                  >
                    Cancel Slot
                  </button>
                </form>
              )}
          </div>
        </div>

        {/* Slot Overview */}
        <section className="mb-8 grid gap-px border border-[#2d3544] bg-[#2d3544] md:grid-cols-4">
          <div className="bg-[#151e2d] p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Status
            </div>

            <div className="mt-3">
              <span className="border border-[#ff9900]/30 bg-[#ff9900]/10 px-3 py-1 font-mono text-xs uppercase text-[#ff9900]">
                {slot.status}
              </span>
            </div>
          </div>

          <div className="bg-[#151e2d] p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Starts
            </div>

            <div className="mt-3 text-sm font-semibold">
              {formatDate(slot.starts_at)}
            </div>
          </div>

          <div className="bg-[#151e2d] p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Ends
            </div>

            <div className="mt-3 text-sm font-semibold">
              {formatDate(slot.ends_at)}
            </div>
          </div>

          <div className="bg-[#151e2d] p-5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Duration
            </div>

            <div className="mt-3 text-sm font-semibold">
              {mock?.duration_minutes ?? "—"} minutes
            </div>
          </div>
        </section>

        {/* Mock Information */}
        <section className="mb-8 border border-[#2d3544] bg-[#151e2d]">
          <div className="border-b border-[#2d3544] px-6 py-4">
            <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#ff9900]">
              Assigned Mock
            </div>
          </div>

          <div className="p-6">
            {mock ? (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <h2 className="text-xl font-bold">
                    {mock.title}
                  </h2>

                  {mock.description && (
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      {mock.description}
                    </p>
                  )}

                  <p className="mt-4 font-mono text-[10px] text-gray-600">
                    MOCK ID: {mock.id}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-[#2d3544] bg-[#111827] p-4">
                    <div className="font-mono text-[10px] uppercase text-gray-500">
                      Duration
                    </div>

                    <div className="mt-2 font-mono text-lg font-bold text-[#ff9900]">
                      {mock.duration_minutes}m
                    </div>
                  </div>

                  <div className="border border-[#2d3544] bg-[#111827] p-4">
                    <div className="font-mono text-[10px] uppercase text-gray-500">
                      Pass Score
                    </div>

                    <div className="mt-2 font-mono text-lg font-bold text-[#ff9900]">
                      {mock.passing_score ?? "—"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="font-mono text-sm text-red-400">
                Mock data unavailable.
              </div>
            )}
          </div>
        </section>

        {/* Statistics */}
        <section className="mb-8">
          <div className="mb-4 font-mono text-xs uppercase tracking-[0.15em] text-gray-500">
            Candidate Statistics
          </div>

          <div className="grid gap-px border border-[#2d3544] bg-[#2d3544] sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-[#151e2d] p-5">
              <div className="font-mono text-[10px] uppercase text-gray-500">
                Total Candidates
              </div>

              <div className="mt-2 text-3xl font-bold">
                {totalCandidates}
              </div>
            </div>

            <div className="bg-[#151e2d] p-5">
              <div className="font-mono text-[10px] uppercase text-gray-500">
                Completed
              </div>

              <div className="mt-2 text-3xl font-bold text-green-400">
                {completedCandidates}
              </div>
            </div>

            <div className="bg-[#151e2d] p-5">
              <div className="font-mono text-[10px] uppercase text-gray-500">
                In Progress
              </div>

              <div className="mt-2 text-3xl font-bold text-blue-400">
                {inProgressCandidates}
              </div>
            </div>

            <div className="bg-[#151e2d] p-5">
              <div className="font-mono text-[10px] uppercase text-gray-500">
                Not Started
              </div>

              <div className="mt-2 text-3xl font-bold text-gray-400">
                {notStartedCandidates}
              </div>
            </div>
          </div>
        </section>

        {/* Candidates */}
        <section className="border border-[#2d3544] bg-[#151e2d]">
          <div className="flex items-center justify-between border-b border-[#2d3544] px-6 py-4">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.15em] text-[#ff9900]">
                Candidates
              </div>

              <div className="mt-1 text-sm text-gray-500">
                Attempts assigned to this exam slot
              </div>
            </div>

            <div className="font-mono text-xs text-gray-500">
              {totalCandidates} CANDIDATE
              {totalCandidates === 1 ? "" : "S"}
            </div>
          </div>

          {candidateAttempts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="font-mono text-sm text-gray-500">
                No candidates assigned to this slot yet.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-[#2d3544] bg-[#111827] text-left">
                    <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Candidate
                    </th>

                    <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Score
                    </th>

                    <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Percentage
                    </th>

                    <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Submitted
                    </th>

                    <th className="px-6 py-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {candidateAttempts.map((attempt) => {
                    const profile = Array.isArray(attempt.profiles)
                      ? attempt.profiles[0]
                      : attempt.profiles;

                    return (
                      <tr
                        key={attempt.id}
                        className="border-b border-[#2d3544] last:border-b-0 hover:bg-[#111827]/60"
                      >
                        <td className="px-6 py-5">
                          <div className="font-semibold text-white">
                            {profile?.full_name || "Unknown Candidate"}
                          </div>

                          <div className="mt-1 font-mono text-xs text-gray-500">
                            {profile?.email || attempt.user_id}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`border px-2 py-1 font-mono text-[10px] uppercase ${getStatusClass(
                              attempt.status,
                            )}`}
                          >
                            {attempt.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="px-6 py-5 font-mono text-sm">
                          {attempt.score ?? "—"}
                        </td>

                        <td className="px-6 py-5 font-mono text-sm">
                          {attempt.percentage !== null
                            ? `${attempt.percentage}%`
                            : "—"}
                        </td>

                        <td className="px-6 py-5 font-mono text-xs text-gray-400">
                          {formatDate(attempt.submitted_at)}
                        </td>

                        <td className="px-6 py-5">
                          <Link
                            href={`/admin/results/${attempt.id}`}
                            className="border border-[#3b4556] px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-wide text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900]"
                          >
                            View Result
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}