import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type DashboardMock = {
  id: string;
  title: string;
  duration_minutes?: number;
  passing_score?: number | null;
};

type DashboardSlot = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  mocks: DashboardMock | DashboardMock[] | null;
};

type DashboardAttempt = {
  id: string;
  mock_id: string;
  percentage: number | null;
  status: string;
  submitted_at: string | null;
  mocks: Pick<DashboardMock, "id" | "title"> | Pick<DashboardMock, "id" | "title">[] | null;
};

export default async function DashboardPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const isAdmin = user.role === "admin";
  const isCore = user.role === "core";

  /*
   * Exam data is only relevant to admin/core.
   */
  let upcomingSlots: DashboardSlot[] = [];
  let recentAttempts: DashboardAttempt[] = [];

  if (isAdmin || isCore) {
    const now = new Date().toISOString();

    const { data: slots } = await supabase
      .from("exam_slots")
      .select(`
        id,
        starts_at,
        ends_at,
        status,
        mocks (
          id,
          title,
          duration_minutes,
          passing_score
        )
      `)
      .eq("status", "scheduled")
      .gte("ends_at", now)
      .order("starts_at", {
        ascending: true,
      })
      .limit(3);

    upcomingSlots = slots ?? [];

    const { data: attempts } = await supabase
      .from("attempts")
      .select(`
        id,
        mock_id,
        score,
        percentage,
        status,
        submitted_at,
        mocks (
          id,
          title
        )
      `)
      .eq("user_id", user.profile.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(5);

    recentAttempts = attempts ?? [];
  }

  return (
    <main className="min-h-screen bg-[#111827]">
      <div className="aws-grid min-h-[calc(100vh-72px)]">
        <div className="mx-auto max-w-7xl px-6 py-10">

          {/* Header */}

          <section className="mb-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
              AWS LPU / Dashboard
            </p>

            <div className="mt-3 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Welcome back,{" "}
                  {user.profile.full_name?.split(" ")[0] ||
                    "Member"}
                  .
                </h1>

                <p className="mt-2 text-sm text-gray-400">
                  {isAdmin
                    ? "Manage examinations, question banks and candidate activity."
                    : isCore
                      ? "Your examination workspace and performance overview."
                      : "Your AWS Student Builder Group workspace."}
                </p>
              </div>

              <div className="border border-[#2d3544] bg-[#151e2d] px-4 py-3">
                <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
                  Access Level
                </p>

                <p className="mt-1 font-mono text-sm uppercase text-[#ff9900]">
                  {user.role}
                </p>
              </div>
            </div>
          </section>

          {/* ADMIN */}

          {isAdmin && (
            <AdminDashboard
              upcomingSlots={upcomingSlots}
              recentAttempts={recentAttempts}
            />
          )}

          {/* CORE */}

          {isCore && (
            <CoreDashboard
              upcomingSlots={upcomingSlots}
              recentAttempts={recentAttempts}
            />
          )}

          {/* MEMBER */}

          {user.role === "member" && (
            <MemberDashboard />
          )}
        </div>
      </div>
    </main>
  );
}


/* =========================================================
   ADMIN DASHBOARD
   ========================================================= */

function AdminDashboard({
  upcomingSlots,
  recentAttempts,
}: {
  upcomingSlots: DashboardSlot[];
  recentAttempts: DashboardAttempt[];
}) {
  return (
    <>
      <div className="grid gap-px border border-[#2d3544] bg-[#2d3544] sm:grid-cols-2 lg:grid-cols-4">

        <DashboardStat
          label="Question Bank"
          value="Manage"
          href="/admin/questions"
        />

        <DashboardStat
          label="Mock Exams"
          value="Manage"
          href="/admin/mocks"
        />

        <DashboardStat
          label="Exam Slots"
          value="Manage"
          href="/admin/slots"
        />

        <DashboardStat
          label="Results"
          value="View"
          href="/admin/results"
        />

      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        <UpcomingExams slots={upcomingSlots} />

        <RecentAttempts attempts={recentAttempts} />

      </div>

      <section className="mt-6 border border-[#2d3544] bg-[#151e2d]">

        <SectionHeader title="Administration" />

        <div className="grid gap-px bg-[#2d3544] sm:grid-cols-3">

          <AdminLink
            href="/admin/questions"
            title="Question Bank"
            description="Import and manage questions."
          />

          <AdminLink
            href="/admin/mocks"
            title="Mock Exams"
            description="Build and publish examinations."
          />

          <AdminLink
            href="/admin/slots"
            title="Exam Slots"
            description="Schedule examination sessions."
          />

        </div>

      </section>
    </>
  );
}


/* =========================================================
   CORE DASHBOARD
   ========================================================= */

function CoreDashboard({
  upcomingSlots,
  recentAttempts,
}: {
  upcomingSlots: DashboardSlot[];
  recentAttempts: DashboardAttempt[];
}) {
  return (
    <>
      <div className="grid gap-px border border-[#2d3544] bg-[#2d3544] sm:grid-cols-3">

        <DashboardStat
          label="Available Exams"
          value={String(upcomingSlots.length)}
          href="/mocks"
        />

        <DashboardStat
          label="Recent Attempts"
          value={String(recentAttempts.length)}
          href="/results"
        />

        <DashboardStat
          label="My Results"
          value="View"
          href="/results"
        />

      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        <UpcomingExams slots={upcomingSlots} />

        <RecentAttempts attempts={recentAttempts} />

      </div>

      <section className="mt-6 border border-[#ff9900]/30 bg-[#ff9900]/5 p-6">

        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9900]">
          Core Member Access
        </p>

        <h2 className="mt-3 text-xl font-bold">
          Ready for your next mock?
        </h2>

        <p className="mt-2 max-w-xl text-sm text-gray-400">
          Scheduled examinations will appear here when
          they&apos;re available.
        </p>

        <Link
          href="/mocks"
          className="mt-5 inline-block bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400"
        >
          View Examinations →
        </Link>

      </section>
    </>
  );
}


/* =========================================================
   MEMBER DASHBOARD
   ========================================================= */

function MemberDashboard() {
  return (
    <>
      <section className="border border-[#2d3544] bg-[#151e2d]">

        <div className="p-8">

          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
            Member Workspace
          </p>

          <h2 className="mt-4 text-2xl font-bold">
            You&apos;re signed in.
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            Your account has standard AWS Student Builder
            Group access. Examination features are reserved
            for Core members.
          </p>

        </div>

        <div className="grid gap-px border-t border-[#2d3544] bg-[#2d3544] sm:grid-cols-2">

          <Link
            href="/"
            className="bg-[#151e2d] p-5 transition hover:bg-[#192233]"
          >
            <p className="font-mono text-xs uppercase text-[#ff9900]">
              ← Home
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Return to the public portal.
            </p>
          </Link>

          <Link
            href="/profile"
            className="bg-[#151e2d] p-5 transition hover:bg-[#192233]"
          >
            <p className="font-mono text-xs uppercase text-[#ff9900]">
              Profile →
            </p>

            <p className="mt-2 text-sm text-gray-400">
              View your member profile.
            </p>
          </Link>

        </div>

      </section>
    </>
  );
}


/* =========================================================
   UPCOMING EXAMS
   ========================================================= */

function UpcomingExams({
  slots,
}: {
  slots: DashboardSlot[];
}) {
  return (
    <section className="border border-[#2d3544] bg-[#151e2d]">

      <SectionHeader
        title="Upcoming Examinations"
        action="/mocks"
      />

      {!slots.length ? (
        <div className="px-6 py-14 text-center">
          <p className="font-mono text-xs text-gray-600">
            NO SCHEDULED EXAMS
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#2d3544]">

          {slots.map((slot) => {
            const mock = Array.isArray(slot.mocks)
              ? slot.mocks[0]
              : slot.mocks;

            return (
              <div
                key={slot.id}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-4">

                  <div>
                    <p className="text-sm font-semibold text-white">
                      {mock?.title ?? "Examination"}
                    </p>

                    <p className="mt-2 font-mono text-[10px] text-gray-500">
                      {formatDate(slot.starts_at)}
                    </p>
                  </div>

                  <span className="font-mono text-[9px] uppercase text-[#ff9900]">
                    Scheduled
                  </span>

                </div>

                <div className="mt-4 flex gap-4 font-mono text-[9px] uppercase text-gray-600">
                  <span>
                    {mock?.duration_minutes ?? "—"} MIN
                  </span>

                  {mock?.passing_score != null && (
                    <span>
                      PASS {mock.passing_score}%
                    </span>
                  )}
                </div>

              </div>
            );
          })}

        </div>
      )}

    </section>
  );
}


/* =========================================================
   RECENT ATTEMPTS
   ========================================================= */

function RecentAttempts({
  attempts,
}: {
  attempts: DashboardAttempt[];
}) {
  return (
    <section className="border border-[#2d3544] bg-[#151e2d]">

      <SectionHeader
        title="Recent Attempts"
        action="/results"
      />

      {!attempts.length ? (
        <div className="px-6 py-14 text-center">
          <p className="font-mono text-xs text-gray-600">
            NO ATTEMPTS YET
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#2d3544]">

          {attempts.map((attempt) => {
            const mock = Array.isArray(attempt.mocks)
              ? attempt.mocks[0]
              : attempt.mocks;

            return (
              <div
                key={attempt.id}
                className="flex items-center justify-between gap-4 p-5"
              >
                <div>
                  <p className="text-sm text-gray-200">
                    {mock?.title ?? "Mock Exam"}
                  </p>

                  <p className="mt-1 font-mono text-[9px] uppercase text-gray-600">
                    {attempt.status}
                  </p>
                </div>

                <div className="text-right">
                  {attempt.percentage != null ? (
                    <p className="font-mono text-sm text-[#ff9900]">
                      {Number(
                        attempt.percentage,
                      ).toFixed(1)}
                      %
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-gray-600">
                      —
                    </p>
                  )}
                </div>
              </div>
            );
          })}

        </div>
      )}

    </section>
  );
}


/* =========================================================
   SMALL COMPONENTS
   ========================================================= */

function DashboardStat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[#151e2d] p-5 transition hover:bg-[#192233]"
    >
      <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-3 text-lg font-bold text-[#ff9900]">
        {value}
      </p>
    </Link>
  );
}

function AdminLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="bg-[#151e2d] p-5 transition hover:bg-[#192233]"
    >
      <p className="text-sm font-semibold text-white">
        {title}
      </p>

      <p className="mt-2 text-xs text-gray-500">
        {description}
      </p>

      <p className="mt-4 font-mono text-[9px] uppercase text-[#ff9900]">
        Open →
      </p>
    </Link>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[#2d3544] px-5 py-4">
      <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
        {title}
      </p>

      {action && (
        <Link
          href={action}
          className="font-mono text-[9px] uppercase text-gray-600 hover:text-[#ff9900]"
        >
          View All →
        </Link>
      )}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}