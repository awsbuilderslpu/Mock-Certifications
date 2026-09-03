"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  archiveMock,
  publishMock,
  updateMockQuestions,
} from "@/lib/actions/mocks";

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string | null;
  category: string | null;
  explanation: string | null;
  question_options: {
    id: string;
    option_text: string;
    option_order: number;
    is_correct: boolean;
  }[];
};

type Mock = {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number | null;
  settings: Record<string, boolean>;
  status: string;
};

export default function MockEditor({
  mock,
  questions: initialQuestions,
}: {
  mock: Mock;
  questions: Question[];
}) {
  const router = useRouter();

  const [questions, setQuestions] =
    useState(initialQuestions);

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] =
    useState(false);
  const [archiving, setArchiving] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const moveQuestion = (
    index: number,
    direction: "up" | "down",
  ) => {
    const newQuestions = [...questions];

    const target =
      direction === "up"
        ? index - 1
        : index + 1;

    if (
      target < 0 ||
      target >= newQuestions.length
    ) {
      return;
    }

    [
      newQuestions[index],
      newQuestions[target],
    ] = [
      newQuestions[target],
      newQuestions[index],
    ];

    setQuestions(newQuestions);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setError(
        "A mock must contain at least one question.",
      );

      return;
    }

    setQuestions((current) =>
      current.filter(
        (_, questionIndex) =>
          questionIndex !== index,
      ),
    );
  };

  const saveQuestions = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    const result = await updateMockQuestions({
      mockId: mock.id,
      questionIds: questions.map(
        (question) => question.id,
      ),
    });

    setSaving(false);

    if (!result.success) {
      setError(
        result.error ||
          "Failed to save questions.",
      );
      return;
    }

    setMessage("Question order saved.");
    router.refresh();
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    setMessage("");

    console.log("PUBLISH MOCK ID:", mock.id);
    console.log("PUBLISH MOCK ID TYPE:", typeof mock.id);

    try {
      const questionResult =
        await updateMockQuestions({
          mockId: mock.id,
          questionIds: questions.map(
            (question) => question.id,
          ),
        });

      if (!questionResult.success) {
        setError(questionResult.error);
        return;
      }

      const result = await publishMock(mock.id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      window.location.reload();
    } finally {
      setPublishing(false);
    }
  };
  
  const handleArchive = async () => {
    if (
      !confirm(
        "Archive this mock? It will no longer be available for new attempts.",
      )
    ) {
      return;
    }

    setArchiving(true);
    setError("");
    setMessage("");

    const result = await archiveMock(mock.id);

    setArchiving(false);

    if (!result.success) {
      setError(
        result.error ||
          "Failed to archive mock.",
      );
      return;
    }

    setMessage("Mock archived.");
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <div className="mb-8">
          <button
            onClick={() =>
              router.push("/admin/mocks")
            }
            className="font-mono text-xs uppercase tracking-wider text-gray-500 hover:text-[#ff9900]"
          >
            ← Mock Exams
          </button>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-5">

            <div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
                  Mock Examination
                </p>

                <span className="border border-[#2d3544] px-2 py-1 font-mono text-[9px] uppercase text-gray-400">
                  {mock.status}
                </span>
              </div>

              <h1 className="mt-2 text-3xl font-bold">
                {mock.title}
              </h1>

              {mock.description && (
                <p className="mt-2 max-w-2xl text-sm text-gray-400">
                  {mock.description}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {mock.status === "draft" && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400 disabled:opacity-40"
                >
                  {publishing
                    ? "Publishing..."
                    : "Publish"}
                </button>
              )}

              {mock.status !== "archived" && (
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="border border-red-500/40 px-5 py-3 font-mono text-xs uppercase tracking-wider text-red-400 hover:bg-red-500/5 disabled:opacity-40"
                >
                  {archiving
                    ? "Archiving..."
                    : "Archive"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}

        {error && (
          <div className="mb-5 border border-red-500/40 bg-red-500/5 px-5 py-4">
            <p className="font-mono text-xs text-red-400">
              {error}
            </p>
          </div>
        )}

        {message && (
          <div className="mb-5 border border-[#ff9900]/40 bg-[#ff9900]/5 px-5 py-4">
            <p className="font-mono text-xs text-[#ff9900]">
              {message}
            </p>
          </div>
        )}

        {/* Stats */}

        <div className="mb-6 grid gap-px border border-[#2d3544] bg-[#2d3544] sm:grid-cols-3">

          <Stat
            label="Questions"
            value={questions.length}
          />

          <Stat
            label="Duration"
            value={`${mock.duration_minutes} min`}
          />

          <Stat
            label="Passing Score"
            value={
              mock.passing_score !== null
                ? `${mock.passing_score}%`
                : "—"
            }
          />

        </div>

        {/* Questions */}

        <section className="border border-[#2d3544] bg-[#151e2d]">

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#2d3544] px-5 py-4">

            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                Question Sequence
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Reorder or remove questions from this mock.
              </p>
            </div>

            <button
              onClick={saveQuestions}
              disabled={saving}
              className="border border-[#ff9900] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-[#ff9900] hover:bg-[#ff9900]/10 disabled:opacity-40"
            >
              {saving
                ? "Saving..."
                : "Save Order"}
            </button>

          </div>

          <div className="divide-y divide-[#2d3544]">

            {questions.map(
              (question, index) => (
                <div
                  key={question.id}
                  className="p-5"
                >
                  <div className="flex gap-4">

                    {/* Number */}

                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#3b4556] font-mono text-xs text-[#ff9900]">
                      {index + 1}
                    </div>

                    {/* Content */}

                    <div className="min-w-0 flex-1">

                      <div className="flex flex-wrap items-start justify-between gap-3">

                        <p className="max-w-4xl text-sm font-medium text-gray-200">
                          {question.question_text}
                        </p>

                        <div className="flex gap-2">
                          <span className="border border-[#2d3544] px-2 py-1 font-mono text-[9px] uppercase text-gray-500">
                            {question.question_type}
                          </span>

                          <span className="border border-[#2d3544] px-2 py-1 font-mono text-[9px] uppercase text-gray-500">
                            {question.difficulty}
                          </span>
                        </div>

                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">

                        {[...question.question_options]
                            .sort(
                                (a, b) =>
                                a.option_order - b.option_order,
                            )
                            .map((option) => (
                                <div
                                key={option.id}
                                className={`border px-3 py-2 text-xs ${
                                    option.is_correct
                                    ? "border-[#ff9900]/50 text-[#ff9900]"
                                    : "border-[#2d3544] text-gray-500"
                                }`}
                                >
                                <span className="mr-2 font-mono text-[10px]">
                                    {option.option_order}.
                                </span>

                                {option.option_text}

                                {option.is_correct && (
                                    <span className="ml-2 font-mono text-[9px] uppercase">
                                    ✓
                                    </span>
                                )}
                                </div>
                            ))}

                      </div>

                      {question.explanation && (
                        <details className="mt-4 border border-[#2d3544]">
                          <summary className="cursor-pointer px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[#ff9900]">
                            View Explanation
                          </summary>
                          <p className="border-t border-[#2d3544] px-3 py-3 text-xs leading-5 text-gray-400">
                            {question.explanation}
                          </p>
                        </details>
                      )}

                    </div>

                    {/* Controls */}

                    <div className="flex shrink-0 flex-col gap-1">

                      <button
                        onClick={() =>
                          moveQuestion(
                            index,
                            "up",
                          )
                        }
                        disabled={index === 0}
                        className="border border-[#2d3544] px-3 py-1 font-mono text-xs text-gray-500 hover:border-[#ff9900] hover:text-[#ff9900] disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        ↑
                      </button>

                      <button
                        onClick={() =>
                          moveQuestion(
                            index,
                            "down",
                          )
                        }
                        disabled={
                          index ===
                          questions.length - 1
                        }
                        className="border border-[#2d3544] px-3 py-1 font-mono text-xs text-gray-500 hover:border-[#ff9900] hover:text-[#ff9900] disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        ↓
                      </button>

                      <button
                        onClick={() =>
                          removeQuestion(index)
                        }
                        className="border border-[#2d3544] px-3 py-1 font-mono text-[10px] text-gray-600 hover:border-red-500/40 hover:text-red-400"
                      >
                        ×
                      </button>

                    </div>

                  </div>
                </div>
              ),
            )}

          </div>

          {questions.length === 0 && (
            <div className="px-6 py-20 text-center">
              <p className="font-mono text-xs text-gray-500">
                NO QUESTIONS
              </p>
            </div>
          )}

        </section>

        {/* Settings */}

        <section className="mt-6 border border-[#2d3544] bg-[#151e2d]">

          <div className="border-b border-[#2d3544] px-5 py-4">
            <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
              Exam Configuration
            </p>
          </div>

          <div className="grid gap-px bg-[#2d3544] sm:grid-cols-2 lg:grid-cols-4">

            {Object.entries(mock.settings ?? {}).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="bg-[#151e2d] p-5"
                >
                  <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
                    {key.replaceAll("_", " ")}
                  </p>

                  <p
                    className={`mt-2 font-mono text-sm ${
                      value
                        ? "text-[#ff9900]"
                        : "text-gray-600"
                    }`}
                  >
                    {value ? "ENABLED" : "DISABLED"}
                  </p>
                </div>
              ),
            )}

          </div>

        </section>

      </div>
    </main>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#151e2d] p-5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}