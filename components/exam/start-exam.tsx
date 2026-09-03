"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { startAttempt } from "@/lib/actions/attempts";

type Props = {
  slot: {
    id: string;
    starts_at: string;
    ends_at: string;
  };

  mock: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    passing_score: number | null;
    settings: Record<string, boolean>;
  };

  existingAttempt: {
    id: string;
    status: string;
  } | null;
};

type PreparationStep =
  | "idle"
  | "screen_share"
  | "fullscreen"
  | "starting"
  | "error";

export default function StartExam({
  slot,
  mock,
  existingAttempt,
}: Props) {
  const router = useRouter();

  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] =
    useState<PreparationStep>("idle");

  const inProgress =
    existingAttempt?.status === "in_progress";

  const fullscreenRequired =
    mock.settings.fullscreen !== false;

  const handleStart = async () => {
    if (starting) {
      return;
    }

    setError("");
    setStarting(true);
    setStep("screen_share");

    let screenStream: MediaStream | null = null;
    let enteredFullscreen = false;

    try {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getDisplayMedia
      ) {
        throw new Error(
          "Screen sharing is not supported by this browser.",
        );
      }

      screenStream =
        await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: {
              ideal: 5,
              max: 10,
            },
          },
          audio: false,
        });

      const videoTrack =
        screenStream.getVideoTracks()[0];

      if (
        !videoTrack ||
        videoTrack.readyState !== "live"
      ) {
        throw new Error(
          "A valid screen sharing stream is required.",
        );
      }

      if (fullscreenRequired) {
        setStep("fullscreen");

        if (!document.fullscreenElement) {
          try {
            await document.documentElement.requestFullscreen();
            enteredFullscreen = true;
          } catch {
            throw new Error(
              "Fullscreen access is required to begin the examination.",
            );
          }
        } else {
          enteredFullscreen = true;
        }

        if (!document.fullscreenElement) {
          throw new Error(
            "Fullscreen mode could not be enabled.",
          );
        }
      }

      setStep("starting");

      const result = await startAttempt(slot.id);

      if (!result.success || !result.attemptId) {
        throw new Error(
          result.error ||
            "Unable to start examination.",
        );
      }

      router.push(
        `/exam/${result.attemptId}`,
      );
    } catch (caughtError) {
      if (
        enteredFullscreen &&
        document.fullscreenElement
      ) {
        try {
          await document.exitFullscreen();
        } catch {}
      }

      screenStream?.getTracks().forEach(
        (track) => track.stop(),
      );

      setStep("error");

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to prepare the examination.",
      );

      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#111827]">
      <div className="aws-grid min-h-[calc(100vh-72px)] px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => router.push("/mocks")}
            disabled={starting}
            className="font-mono text-xs uppercase tracking-wider text-gray-500 hover:text-[#ff9900] disabled:pointer-events-none disabled:opacity-40"
          >
            ← Examinations
          </button>

          <section className="mt-8 border border-[#2d3544] bg-[#151e2d]">
            <div className="border-b border-[#2d3544] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9900]">
                Examination Ready
              </p>

              <h1 className="mt-3 text-3xl font-bold">
                {mock.title}
              </h1>

              {mock.description && (
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {mock.description}
                </p>
              )}
            </div>

            <div className="grid gap-px bg-[#2d3544] sm:grid-cols-3">
              <Info
                label="Duration"
                value={`${mock.duration_minutes} min`}
              />

              <Info
                label="Passing Score"
                value={
                  mock.passing_score != null
                    ? `${mock.passing_score}%`
                    : "—"
                }
              />

              <Info
                label="Slot Ends"
                value={formatDate(slot.ends_at)}
              />
            </div>

            <div className="p-6">
              <div className="border border-[#2d3544] bg-[#111827] p-5">
                <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Before You Begin
                </p>

                <ul className="mt-4 space-y-3 text-sm text-gray-400">
                  <li>
                    <span className="mr-2 text-[#ff9900]">
                      →
                    </span>
                    Your examination timer starts only
                    after the required security checks
                    are completed.
                  </li>

                  <li>
                    <span className="mr-2 text-[#ff9900]">
                      →
                    </span>
                    Screen sharing is required for the
                    entire examination.
                  </li>

                  {fullscreenRequired && (
                    <li>
                      <span className="mr-2 text-[#ff9900]">
                        →
                      </span>
                      Fullscreen mode is required.
                    </li>
                  )}

                  {mock.settings.detect_tab_switch && (
                    <li>
                      <span className="mr-2 text-[#ff9900]">
                        →
                      </span>
                      Tab switching will be recorded.
                    </li>
                  )}

                  <li>
                    <span className="mr-2 text-[#ff9900]">
                      →
                    </span>
                    Copy, paste, context-menu and other
                    restricted actions are blocked during
                    the examination.
                  </li>
                </ul>
              </div>

              {starting && (
                <div className="mt-5 border border-[#ff9900]/30 bg-[#ff9900]/5 px-5 py-4">
                  <p className="font-mono text-xs uppercase tracking-wider text-[#ff9900]">
                    {step === "screen_share" &&
                      "Waiting for screen sharing..."}

                    {step === "fullscreen" &&
                      "Enabling fullscreen..."}

                    {step === "starting" &&
                      "Starting examination..."}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Do not close this window.
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-5 border border-red-500/40 bg-red-500/5 px-5 py-4">
                  <p className="font-mono text-xs text-red-400">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleStart}
                disabled={starting}
                className="mt-6 w-full bg-[#ff9900] px-5 py-4 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {starting
                  ? step === "screen_share"
                    ? "Select Screen to Share..."
                    : step === "fullscreen"
                      ? "Entering Fullscreen..."
                      : "Starting Examination..."
                  : inProgress
                    ? "Resume Examination →"
                    : "I Am Ready — Start Exam →"}
              </button>

              <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-wider text-gray-600">
                Examination activity may be recorded for
                security and integrity purposes.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#151e2d] p-5">
      <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-white">
        {value}
      </p>
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