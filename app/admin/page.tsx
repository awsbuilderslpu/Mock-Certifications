import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const user = await requireAdmin();
  const supabase = await createClient();

  const [
    questionsResult,
    mocksResult,
    slotsResult,
    attemptsResult,
  ] = await Promise.all([
    supabase
      .from("questions")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("mocks")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("exam_slots")
      .select("id", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("attempts")
      .select("id", {
        count: "exact",
        head: true,
      }),
  ]);

  const stats = [
    {
      label: "QUESTIONS",
      value: questionsResult.count ?? 0,
      href: "/admin/questions",
    },
    {
      label: "MOCKS",
      value: mocksResult.count ?? 0,
      href: "/admin/mocks",
    },
    {
      label: "EXAM SLOTS",
      value: slotsResult.count ?? 0,
      href: "/admin/slots",
    },
    {
      label: "ATTEMPTS",
      value: attemptsResult.count ?? 0,
      href: "/admin/results",
    },
  ];

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="aws-grid min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-10">
          {/* HEADER */}
          <div className="mb-10 border-b border-[#2d3544] pb-6">
            <div className="mb-2 font-mono text-xs uppercase tracking-[0.25em] text-[#ff9900]">
              AWS LPU // ADMIN CONSOLE
            </div>

            <h1 className="text-3xl font-bold">
              Examination Administration
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-[#9ca3af]">
              Manage the question bank, mock examinations,
              scheduled exam slots, and candidate results.
            </p>

            <div className="mt-4 font-mono text-xs text-[#6b7280]">
              AUTHORIZED USER:{" "}
              {user.profile.full_name ||
                user.profile.email}
            </div>
          </div>

          {/* STATS */}
          <section className="mb-10 grid grid-cols-2 gap-px border border-[#2d3544] bg-[#2d3544] lg:grid-cols-4">
            {stats.map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="bg-[#151e2d] p-6 transition hover:bg-[#1a2435]"
              >
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#6b7280]">
                  {stat.label}
                </div>

                <div className="mt-2 text-3xl font-bold text-white">
                  {stat.value}
                </div>
              </Link>
            ))}
          </section>

          {/* MANAGEMENT */}
          <section>
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#9ca3af]">
              Examination Management
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AdminCard
                href="/admin/questions"
                label="Question Bank"
                description="View and manage the examination question bank. Import questions through CSV."
                action="Manage Questions"
              />

              <AdminCard
                href="/admin/mocks"
                label="Mock Examinations"
                description="Create mocks, configure restrictions, select questions, and publish examinations."
                action="Manage Mocks"
              />

              <AdminCard
                href="/admin/slots"
                label="Exam Slots"
                description="Schedule published mocks for candidates and manage active examination windows."
                action="Manage Slots"
              />

              <AdminCard
                href="/admin/results"
                label="Candidate Results"
                description="Review examination attempts, scores, percentages, and submissions."
                action="View Results"
              />
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="mt-10">
            <div className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-[#9ca3af]">
              Quick Actions
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/questions/import"
                className="border border-[#3b4556] px-5 py-3 font-mono text-xs uppercase transition hover:border-[#ff9900] hover:text-[#ff9900]"
              >
                + Import Questions
              </Link>

              <Link
                href="/admin/mocks/new"
                className="border border-[#3b4556] px-5 py-3 font-mono text-xs uppercase transition hover:border-[#ff9900] hover:text-[#ff9900]"
              >
                + Create Mock
              </Link>

              <Link
                href="/admin/slots/new"
                className="border border-[#3b4556] px-5 py-3 font-mono text-xs uppercase transition hover:border-[#ff9900] hover:text-[#ff9900]"
              >
                + Schedule Exam
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function AdminCard({
  href,
  label,
  description,
  action,
}: {
  href: string;
  label: string;
  description: string;
  action: string;
}) {
  return (
    <Link
      href={href}
      className="group border border-[#2d3544] bg-[#151e2d] p-6 transition hover:border-[#ff9900]"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="font-mono text-xs uppercase tracking-widest text-[#ff9900]">
          ADMIN
        </div>

        <div className="font-mono text-xs text-[#6b7280] transition group-hover:text-[#ff9900]">
          →
        </div>
      </div>

      <h2 className="text-lg font-semibold">
        {label}
      </h2>

      <p className="mt-2 min-h-12 text-sm leading-relaxed text-[#9ca3af]">
        {description}
      </p>

      <div className="mt-6 border-t border-[#2d3544] pt-4 font-mono text-[10px] uppercase tracking-widest text-[#9ca3af] group-hover:text-[#ff9900]">
        {action} →
      </div>
    </Link>
  );
}