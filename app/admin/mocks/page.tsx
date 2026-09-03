import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
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

function normalizeStatus(
  value: unknown,
): "draft" | "published" | "archived" {
  if (
    value === "draft" ||
    value === "published" ||
    value === "archived"
  ) {
    return value;
  }

  return "draft";
}

export default async function AdminMocksPage() {
  await requireAdmin();

  const supabase = await createClient();

  const {
    data: mocks,
    error,
  } = await supabase
    .from("mocks")
    .select(
      `
        id,
        title,
        description,
        duration_minutes,
        passing_score,
        status,
        created_at,
        mock_questions (
          id
        )
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      "Failed to load mock examinations.",
    );
  }

  const validMocks = (mocks ?? []).filter(
    (mock) => {
      if (!isValidUuid(mock.id)) {
        return false;
      }

      if (
        typeof mock.title !== "string" ||
        !mock.title.trim()
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

      if (
        mock.passing_score !== null &&
        (
          typeof mock.passing_score !==
            "number" ||
          !Number.isFinite(
            mock.passing_score,
          ) ||
          mock.passing_score < 0 ||
          mock.passing_score > 100
        )
      ) {
        return false;
      }

      if (
        !isValidDate(mock.created_at)
      ) {
        return false;
      }

      return true;
    },
  );

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
              Admin / Examination
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Mock Exams
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Create, configure and publish
              examination sets.
            </p>
          </div>

          <Link
            href="/admin/mocks/new"
            className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400"
          >
            + Create Mock
          </Link>
        </div>

        {!validMocks.length ? (
          <div className="border border-[#2d3544] bg-[#151e2d] px-6 py-20 text-center">
            <p className="font-mono text-sm text-gray-500">
              NO MOCK EXAMS
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Create your first examination.
            </p>
          </div>
        ) : (
          <div className="grid gap-px border border-[#2d3544] bg-[#2d3544] md:grid-cols-2 xl:grid-cols-3">
            {validMocks.map((mock) => {
              const status =
                normalizeStatus(
                  mock.status,
                );

              const questionCount =
                Array.isArray(
                  mock.mock_questions,
                )
                  ? mock.mock_questions.length
                  : 0;

              return (
                <Link
                  key={mock.id}
                  href={`/admin/mocks/${mock.id}`}
                  className="group bg-[#151e2d] p-6 transition hover:bg-[#192233]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      {status}
                    </span>

                    <span className="font-mono text-[10px] text-[#ff9900]">
                      {questionCount} Q
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-bold text-white group-hover:text-[#ff9900]">
                    {mock.title}
                  </h2>

                  {mock.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                      {mock.description}
                    </p>
                  )}

                  <div className="mt-6 flex gap-5 border-t border-[#2d3544] pt-4 font-mono text-[10px] uppercase text-gray-500">
                    <span>
                      {mock.duration_minutes}{" "}
                      min
                    </span>

                    {mock.passing_score !==
                      null && (
                      <span>
                        Pass:{" "}
                        {Number(
                          mock.passing_score,
                        )}
                        %
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}