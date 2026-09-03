import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

const QUESTION_TYPES = [
  "all",
  "single",
  "multiple",
] as const;

const DIFFICULTIES = [
  "all",
  "easy",
  "medium",
  "hard",
] as const;

type QuestionType =
  (typeof QUESTION_TYPES)[number];

type Difficulty =
  (typeof DIFFICULTIES)[number];

type SearchParams = {
  page?: string;
  search?: string;
  type?: string;
  difficulty?: string;
  category?: string;
};

function parsePage(value: string | undefined) {
  const page = Number(value);

  if (
    !Number.isInteger(page) ||
    page < 1
  ) {
    return 1;
  }

  return page;
}

function normalizeSearch(
  value: string | undefined,
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 200);
}

function normalizeType(
  value: string | undefined,
): QuestionType {
  if (
    value === "single" ||
    value === "multiple"
  ) {
    return value;
  }

  return "all";
}

function normalizeDifficulty(
  value: string | undefined,
): Difficulty {
  if (
    value === "easy" ||
    value === "medium" ||
    value === "hard"
  ) {
    return value;
  }

  return "all";
}

function buildUrl(
  params: SearchParams,
  overrides: SearchParams,
) {
  const merged = {
    ...params,
    ...overrides,
  };

  const searchParams =
    new URLSearchParams();

  if (merged.page && merged.page !== "1") {
    searchParams.set(
      "page",
      merged.page,
    );
  }

  if (merged.search) {
    searchParams.set(
      "search",
      merged.search,
    );
  }

  if (
    merged.type &&
    merged.type !== "all"
  ) {
    searchParams.set(
      "type",
      merged.type,
    );
  }

  if (
    merged.difficulty &&
    merged.difficulty !== "all"
  ) {
    searchParams.set(
      "difficulty",
      merged.difficulty,
    );
  }

  if (merged.category) {
    searchParams.set(
      "category",
      merged.category,
    );
  }

  const query =
    searchParams.toString();

  return query
    ? `/admin/questions?${query}`
    : "/admin/questions";
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();

  const params = await searchParams;

  const page = parsePage(
    params.page,
  );

  const search = normalizeSearch(
    params.search,
  );

  const type = normalizeType(
    params.type,
  );

  const difficulty =
    normalizeDifficulty(
      params.difficulty,
    );

  const category =
    typeof params.category ===
      "string"
      ? params.category
          .trim()
          .slice(0, 100)
      : "";

  const supabase = await createClient();

  let query = supabase
    .from("questions")
    .select(
      `
        id,
        question_text,
        question_type,
        difficulty,
        category,
        created_at,
        question_options (
          id,
          option_text,
          is_correct,
          option_order
        )
      `,
      {
        count: "exact",
      },
    )
    .order("created_at", {
      ascending: false,
    })
    .order("id", {
      ascending: false,
    });

  if (search) {
    query = query.ilike(
      "question_text",
      `%${escapeLike(search)}%`,
    );
  }

  if (type !== "all") {
    query = query.eq(
      "question_type",
      type,
    );
  }

  if (difficulty !== "all") {
    query = query.eq(
      "difficulty",
      difficulty,
    );
  }

  if (category) {
    query = query.ilike(
      "category",
      category,
    );
  }

  const from =
    (page - 1) * PAGE_SIZE;

  const to =
    from + PAGE_SIZE - 1;

  const {
    data: questions,
    count,
    error,
  } = await query.range(
    from,
    to,
  );

  if (error) {
    throw new Error(
      "Failed to load question bank.",
    );
  }

  const totalQuestions =
    count ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalQuestions / PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    page,
    totalPages,
  );

  const hasFilters =
    Boolean(search) ||
    type !== "all" ||
    difficulty !== "all" ||
    Boolean(category);

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
              Admin / Question Bank
            </p>

            <h1 className="text-3xl font-bold">
              Questions
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Manage your examination question
              bank.
            </p>
          </div>

          <Link
            href="/admin/questions/import"
            className="inline-flex w-fit bg-[#ff9900] px-5 py-3 text-sm font-bold text-[#111827] transition hover:bg-orange-400"
          >
            IMPORT CSV
          </Link>
        </div>

        <form
          method="GET"
          className="border border-[#2d3544] bg-[#151e2d] p-4"
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px_auto]">
            <input
              name="search"
              type="search"
              defaultValue={search}
              placeholder="Search questions..."
              maxLength={200}
              className="border border-[#2d3544] bg-[#111827] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#ff9900]"
            />

            <select
              name="type"
              defaultValue={type}
              className="border border-[#2d3544] bg-[#111827] px-4 py-3 font-mono text-xs uppercase text-gray-300 outline-none focus:border-[#ff9900]"
            >
              {QUESTION_TYPES.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value === "all"
                      ? "All Types"
                      : value}
                  </option>
                ),
              )}
            </select>

            <select
              name="difficulty"
              defaultValue={
                difficulty
              }
              className="border border-[#2d3544] bg-[#111827] px-4 py-3 font-mono text-xs uppercase text-gray-300 outline-none focus:border-[#ff9900]"
            >
              {DIFFICULTIES.map(
                (value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {value === "all"
                      ? "All Difficulty"
                      : value}
                  </option>
                ),
              )}
            </select>

            <input
              name="category"
              type="text"
              defaultValue={
                category
              }
              placeholder="Category"
              maxLength={100}
              className="border border-[#2d3544] bg-[#111827] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#ff9900]"
            />

            <button
              type="submit"
              className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400"
            >
              Filter
            </button>
          </div>

          {hasFilters && (
            <div className="mt-3">
              <Link
                href="/admin/questions"
                className="font-mono text-[10px] uppercase tracking-wider text-gray-500 hover:text-[#ff9900]"
              >
                Clear filters
              </Link>
            </div>
          )}
        </form>

        <div className="mt-5 border border-[#2d3544] bg-[#151e2d]">
          <div className="flex flex-col gap-2 border-b border-[#2d3544] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-gray-400">
              {totalQuestions.toLocaleString(
                "en-IN",
              )}{" "}
              Questions
            </span>

            <span className="font-mono text-[10px] uppercase text-gray-600">
              Page {currentPage} /{" "}
              {totalPages}
            </span>
          </div>

          {!questions?.length ? (
            <div className="px-6 py-20 text-center">
              <p className="font-mono text-sm text-gray-500">
                {hasFilters
                  ? "NO QUESTIONS FOUND"
                  : "QUESTION BANK EMPTY"}
              </p>

              <p className="mt-2 text-sm text-gray-400">
                {hasFilters
                  ? "Try changing your search or filters."
                  : "Import your questions using a CSV file."}
              </p>
            </div>
          ) : (
            <div>
              {questions.map(
                (question, index) => {
                  const questionNumber =
                    from + index + 1;

                  const options = [
                    ...(question.question_options ??
                      []),
                  ].sort(
                    (a, b) =>
                      a.option_order -
                      b.option_order,
                  );

                  return (
                    <details
                      key={question.id}
                      className="group border-b border-[#2d3544] last:border-b-0"
                    >
                      <summary className="cursor-pointer list-none px-5 py-4 hover:bg-[#192233]">
                        <div className="flex items-start gap-4">
                          <span className="mt-0.5 min-w-10 font-mono text-xs text-[#ff9900]">
                            #
                            {
                              questionNumber
                            }
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <p className="text-sm font-medium leading-6 text-white">
                                {
                                  question.question_text
                                }
                              </p>

                              <div className="flex shrink-0 gap-2">
                                <span className="border border-[#2d3544] px-2 py-1 font-mono text-[9px] uppercase text-gray-400">
                                  {
                                    question.question_type
                                  }
                                </span>

                                <span className="border border-[#2d3544] px-2 py-1 font-mono text-[9px] uppercase text-gray-400">
                                  {
                                    question.difficulty
                                  }
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase text-gray-600">
                              <span>
                                {
                                  options.length
                                }{" "}
                                options
                              </span>

                              {question.category && (
                                <span>
                                  {
                                    question.category
                                  }
                                </span>
                              )}

                              <span className="ml-auto text-gray-700 group-open:hidden">
                                VIEW →
                              </span>
                            </div>
                          </div>
                        </div>
                      </summary>

                      <div className="border-t border-[#2d3544] bg-[#111827] px-5 py-5">
                        <div className="grid gap-2 md:grid-cols-2">
                          {options.map(
                            (option) => (
                              <div
                                key={
                                  option.id
                                }
                                className={`border px-3 py-3 text-sm ${
                                  option.is_correct
                                    ? "border-[#ff9900] bg-[#ff9900]/10 text-[#ff9900]"
                                    : "border-[#2d3544] text-gray-400"
                                }`}
                              >
                                <span className="mr-2 font-mono text-xs">
                                  {
                                    option.option_order
                                  }
                                  .
                                </span>

                                {
                                  option.option_text
                                }

                                {option.is_correct && (
                                  <span className="ml-2 font-mono text-[9px] uppercase">
                                    ✓ Correct
                                  </span>
                                )}
                              </div>
                            ),
                          )}
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#2d3544] pt-4">
                          <div className="flex gap-3 font-mono text-[10px] uppercase text-gray-500">
                            <span>
                              {
                                question.difficulty
                              }
                            </span>

                            {question.category && (
                              <span>
                                {
                                  question.category
                                }
                              </span>
                            )}
                          </div>

                          <span className="font-mono text-[9px] text-gray-700">
                            {question.id}
                          </span>
                        </div>
                      </div>
                    </details>
                  );
                },
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#2d3544] px-5 py-4">
              {currentPage > 1 ? (
                <Link
                  href={buildUrl(
                    {
                      ...params,
                      page:
                        String(
                          currentPage -
                            1,
                        ),
                    },
                    {
                      page:
                        String(
                          currentPage -
                            1,
                        ),
                    },
                  )}
                  className="border border-[#2d3544] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 hover:border-[#ff9900] hover:text-[#ff9900]"
                >
                  ← Previous
                </Link>
              ) : (
                <span className="border border-[#2d3544] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-700">
                  ← Previous
                </span>
              )}

              <span className="font-mono text-[10px] uppercase text-gray-500">
                {currentPage} /{" "}
                {totalPages}
              </span>

              {currentPage <
              totalPages ? (
                <Link
                  href={buildUrl(
                    params,
                    {
                      page:
                        String(
                          currentPage +
                            1,
                        ),
                    },
                  )}
                  className="border border-[#2d3544] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-400 hover:border-[#ff9900] hover:text-[#ff9900]"
                >
                  Next →
                </Link>
              ) : (
                <span className="border border-[#2d3544] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-700">
                  Next →
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function escapeLike(
  value: string,
) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}