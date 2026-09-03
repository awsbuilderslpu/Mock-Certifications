import Link from "next/link";

import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await requireAuth();
  const supabase = await createClient();

  // ---------------------------------------------------------
  // FETCH EXAM STATS
  // ---------------------------------------------------------

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      `
        id,
        percentage,
        status
      `,
    )
    .eq("user_id", user.profile.id)
    .in("status", ["submitted", "auto_submitted"]);

  const completedAttempts = attempts ?? [];

  const totalAttempts = completedAttempts.length;

  const passedAttempts = completedAttempts.filter(
    (attempt) => Number(attempt.percentage ?? 0) >= 70,
  ).length;

  const averageScore =
    totalAttempts > 0
      ? completedAttempts.reduce(
          (sum, attempt) =>
            sum + Number(attempt.percentage ?? 0),
          0,
        ) / totalAttempts
      : 0;

  const bestScore =
    totalAttempts > 0
      ? Math.max(
          ...completedAttempts.map((attempt) =>
            Number(attempt.percentage ?? 0),
          ),
        )
      : 0;

  // ---------------------------------------------------------
  // USER DETAILS
  // ---------------------------------------------------------

  const fullName =
    user.profile.full_name?.trim() || "AWS SBG Member";

  const email =
    user.profile.email ||
    user.authUser.email ||
    "—";

  const role = user.role.toUpperCase();

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join("");

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="aws-grid min-h-screen">
        <div className="mx-auto max-w-6xl px-5 py-8">
          {/* HEADER */}

          <header className="mb-8 flex flex-col justify-between gap-5 border-b border-[#3b4556] pb-6 md:flex-row md:items-end">
            <div>
              <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#ff9900]">
                Account
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Profile
              </h1>

              <p className="mt-2 text-sm text-gray-400">
                Manage your account information and
                view your examination activity.
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
              >
                Dashboard
              </Link>

              <Link
                href="/results"
                className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
              >
                My Results
              </Link>
            </div>
          </header>

          {/* PROFILE HERO */}

          <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
            {/* IDENTITY */}

            <div className="border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#3b4556] px-5 py-4">
                <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Identity
                </div>
              </div>

              <div className="p-7">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                  {/* AVATAR */}

                  <div className="flex h-24 w-24 shrink-0 items-center justify-center border border-[#ff9900]/40 bg-[#111827] font-mono text-2xl font-bold text-[#ff9900]">
                    {initials || "U"}
                  </div>

                  {/* NAME */}

                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                      Account Name
                    </div>

                    <h2 className="mt-2 truncate text-2xl font-semibold text-gray-100">
                      {fullName}
                    </h2>

                    <div className="mt-2 break-all text-sm text-gray-500">
                      {email}
                    </div>

                    <div className="mt-4">
                      <span className="border border-[#ff9900]/30 bg-[#ff9900]/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#ff9900]">
                        {role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ACCOUNT STATUS */}

            <div className="border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#3b4556] px-5 py-4">
                <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Account Status
                </div>
              </div>

              <div className="divide-y divide-[#2d3544]">
                <StatusRow
                  label="Authentication"
                  value="Verified"
                  positive
                />

                <StatusRow
                  label="Platform Access"
                  value={
                    user.role === "member"
                      ? "Member"
                      : "Exam Portal"
                  }
                  positive={user.role !== "member"}
                />

                <StatusRow
                  label="Account Role"
                  value={role}
                  positive
                />

                <StatusRow
                  label="Account ID"
                  value={user.profile.id}
                  mono
                />
              </div>
            </div>
          </section>

          {/* PROFILE INFORMATION */}

          <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Profile Information
              </div>
            </div>

            <div className="grid gap-px bg-[#2d3544] sm:grid-cols-2">
              <InfoBlock
                label="Full Name"
                value={fullName}
              />

              <InfoBlock
                label="Email Address"
                value={email}
              />

              <InfoBlock
                label="Role"
                value={role}
              />

              <InfoBlock
                label="User ID"
                value={user.profile.id}
                mono
              />
            </div>

            <div className="border-t border-[#2d3544] px-5 py-4">
              <p className="text-xs leading-5 text-gray-600">
                Profile identity is managed through the
                platform authentication system. Contact
                an administrator if your account details
                require correction.
              </p>
            </div>
          </section>

          {/* EXAM STATISTICS */}

          {user.role !== "member" && (
            <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#3b4556] px-5 py-4">
                <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                  Examination Statistics
                </div>
              </div>

              <div className="grid gap-px bg-[#2d3544] sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Completed"
                  value={totalAttempts.toString()}
                  description="Mock examinations"
                />

                <StatCard
                  label="Passed"
                  value={passedAttempts.toString()}
                  description="Successful attempts"
                  valueClass="text-green-400"
                />

                <StatCard
                  label="Average"
                  value={`${averageScore.toFixed(1)}%`}
                  description="Across completed mocks"
                />

                <StatCard
                  label="Best Score"
                  value={`${bestScore.toFixed(1)}%`}
                  description="Personal record"
                  valueClass="text-[#ff9900]"
                />
              </div>
            </section>
          )}

          {/* ROLE INFORMATION */}

          <section className="mt-5 border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-5 py-4">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Access Level
              </div>
            </div>

            <div className="p-5">
              {user.role === "admin" && (
                <AccessMessage
                  title="Administrator Access"
                  description="You have full access to examination management, question banks, mock configuration, exam slots, candidate attempts, and administrative results."
                />
              )}

              {user.role === "core" && (
                <AccessMessage
                  title="Core Member Access"
                  description="You can access assigned mock examinations, take exams, and review your own examination results and submissions."
                />
              )}

              {user.role === "member" && (
                <AccessMessage
                  title="Member Access"
                  description="Your account has standard AWS SBG member access. Examination portal access is restricted to authorized core members and administrators."
                  warning
                />
              )}
            </div>
          </section>

          {/* ACTIONS */}

          <section className="mt-8 border-t border-[#3b4556] pt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              {user.role !== "member" && (
                <>
                  <Link
                    href="/mocks"
                    className="border border-[#3b4556] px-5 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-gray-500 hover:text-white"
                  >
                    Browse Mocks
                  </Link>

                  <Link
                    href="/results"
                    className="border border-[#3b4556] px-5 py-3 text-center font-mono text-xs uppercase tracking-wider text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900]"
                  >
                    View Results
                  </Link>
                </>
              )}

              <Link
                href="/dashboard"
                className="bg-[#ff9900] px-5 py-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
              >
                Return to Dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

// ---------------------------------------------------------
// COMPONENTS
// ---------------------------------------------------------

function StatusRow({
  label,
  value,
  positive = false,
  mono = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span
        className={`flex max-w-[65%] items-center gap-2 text-right text-sm ${
          positive
            ? "text-green-400"
            : "text-gray-400"
        } ${mono ? "font-mono text-[10px]" : ""}`}
      >
        {positive && (
          <span className="h-1.5 w-1.5 shrink-0 bg-green-400" />
        )}

        <span className="truncate">{value}</span>
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
    <div className="bg-[#151e2d] px-5 py-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </div>

      <div
        className={`mt-2 break-all text-sm text-gray-200 ${
          mono ? "font-mono text-[10px]" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  valueClass = "text-gray-200",
}: {
  label: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-[#151e2d] px-5 py-6">
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-gray-600">
        {label}
      </div>

      <div
        className={`mt-2 font-mono text-3xl font-bold ${valueClass}`}
      >
        {value}
      </div>

      <div className="mt-2 text-xs text-gray-600">
        {description}
      </div>
    </div>
  );
}

function AccessMessage({
  title,
  description,
  warning = false,
}: {
  title: string;
  description: string;
  warning?: boolean;
}) {
  return (
    <div
      className={`border px-4 py-4 ${
        warning
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-[#3b4556] bg-[#111827]"
      }`}
    >
      <div
        className={`font-mono text-xs font-bold uppercase tracking-wider ${
          warning
            ? "text-yellow-400"
            : "text-gray-300"
        }`}
      >
        {title}
      </div>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </div>
  );
}