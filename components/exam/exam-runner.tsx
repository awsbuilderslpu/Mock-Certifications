"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttemptAnswer, submitAttempt } from "@/lib/actions/attempts";

type Question = {
  id: string;
  question_text: string;
  question_type: "single" | "multiple";
  difficulty?: string | null;
  category?: string | null;
  options: { id: string; option_text: string; option_order: number }[];
};

type ExamRunnerProps = {
  attemptId: string;
  mock: {
    id: string;
    title: string;
    duration_minutes: number;
    settings: Record<string, boolean>;
  };
  questions: Question[];
  existingAnswers: { question_id: string; selected_options: string[] }[];
  deadline: number;
};

export default function ExamRunner({
  attemptId,
  mock,
  questions: rawQuestions,
  existingAnswers: rawExistingAnswers,
  deadline,
}: ExamRunnerProps) {
  const questions = Array.isArray(rawQuestions) ? rawQuestions : [];
  const existingAnswers = Array.isArray(rawExistingAnswers)
    ? rawExistingAnswers
    : [];
  const router = useRouter();
  const submittingRef = useRef(false);
  const pendingAnswersRef = useRef(new Map<string, string[]>());
  const [securityReady, setSecurityReady] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const answer of existingAnswers) {
      initial[answer.question_id] = Array.isArray(answer.selected_options)
        ? answer.selected_options
        : [];
    }
    return initial;
  });
  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, deadline - Date.now()),
  );
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [reviewMarks, setReviewMarks] = useState<Record<string, boolean>>({});

  const safeCurrentIndex =
    questions.length > 0 && currentIndex < questions.length ? currentIndex : 0;
  const currentQuestion =
    questions.length > 0 ? questions[safeCurrentIndex] : undefined;
  const currentOptions = currentQuestion
    ? [...currentQuestion.options].sort(
        (a, b) => a.option_order - b.option_order,
      )
    : [];
  const answeredCount = questions.reduce(
    (count, question) =>
      count + ((answers[question.id] ?? []).length > 0 ? 1 : 0),
    0,
  );

  useEffect(() => {
    if (!securityReady) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement)
        void document.documentElement
          .requestFullscreen()
          .catch(() => undefined);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [securityReady]);

  useEffect(() => {
    if (!securityReady) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) void submitExam();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, securityReady]);

  async function beginExam() {
    setSecurityError(null);
    try {
      await document.documentElement.requestFullscreen();
      setSecurityReady(true);
    } catch (error) {
      setSecurityError(
        error instanceof Error
          ? error.message
          : "Unable to enter fullscreen. Please try again.",
      );
    }
  }

  async function flushAnswers() {
    const pendingAnswers = Array.from(pendingAnswersRef.current.entries());

    if (pendingAnswers.length === 0) {
      return true;
    }

    pendingAnswersRef.current.clear();
    setSaving(true);

    try {
      const results = await Promise.all(
        pendingAnswers.map(([questionId, selectedOptions]) =>
          saveAttemptAnswer(attemptId, questionId, selectedOptions),
        ),
      );

      const failed = results.some((result) => !result.success);

      if (failed) {
        for (const [questionId, selectedOptions] of pendingAnswers) {
          pendingAnswersRef.current.set(questionId, selectedOptions);
        }
        setSecurityError("Unable to save all answers. Please try again.");
        return false;
      }

      return true;
    } catch {
      for (const [questionId, selectedOptions] of pendingAnswers) {
        pendingAnswersRef.current.set(questionId, selectedOptions);
      }
      setSecurityError("Unable to save answers. Please try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitExam() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (!(await flushAnswers())) {
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }
    const result = await submitAttempt(attemptId);
    if (result.success) {
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => undefined);
      router.replace(`/results/${attemptId}`);
      return;
    }
    submittingRef.current = false;
    setSubmitting(false);
    setSecurityError(result.error ?? "Unable to submit exam.");
  }

  async function selectOption(optionId: string) {
    if (!currentQuestion || submitting) return;
    const selected = answers[currentQuestion.id] ?? [];
    const next =
      currentQuestion.question_type === "multiple"
        ? selected.includes(optionId)
          ? selected.filter((id) => id !== optionId)
          : [...selected, optionId]
        : [optionId];
    setAnswers((previous) => ({ ...previous, [currentQuestion.id]: next }));
    pendingAnswersRef.current.set(currentQuestion.id, next);

    if (pendingAnswersRef.current.size >= 5) {
      await flushAnswers();
    }
  }

  function toggleReviewMark() {
    if (!currentQuestion) return;
    setReviewMarks((previous) => ({
      ...previous,
      [currentQuestion.id]: !previous[currentQuestion.id],
    }));
  }

  if (!securityReady) {
    return (
      <main className="min-h-screen bg-[#111827] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-2xl border border-[#3b4556] bg-[#151e2d] p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-[#ff9900]">
              Secure Examination Environment
            </p>
            <h1 className="mt-3 text-2xl font-semibold">{mock.title}</h1>
            <p className="mt-4 text-sm text-gray-400">
              Screen sharing and fullscreen are required before the exam begins.
            </p>
            {securityError && (
              <p className="mt-4 border border-red-500/40 p-3 text-sm text-red-300">
                {securityError}
              </p>
            )}
            <button
              type="button"
              onClick={() => void beginExam()}
              className="mt-6 w-full bg-[#ff9900] px-5 py-3 font-mono text-sm font-bold uppercase text-black"
            >
              Start Secure Exam
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (!currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111827] text-white">
        <div className="border border-[#3b4556] bg-[#151e2d] px-8 py-6">
          No questions are available for this exam.
        </div>
      </main>
    );
  }

  const selectedOptions = answers[currentQuestion.id] ?? [];
  const formattedTime = new Date(timeLeft).toISOString().slice(11, 19);

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <header className="sticky top-0 z-10 border-b border-[#3b4556] bg-[#111827] px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{mock.title}</div>
            <div className="font-mono text-xs text-gray-500">
              Question {safeCurrentIndex + 1} / {questions.length}
            </div>
          </div>
          <div className="font-mono text-lg font-bold text-[#ff9900]">
            {formattedTime}
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[1fr_280px]">
        <section className="border border-[#3b4556] bg-[#151e2d]">
          <div className="border-b border-[#3b4556] px-6 py-5">
            <div className="font-mono text-xs uppercase text-gray-500">
              {currentQuestion.category ?? "Question"}
            </div>
            <h1 className="mt-4 text-lg leading-8">
              {currentQuestion.question_text}
            </h1>
          </div>
          <div className="space-y-3 p-6">
            {currentOptions.map((option, index) => {
              const selected = selectedOptions.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => void selectOption(option.id)}
                  className={`flex w-full gap-4 border px-4 py-4 text-left ${selected ? "border-[#ff9900] bg-[#ff9900]/10" : "border-[#3b4556] bg-[#111827]"}`}
                >
                  <span className="font-mono">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option.option_text}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between border-t border-[#3b4556] px-6 py-4">
            <button
              type="button"
              disabled={safeCurrentIndex === 0}
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              className="border border-[#3b4556] px-4 py-2 text-sm disabled:opacity-30"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={toggleReviewMark}
              className={`border px-4 py-2 text-sm ${
                reviewMarks[currentQuestion.id]
                  ? "border-purple-400 bg-purple-500/20 text-purple-300"
                  : "border-[#3b4556] text-gray-300"
              }`}
            >
              {reviewMarks[currentQuestion.id]
                ? "Unmark review"
                : "Mark for review"}
            </button>
            <span className="font-mono text-xs text-gray-500">
              {saving ? "Saving..." : `${answeredCount} answered`}
            </span>
            {safeCurrentIndex === questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={submitting}
                className="bg-[#ff9900] px-5 py-2 font-mono text-xs font-bold text-black"
              >
                Submit Exam
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setCurrentIndex((index) =>
                    Math.min(questions.length - 1, index + 1),
                  )
                }
                className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold text-black"
              >
                Next
              </button>
            )}
          </div>
        </section>
        <aside className="border border-[#3b4556] bg-[#151e2d] p-4">
          <div className="mb-3 font-mono text-xs uppercase text-gray-500">
            Question Navigator
          </div>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={`h-9 border font-mono text-xs ${
                  reviewMarks[question.id]
                    ? "border-purple-400 bg-purple-500/20 text-purple-300"
                    : (answers[question.id] ?? []).length > 0
                      ? "border-green-400 bg-green-500/20 text-green-300"
                      : "border-red-400 bg-red-500/20 text-red-300"
                } ${
                  index === safeCurrentIndex
                    ? "ring-2 ring-[#ff9900]/70"
                    : ""
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </aside>
      </div>
      {showSubmitModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md border border-[#3b4556] bg-[#151e2d] p-6">
            <h2 className="text-xl font-semibold">Submit your exam?</h2>
            <p className="mt-3 text-sm text-gray-400">
              You will not be able to change your answers after submission.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 border border-[#3b4556] px-4 py-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitExam()}
                className="flex-1 bg-[#ff9900] px-4 py-3 font-bold text-black"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
