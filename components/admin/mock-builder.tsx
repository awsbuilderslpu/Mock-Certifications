"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createMock } from "@/lib/actions/mocks";
import { getRandomQuestions } from "@/lib/actions/question-selection";

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string | null;
  category: string | null;
  certification_id: string | null;
  question_options: {
    id: string;
    option_text: string;
    option_order: number;
  }[];
};

type Certification = {
  id: string;
  provider: string;
  name: string;
  code: string;
  type: "foundational" | "associate" | "professional" | "specialty";
  description: string | null;
};

type SelectionMode = "manual" | "random";
type Difficulty = "all" | "easy" | "medium" | "hard";
type QuestionType = "all" | "single" | "multiple";

const SETTINGS = [
  ["fullscreen", "Fullscreen"],
  ["disable_copy", "Disable Copy"],
  ["disable_paste", "Disable Paste"],
  ["disable_context_menu", "Disable Context Menu"],
  ["detect_tab_switch", "Detect Tab Switch"],
  ["auto_submit", "Auto Submit"],
  ["randomize_questions", "Randomize Questions"],
  ["randomize_options", "Randomize Options"],
] as const;

export default function MockBuilder({
  questions,
  certifications,
}: {
  questions: Question[];
  certifications: Certification[];
}) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [passingScore, setPassingScore] = useState(70);

  const [certificationId, setCertificationId] =
    useState("");

  const [selected, setSelected] =
    useState<string[]>([]);

  const [mode, setMode] =
    useState<SelectionMode>("manual");

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] =
    useState<Difficulty>("all");
  const [questionType, setQuestionType] =
    useState<QuestionType>("all");
  const [category, setCategory] =
    useState("all");

  const [randomCount, setRandomCount] =
    useState(20);

  const [settings, setSettings] = useState({
    fullscreen: true,
    disable_copy: true,
    disable_paste: true,
    disable_context_menu: true,
    detect_tab_switch: true,
    auto_submit: true,
    randomize_questions: true,
    randomize_options: true,
  });

  const [randomizing, setRandomizing] =
    useState(false);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");

  const certificationQuestions =
    useMemo(() => {
      if (!certificationId) {
        return [];
      }

      return questions.filter(
        (question) =>
          question.certification_id ===
          certificationId,
      );
    }, [
      questions,
      certificationId,
    ]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        certificationQuestions
          .map((question) =>
            question.category?.trim(),
          )
          .filter(
            (value): value is string =>
              Boolean(value),
          ),
      ),
    ).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [certificationQuestions]);

  const filteredQuestions = useMemo(() => {
    const query = search
      .toLowerCase()
      .trim();

    return certificationQuestions.filter(
      (question) => {
        const matchesSearch =
          !query ||
          question.question_text
            .toLowerCase()
            .includes(query) ||
          question.category
            ?.toLowerCase()
            .includes(query);

        const matchesDifficulty =
          difficulty === "all" ||
          question.difficulty ===
            difficulty;

        const matchesType =
          questionType === "all" ||
          question.question_type ===
            questionType;

        const matchesCategory =
          category === "all" ||
          question.category === category;

        return (
          matchesSearch &&
          matchesDifficulty &&
          matchesType &&
          matchesCategory
        );
      },
    );
  }, [
    certificationQuestions,
    search,
    difficulty,
    questionType,
    category,
  ]);

  const selectedQuestions = useMemo(() => {
    const selectedSet = new Set(
      selected,
    );

    return certificationQuestions.filter(
      (question) =>
        selectedSet.has(question.id),
    );
  }, [
    certificationQuestions,
    selected,
  ]);

  const visibleSelectedCount =
    useMemo(() => {
      const selectedSet = new Set(
        selected,
      );

      return filteredQuestions.filter(
        (question) =>
          selectedSet.has(question.id),
      ).length;
    }, [
      filteredQuestions,
      selected,
    ]);

  const toggleQuestion = (id: string) => {
    setSelected((current) =>
      current.includes(id)
        ? current.filter(
            (item) => item !== id,
          )
        : [...current, id],
    );
  };

  const selectVisible = () => {
    setSelected((current) => {
      const next = new Set(current);

      filteredQuestions.forEach(
        (question) => {
          next.add(question.id);
        },
      );

      return Array.from(next);
    });
  };

  const clearVisible = () => {
    const visibleIds = new Set(
      filteredQuestions.map(
        (question) => question.id,
      ),
    );

    setSelected((current) =>
      current.filter(
        (id) => !visibleIds.has(id),
      ),
    );
  };

  const removeSelected = (id: string) => {
    setSelected((current) =>
      current.filter(
        (item) => item !== id,
      ),
    );
  };

  const handleCertificationChange = (
    value: string,
  ) => {
    setCertificationId(value);
    setSelected([]);
    setSearch("");
    setDifficulty("all");
    setQuestionType("all");
    setCategory("all");
    setError("");
  };

  const toggleSetting = (
    key: keyof typeof settings,
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const generateRandomQuestions =
    async () => {
      setError("");

      if (!certificationId) {
        setError(
          "Select a certification first.",
        );
        return;
      }

      if (
        !Number.isInteger(randomCount) ||
        randomCount < 1 ||
        randomCount > 500
      ) {
        setError(
          "Random question count must be between 1 and 500.",
        );
        return;
      }

      if (
        randomCount >
        certificationQuestions.length
      ) {
        setError(
          `This certification only has ${certificationQuestions.length} questions.`,
        );
        return;
      }

      setRandomizing(true);

      try {
        const result =
          await getRandomQuestions({
            count: randomCount,
            certificationId,
            difficulty,
            questionType,
            category,
          });

        if (!result.success) {
          setError(
            result.error ||
              "Failed to generate random questions.",
          );
          return;
        }

        setSelected(
          result.questionIds,
        );
      } catch {
        setError(
          "Failed to generate random questions.",
        );
      } finally {
        setRandomizing(false);
      }
    };

  const handleSubmit = async () => {
    setError("");

    const cleanTitle =
      title.trim();

    const cleanDescription =
      description.trim();

    if (!certificationId) {
      setError(
        "Certification is required.",
      );
      return;
    }

    if (!cleanTitle) {
      setError(
        "Mock title is required.",
      );
      return;
    }

    if (cleanTitle.length > 200) {
      setError(
        "Mock title cannot exceed 200 characters.",
      );
      return;
    }

    if (
      cleanDescription.length > 5000
    ) {
      setError(
        "Description cannot exceed 5,000 characters.",
      );
      return;
    }

    if (
      !Number.isInteger(duration) ||
      duration < 1 ||
      duration > 1440
    ) {
      setError(
        "Duration must be between 1,440 minutes.",
      );
      return;
    }

    if (
      !Number.isFinite(
        passingScore,
      ) ||
      passingScore < 0 ||
      passingScore > 100
    ) {
      setError(
        "Passing score must be between 0 and 100.",
      );
      return;
    }

    if (selected.length === 0) {
      setError(
        "Select at least one question.",
      );
      return;
    }

    if (selected.length > 500) {
      setError(
        "A mock cannot contain more than 500 questions.",
      );
      return;
    }

    setSaving(true);

    try {
      const result =
        await createMock({
          title: cleanTitle,
          description: cleanDescription,
          durationMinutes: duration,
          passingScore,
          settings,
          questionIds: selected,
          certificationId,
        });

      if (!result.success) {
        setError(
          result.error ||
            "Failed to create mock.",
        );
        return;
      }

      router.push(
        `/admin/mocks/${result.mockId}`,
      );
      router.refresh();
    } catch {
      setError(
        "Failed to create mock. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              router.push(
                "/admin/mocks",
              )
            }
            className="font-mono text-xs uppercase tracking-wider text-gray-500 transition hover:text-[#ff9900]"
          >
            ← Mock Exams
          </button>

          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
            Admin / Mock Builder
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Create Mock Exam
          </h1>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/40 bg-red-500/5 px-5 py-4">
            <p className="font-mono text-xs text-red-400">
              {error}
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <section className="h-fit border border-[#2d3544] bg-[#151e2d]">
            <div className="border-b border-[#2d3544] px-5 py-4">
              <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                Configuration
              </p>
            </div>

            <div className="space-y-5 p-5">
              <Field label="Certification">
                <select
                  value={certificationId}
                  onChange={(event) =>
                    handleCertificationChange(
                      event.target.value,
                    )
                  }
                  className="input"
                >
                  <option value="">
                    Select certification
                  </option>

                  {certifications.map(
                    (certification) => (
                      <option
                        key={
                          certification.id
                        }
                        value={
                          certification.id
                        }
                      >
                        {certification.provider} —{" "}
                        {
                          certification.name
                        }
                        {" ("}{certification.type}{")"}
                      </option>
                    ),
                  )}
                </select>
              </Field>

              {certificationId && (
                <div className="border border-[#2d3544] bg-[#111827] px-4 py-3">
                  <p className="font-mono text-[10px] uppercase text-[#ff9900]">
                    {
                      certifications.find(
                        (item) =>
                          item.id ===
                          certificationId,
                      )?.code
                    }
                    {" · "}
                    {certifications.find(
                      (item) =>
                        item.id ===
                        certificationId,
                    )?.type}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {
                      certificationQuestions.length
                    } questions available
                  </p>
                </div>
              )}

              <Field label="Title">
                <input
                  value={title}
                  maxLength={200}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  placeholder="AWS Cloud Practitioner Mock 01"
                  className="input"
                />
              </Field>

              <Field label="Description">
                <textarea
                  value={description}
                  maxLength={5000}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Internal mock examination..."
                  className="input resize-none"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Duration">
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={duration}
                    onChange={(event) =>
                      setDuration(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    className="input"
                  />
                </Field>

                <Field label="Pass %">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScore}
                    onChange={(event) =>
                      setPassingScore(
                        Number(
                          event.target.value,
                        ),
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>

              <div className="border-t border-[#2d3544] pt-5">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Exam Restrictions
                </p>

                <div className="space-y-2">
                  {SETTINGS.map(
                    ([key, label]) => {
                      const settingKey =
                        key as keyof typeof settings;

                      const enabled =
                        settings[
                          settingKey
                        ];

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            toggleSetting(
                              settingKey,
                            )
                          }
                          className="flex w-full items-center justify-between border border-[#2d3544] px-3 py-3 text-left transition hover:border-[#3b4556]"
                        >
                          <span className="font-mono text-[10px] uppercase text-gray-400">
                            {label}
                          </span>

                          <span
                            className={
                              enabled
                                ? "font-mono text-[10px] text-[#ff9900]"
                                : "font-mono text-[10px] text-gray-600"
                            }
                          >
                            {enabled
                              ? "ON"
                              : "OFF"}
                          </span>
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              <div className="border-t border-[#2d3544] pt-5">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="text-gray-500">
                    QUESTIONS
                  </span>

                  <span className="text-[#ff9900]">
                    {selected.length}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  saving ||
                  randomizing ||
                  !certificationId ||
                  selected.length === 0
                }
                className="w-full bg-[#ff9900] px-5 py-4 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving
                  ? "Creating..."
                  : "Create Draft"}
              </button>
            </div>
          </section>

          <section className="min-w-0 border border-[#2d3544] bg-[#151e2d]">
            <div className="border-b border-[#2d3544] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                    Question Selection
                  </p>

                  <p className="mt-1 font-mono text-[10px] text-gray-600">
                    {certificationId
                      ? `${certificationQuestions.length} QUESTIONS IN CERTIFICATION`
                      : "SELECT A CERTIFICATION"}
                  </p>
                </div>

                <span className="font-mono text-[10px] text-[#ff9900]">
                  {selected.length} SELECTED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 border-b border-[#2d3544]">
              <button
                type="button"
                onClick={() =>
                  setMode("manual")
                }
                className={`border-r border-[#2d3544] px-5 py-4 font-mono text-xs uppercase tracking-wider transition ${
                  mode === "manual"
                    ? "bg-[#ff9900]/10 text-[#ff9900]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Manual Selection
              </button>

              <button
                type="button"
                onClick={() =>
                  setMode("random")
                }
                className={`px-5 py-4 font-mono text-xs uppercase tracking-wider transition ${
                  mode === "random"
                    ? "bg-[#ff9900]/10 text-[#ff9900]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Random Selection
              </button>
            </div>

            {certificationId && (
              <>
                <div className="border-b border-[#2d3544] p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Search questions..."
                      className="input sm:col-span-2 lg:col-span-1"
                    />

                    <select
                      value={difficulty}
                      onChange={(event) =>
                        setDifficulty(
                          event.target.value as Difficulty,
                        )
                      }
                      className="input"
                    >
                      <option value="all">
                        All Difficulty
                      </option>
                      <option value="easy">
                        Easy
                      </option>
                      <option value="medium">
                        Medium
                      </option>
                      <option value="hard">
                        Hard
                      </option>
                    </select>

                    <select
                      value={questionType}
                      onChange={(event) =>
                        setQuestionType(
                          event.target.value as QuestionType,
                        )
                      }
                      className="input"
                    >
                      <option value="all">
                        All Types
                      </option>
                      <option value="single">
                        Single
                      </option>
                      <option value="multiple">
                        Multiple
                      </option>
                    </select>

                    <select
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value,
                        )
                      }
                      className="input"
                    >
                      <option value="all">
                        All Categories
                      </option>

                      {categories.map(
                        (item) => (
                          <option
                            key={item}
                            value={item}
                          >
                            {item}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                {mode === "random" && (
                  <div className="border-b border-[#2d3544] bg-[#111827] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                          Random Question Generator
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Questions are randomly
                          selected from this
                          certification only.
                        </p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <Field label="Questions">
                          <input
                            type="number"
                            min={1}
                            max={500}
                            value={randomCount}
                            onChange={(event) =>
                              setRandomCount(
                                Number(
                                  event.target
                                    .value,
                                ),
                              )
                            }
                            className="input w-32"
                          />
                        </Field>

                        <button
                          type="button"
                          onClick={
                            generateRandomQuestions
                          }
                          disabled={
                            randomizing ||
                            certificationQuestions.length ===
                              0
                          }
                          className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {randomizing
                            ? "Generating..."
                            : "Generate Random Set"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {mode === "manual" && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d3544] px-5 py-3">
                    <span className="font-mono text-[10px] text-gray-600">
                      {
                        filteredQuestions.length
                      }{" "}
                      MATCHING
                      {" · "}
                      {
                        visibleSelectedCount
                      }{" "}
                      SELECTED
                    </span>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={
                          selectVisible
                        }
                        disabled={
                          filteredQuestions.length ===
                          0
                        }
                        className="border border-[#3b4556] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-gray-400 transition hover:border-[#ff9900] hover:text-[#ff9900] disabled:opacity-40"
                      >
                        Select Visible
                      </button>

                      <button
                        type="button"
                        onClick={
                          clearVisible
                        }
                        disabled={
                          visibleSelectedCount ===
                          0
                        }
                        className="border border-[#3b4556] px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-gray-400 transition hover:border-red-400 hover:text-red-400 disabled:opacity-40"
                      >
                        Clear Visible
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="max-h-[700px] overflow-y-auto">
              {!certificationId && (
                <div className="px-6 py-24 text-center">
                  <p className="font-mono text-xs text-gray-500">
                    SELECT A CERTIFICATION
                  </p>

                  <p className="mt-2 text-xs text-gray-600">
                    Questions will appear after
                    selecting the certification.
                  </p>
                </div>
              )}

              {certificationId &&
                mode === "manual" &&
                filteredQuestions.map(
                  (question, index) => {
                    const isSelected =
                      selected.includes(
                        question.id,
                      );

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() =>
                          toggleQuestion(
                            question.id,
                          )
                        }
                        className={`flex w-full gap-4 border-b border-[#2d3544] p-5 text-left transition ${
                          isSelected
                            ? "bg-[#ff9900]/5"
                            : "hover:bg-[#192233]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border font-mono text-[10px] ${
                            isSelected
                              ? "border-[#ff9900] bg-[#ff9900] text-[#111827]"
                              : "border-[#3b4556] text-transparent"
                          }`}
                        >
                          ✓
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-200">
                            {
                              question.question_text
                            }
                          </p>

                          <div className="mt-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase text-gray-600">
                            <span>
                              {
                                question.question_type
                              }
                            </span>

                            <span>
                              {question.difficulty ||
                                "unknown"}
                            </span>

                            {question.category && (
                              <span>
                                {
                                  question.category
                                }
                              </span>
                            )}
                          </div>
                        </div>

                        <span className="font-mono text-[10px] text-gray-600">
                          #{index + 1}
                        </span>
                      </button>
                    );
                  },
                )}

              {certificationId &&
                mode === "random" &&
                selectedQuestions.map(
                  (question, index) => (
                    <div
                      key={question.id}
                      className="flex gap-4 border-b border-[#2d3544] p-5"
                    >
                      <span className="font-mono text-[10px] text-gray-600">
                        {String(
                          index + 1,
                        ).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-200">
                          {
                            question.question_text
                          }
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase text-gray-600">
                          <span>
                            {
                              question.question_type
                            }
                          </span>

                          <span>
                            {question.difficulty ||
                              "unknown"}
                          </span>

                          {question.category && (
                            <span>
                              {
                                question.category
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          removeSelected(
                            question.id,
                          )
                        }
                        className="self-start font-mono text-[9px] uppercase text-gray-600 transition hover:text-red-400"
                      >
                        Remove
                      </button>
                    </div>
                  ),
                )}

              {certificationId &&
                mode === "manual" &&
                !filteredQuestions.length && (
                  <div className="px-6 py-20 text-center">
                    <p className="font-mono text-xs text-gray-500">
                      NO QUESTIONS FOUND
                    </p>
                  </div>
                )}

              {certificationId &&
                mode === "random" &&
                !selectedQuestions.length && (
                  <div className="px-6 py-20 text-center">
                    <p className="font-mono text-xs text-gray-500">
                      GENERATE A RANDOM SET
                    </p>
                  </div>
                )}
            </div>

            {selected.length > 0 && (
              <div className="border-t border-[#2d3544] bg-[#111827] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    Final Question Set
                  </span>

                  <span className="font-mono text-xs text-[#ff9900]">
                    {selected.length} QUESTIONS
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </span>

      {children}
    </label>
  );
}