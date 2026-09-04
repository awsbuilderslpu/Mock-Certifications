"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAttemptAnswer, submitAttempt } from "@/lib/actions/attempts";
import {
  clearScreenShareStream,
  getScreenShareStream,
} from "@/lib/exam-security";
import {
  FaceDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

type Question = {
  id: string;
  question_text: string;
  question_type: "single" | "multiple";
  difficulty?: string | null;
  category?: string | null;
  options: {
    id: string;
    option_text: string;
    option_order: number;
  }[];
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
  existingAnswers: {
    question_id: string;
    selected_options: string[];
  }[];
  deadline: number;
};

type CameraStatus =
  | "idle"
  | "starting"
  | "ready"
  | "no-face"
  | "multiple-faces"
  | "error";

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

  const badFaceChecksRef = useRef(0);
  const redirectingForProctoringRef = useRef(false);

  const [proctoringWarning, setProctoringWarning] = useState<
    "no-face" | "multiple-faces" | null
  >(null);

  const router = useRouter();

  const submittingRef = useRef(false);
  const pendingAnswersRef = useRef(new Map<string, string[]>());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const faceDetectionTimerRef = useRef<number | null>(null);

  const [securityReady, setSecurityReady] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);

  const [cameraStatus, setCameraStatus] =
    useState<CameraStatus>("idle");

  const [faceCount, setFaceCount] = useState<number | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};

    for (const answer of existingAnswers) {
      initial[answer.question_id] = Array.isArray(
        answer.selected_options,
      )
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
  const [reviewMarks, setReviewMarks] = useState<Record<string, boolean>>(
    {},
  );

  const safeCurrentIndex =
    questions.length > 0 && currentIndex < questions.length
      ? currentIndex
      : 0;

  const currentQuestion =
    questions.length > 0
      ? questions[safeCurrentIndex]
      : undefined;

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

  /*
   * ------------------------------------------------------------
   * CAMERA / FACE DETECTION
   * ------------------------------------------------------------
   */

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera access is not supported by this browser.",
      );
    }

    setCameraStatus("starting");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: {
          ideal: 640,
        },
        height: {
          ideal: 480,
        },
      },
      audio: false,
    });

    streamRef.current = stream;

    if (!videoRef.current) {
      throw new Error("Unable to initialize camera preview.");
    }

    videoRef.current.srcObject = stream;

    await videoRef.current.play();

    const vision = await FilesetResolver.forVisionTasks(
      "/mediapipe/wasm",
    );

    const detector = await FaceDetector.createFromOptions(
      vision,
      {
        baseOptions: {
          modelAssetPath:
            "/mediapipe/models/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5,
      },
    );

    faceDetectorRef.current = detector;

    setCameraStatus("ready");

    startFaceDetection();
  }

  async function startScreenShare() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error(
        "Whole-screen sharing is not supported by this browser.",
      );
    }

    const screenStream =
      getScreenShareStream() ??
      (await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          monitorTypeSurfaces: "include",
          selfBrowserSurface: "exclude",
          surfaceSwitching: "exclude",
          frameRate: { ideal: 5, max: 10 },
        } as MediaTrackConstraints,
        audio: false,
      }));

    const track = screenStream.getVideoTracks()[0];
    const displaySurface = track?.getSettings().displaySurface;

    if (!track || track.readyState !== "live") {
      clearScreenShareStream(screenStream);
      screenStream.getTracks().forEach((item) => item.stop());
      throw new Error("A live whole-screen share is required.");
    }

    if (displaySurface !== "monitor") {
      clearScreenShareStream(screenStream);
      screenStream.getTracks().forEach((item) => item.stop());
      throw new Error(
        "Please share your entire screen. Browser tabs and windows are not allowed.",
      );
    }

    screenStreamRef.current = screenStream;
    track.addEventListener("ended", () => {
      void handleSecurityViolation(
        "Screen sharing stopped. The examination has been terminated.",
      );
    });
  }

  function startFaceDetection() {
    if (faceDetectionTimerRef.current !== null) {
      window.clearInterval(faceDetectionTimerRef.current);
    }

    faceDetectionTimerRef.current = window.setInterval(() => {
      detectFaces();
    }, 700);
  }

  async function handleProctoringViolation(
    reason: "no-face" | "multiple-faces",
  ) {
    if (redirectingForProctoringRef.current) {
      return;
    }

    redirectingForProctoringRef.current = true;

    setProctoringWarning(reason);

    // Give the candidate enough time to actually see the warning.
    await new Promise((resolve) =>
      window.setTimeout(resolve, 1800),
    );

    stopCamera();

    if (document.fullscreenElement) {
      await document
        .exitFullscreen()
        .catch(() => undefined);
    }

    router.replace("/mock");
  }

  async function handleSecurityViolation(message: string) {
    if (redirectingForProctoringRef.current) {
      return;
    }

    redirectingForProctoringRef.current = true;
    setSecurityError(message);
    stopCamera();

    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => undefined);
    }

    router.replace("/mock");
  }

  function detectFaces() {
    const video = videoRef.current;
    const detector = faceDetectorRef.current;

    if (!video || !detector || redirectingForProctoringRef.current) {
      return;
    }

    if (
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) {
      return;
    }

    try {
      const result = detector.detectForVideo(
        video,
        performance.now(),
      );

      const count = result.detections?.length ?? 0;

      setFaceCount(count);

      // Exactly one face = everything is fine.
      if (count === 1) {
        badFaceChecksRef.current = 0;
        setCameraStatus("ready");
        setProctoringWarning(null);
        return;
      }

      // Bad detection.
      badFaceChecksRef.current += 1;

      if (count === 0) {
        setCameraStatus("no-face");
        setProctoringWarning("no-face");
      } else {
        setCameraStatus("multiple-faces");
        setProctoringWarning("multiple-faces");
      }

      // Require two consecutive bad detections.
      if (badFaceChecksRef.current >= 2) {
        void handleProctoringViolation(
          count === 0 ? "no-face" : "multiple-faces",
        );
      }
    } catch (error) {
      console.error(
        "[PROCTORING] Face detection failed:",
        error,
      );
    }
  }

  function stopCamera() {
    if (faceDetectionTimerRef.current !== null) {
      window.clearInterval(faceDetectionTimerRef.current);
      faceDetectionTimerRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }

      streamRef.current = null;
    }

    if (screenStreamRef.current) {
      for (const track of screenStreamRef.current.getTracks()) {
        track.stop();
      }

      clearScreenShareStream(screenStreamRef.current);
      screenStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (faceDetectorRef.current) {
      faceDetectorRef.current.close();
      faceDetectorRef.current = null;
    }

    setFaceCount(null);
    setCameraStatus("idle");
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!securityReady || !videoRef.current || !streamRef.current) {
      return;
    }

    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [securityReady]);

  /*
   * ------------------------------------------------------------
   * FULLSCREEN
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!securityReady) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        void handleSecurityViolation(
          "Fullscreen was exited. The examination has been terminated.",
        );
      }
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
  }, [securityReady]);

  useEffect(() => {
    if (!securityReady) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        void handleSecurityViolation(
          "Tab switching is not allowed during the examination.",
        );
      }
    };

    const blockRestrictedAction = (event: Event) => {
      event.preventDefault();
      void handleSecurityViolation(
        "Copy, cut, paste, and context-menu actions are not allowed during the examination.",
      );
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleVisibilityChange);
    document.addEventListener("copy", blockRestrictedAction);
    document.addEventListener("cut", blockRestrictedAction);
    document.addEventListener("paste", blockRestrictedAction);
    document.addEventListener("contextmenu", blockRestrictedAction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleVisibilityChange);
      document.removeEventListener("copy", blockRestrictedAction);
      document.removeEventListener("cut", blockRestrictedAction);
      document.removeEventListener("paste", blockRestrictedAction);
      document.removeEventListener("contextmenu", blockRestrictedAction);
    };
  }, [securityReady]);

  /*
   * ------------------------------------------------------------
   * TIMER
   * ------------------------------------------------------------
   */

  useEffect(() => {
    if (!securityReady) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        deadline - Date.now(),
      );

      setTimeLeft(remaining);

      if (remaining === 0) {
        void submitExam();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [deadline, securityReady]);

  /*
   * ------------------------------------------------------------
   * BEGIN EXAM
   * ------------------------------------------------------------
   */

  async function beginExam() {
    setSecurityError(null);

    try {
      await document.documentElement.requestFullscreen();

      await startScreenShare();

      await startCamera();

      /*
       * Give the camera a moment to produce its first frame.
       * This avoids starting the exam before detection is ready.
       */
      await new Promise((resolve) =>
        window.setTimeout(resolve, 1000),
      );

      const video = videoRef.current;
      const detector = faceDetectorRef.current;

      if (!video || !detector) {
        throw new Error(
          "Unable to initialize camera proctoring.",
        );
      }

      const result = detector.detectForVideo(
        video,
        performance.now(),
      );

      const count = result.detections?.length ?? 0;

      setFaceCount(count);

      if (count !== 1) {
        if (count === 0) {
          setCameraStatus("no-face");
          throw new Error(
            "No face was detected. Please position yourself clearly in front of the camera.",
          );
        }

        setCameraStatus("multiple-faces");

        throw new Error(
          "Multiple faces were detected. Please ensure that only you are visible before starting the exam.",
        );
      }

      setCameraStatus("ready");
      setSecurityReady(true);
    } catch (error) {
      stopCamera();

      if (document.fullscreenElement) {
        await document
          .exitFullscreen()
          .catch(() => undefined);
      }

      setSecurityError(
        error instanceof Error
          ? error.message
          : "Unable to initialize the secure examination environment.",
      );
    }
  }

  /*
   * ------------------------------------------------------------
   * ANSWERS
   * ------------------------------------------------------------
   */

  async function flushAnswers() {
    const pendingAnswers = Array.from(
      pendingAnswersRef.current.entries(),
    );

    if (pendingAnswers.length === 0) {
      return true;
    }

    pendingAnswersRef.current.clear();
    setSaving(true);

    try {
      const results = await Promise.all(
        pendingAnswers.map(
          ([questionId, selectedOptions]) =>
            saveAttemptAnswer(
              attemptId,
              questionId,
              selectedOptions,
            ),
        ),
      );

      const failed = results.some(
        (result) => !result.success,
      );

      if (failed) {
        for (const [
          questionId,
          selectedOptions,
        ] of pendingAnswers) {
          pendingAnswersRef.current.set(
            questionId,
            selectedOptions,
          );
        }

        setSecurityError(
          "Unable to save all answers. Please try again.",
        );

        return false;
      }

      return true;
    } catch {
      for (const [
        questionId,
        selectedOptions,
      ] of pendingAnswers) {
        pendingAnswersRef.current.set(
          questionId,
          selectedOptions,
        );
      }

      setSecurityError(
        "Unable to save answers. Please try again.",
      );

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

    stopCamera();

    const result = await submitAttempt(attemptId);

    if (result.success) {
      if (document.fullscreenElement) {
        await document
          .exitFullscreen()
          .catch(() => undefined);
      }

      router.replace(`/results/${attemptId}`);
      return;
    }

    submittingRef.current = false;
    setSubmitting(false);

    setSecurityError(
      result.error ?? "Unable to submit exam.",
    );
  }

  async function selectOption(optionId: string) {
    if (!currentQuestion || submitting) return;

    const selected =
      answers[currentQuestion.id] ?? [];

    const next =
      currentQuestion.question_type === "multiple"
        ? selected.includes(optionId)
          ? selected.filter(
              (id) => id !== optionId,
            )
          : [...selected, optionId]
        : [optionId];

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: next,
    }));

    pendingAnswersRef.current.set(
      currentQuestion.id,
      next,
    );

    if (pendingAnswersRef.current.size >= 5) {
      await flushAnswers();
    }
  }

  function toggleReviewMark() {
    if (!currentQuestion) return;

    setReviewMarks((previous) => ({
      ...previous,
      [currentQuestion.id]:
        !previous[currentQuestion.id],
    }));
  }

  /*
   * ------------------------------------------------------------
   * SECURITY SCREEN
   * ------------------------------------------------------------
   */

  if (!securityReady) {
    return (
      <main className="min-h-screen bg-[#111827] text-white">
        <div className="flex min-h-screen items-center justify-center px-6">
          <section className="w-full max-w-2xl border border-[#3b4556] bg-[#151e2d] p-8">
            <p className="font-mono text-xs uppercase tracking-wider text-[#ff9900]">
              Secure Examination Environment
            </p>

            <h1 className="mt-3 text-2xl font-semibold">
              {mock.title}
            </h1>

            <p className="mt-4 text-sm text-gray-400">
              Fullscreen mode and camera access are required
              before the exam begins.
            </p>

            <div className="mt-6 overflow-hidden border border-[#3b4556] bg-black">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="aspect-video w-full object-cover"
              />
            </div>

            <div className="mt-4 flex items-center justify-between border border-[#3b4556] bg-[#111827] px-4 py-3">
              <span className="font-mono text-xs uppercase text-gray-500">
                Camera Status
              </span>

              <span
                className={
                  cameraStatus === "ready"
                    ? "text-green-400"
                    : cameraStatus === "multiple-faces"
                      ? "text-red-400"
                      : cameraStatus === "no-face"
                        ? "text-yellow-400"
                        : "text-gray-400"
                }
              >
                {cameraStatus === "idle" &&
                  "Not initialized"}

                {cameraStatus === "starting" &&
                  "Initializing..."}

                {cameraStatus === "ready" &&
                  "✓ One face detected"}

                {cameraStatus === "no-face" &&
                  "⚠ No face detected"}

                {cameraStatus === "multiple-faces" &&
                  "🚨 Multiple faces detected"}

                {cameraStatus === "error" &&
                  "Camera error"}
              </span>
            </div>

            {cameraStatus === "multiple-faces" && (
              <div className="mt-4 border border-red-500/40 bg-red-500/10 p-4">
                <p className="font-semibold text-red-300">
                  Multiple Faces Detected
                </p>

                <p className="mt-2 text-sm text-red-200/80">
                  Please make sure that only you are visible
                  in the camera before starting.
                </p>
              </div>
            )}

            {cameraStatus === "no-face" && (
              <div className="mt-4 border border-yellow-500/40 bg-yellow-500/10 p-4">
                <p className="font-semibold text-yellow-300">
                  Face Not Detected
                </p>

                <p className="mt-2 text-sm text-yellow-200/80">
                  Position yourself clearly in front of
                  the camera.
                </p>
              </div>
            )}

            {securityError && (
              <p className="mt-4 border border-red-500/40 p-3 text-sm text-red-300">
                {securityError}
              </p>
            )}

            <div className="mt-6 border border-[#3b4556] bg-[#111827] p-4 text-sm text-gray-400">
              <p>
                Your camera is used only for this
                proctoring simulation.
              </p>

              <p className="mt-2">
                No camera footage or images are recorded,
                uploaded, or stored.
              </p>

              <p className="mt-2">
                In an actual examination, multiple faces
                detected in the camera view may result in
                immediate cancellation of the examination.
              </p>
            </div>

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

  /*
   * ------------------------------------------------------------
   * EMPTY EXAM
   * ------------------------------------------------------------
   */

  if (!currentQuestion) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#111827] text-white">
        <div className="border border-[#3b4556] bg-[#151e2d] px-8 py-6">
          No questions are available for this exam.
        </div>
      </main>
    );
  }

  const selectedOptions =
    answers[currentQuestion.id] ?? [];

  const formattedTime = new Date(timeLeft)
    .toISOString()
    .slice(11, 19);

  /*
   * ------------------------------------------------------------
   * EXAM UI
   * ------------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <header className="sticky top-0 z-10 border-b border-[#3b4556] bg-[#111827] px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">
              {mock.title}
            </div>

            <div className="font-mono text-xs text-gray-500">
              Question {safeCurrentIndex + 1} /{" "}
              {questions.length}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Camera indicator */}
            <div
              className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-xs ${
                cameraStatus === "multiple-faces"
                  ? "border-red-500/50 bg-red-500/10 text-red-300"
                  : cameraStatus === "no-face"
                    ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                    : "border-green-500/30 bg-green-500/10 text-green-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  cameraStatus === "multiple-faces"
                    ? "bg-red-400"
                    : cameraStatus === "no-face"
                      ? "bg-yellow-400"
                      : "bg-green-400"
                }`}
              />

              {cameraStatus === "multiple-faces"
                ? "MULTIPLE FACES"
                : cameraStatus === "no-face"
                  ? "FACE NOT DETECTED"
                  : "CAMERA OK"}
            </div>

            <div className="font-mono text-lg font-bold text-[#ff9900]">
              {formattedTime}
            </div>
          </div>
        </div>
      </header>

      {/* Proctoring warning */}
      {(cameraStatus === "multiple-faces" ||
        cameraStatus === "no-face") && (
        <div
          className={`border-b px-5 py-3 ${
            cameraStatus === "multiple-faces"
              ? "border-red-500/40 bg-red-500/10"
              : "border-yellow-500/40 bg-yellow-500/10"
          }`}
        >
          <div className="mx-auto max-w-7xl">
            <p
              className={`font-semibold ${
                cameraStatus === "multiple-faces"
                  ? "text-red-300"
                  : "text-yellow-300"
              }`}
            >
              {cameraStatus === "multiple-faces"
                ? "🚨 Multiple Faces Detected"
                : "⚠️ Face Not Detected"}
            </p>

            <p className="mt-1 text-sm text-gray-300">
              {cameraStatus === "multiple-faces"
                ? "Please ensure that only you are visible in the camera. In an actual examination, multiple faces may result in immediate cancellation."
                : "Please remain clearly visible to the camera."}
            </p>
          </div>
        </div>
      )}

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
              const selected =
                selectedOptions.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    void selectOption(option.id)
                  }
                  className={`flex w-full gap-4 border px-4 py-4 text-left ${
                    selected
                      ? "border-[#ff9900] bg-[#ff9900]/10"
                      : "border-[#3b4556] bg-[#111827]"
                  }`}
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
              onClick={() =>
                setCurrentIndex((index) =>
                  Math.max(0, index - 1),
                )
              }
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
              {saving
                ? "Saving..."
                : `${answeredCount} answered`}
            </span>

            {safeCurrentIndex ===
            questions.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setShowSubmitModal(true)
                }
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
                    Math.min(
                      questions.length - 1,
                      index + 1,
                    ),
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
                onClick={() =>
                  setCurrentIndex(index)
                }
                className={`h-9 border font-mono text-xs ${
                  reviewMarks[question.id]
                    ? "border-purple-400 bg-purple-500/20 text-purple-300"
                    : (
                          answers[question.id] ?? []
                        ).length > 0
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

      <div className="fixed bottom-5 left-5 z-30 w-48 overflow-hidden border border-[#3b4556] bg-black shadow-2xl">
        <div className="relative aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="h-full w-full object-cover"
          />

          <div className="absolute left-2 top-2 flex items-center gap-1.5 bg-black/70 px-2 py-1 font-mono text-[9px] uppercase">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                cameraStatus === "ready"
                  ? "bg-green-400"
                  : "bg-red-400"
              }`}
            />

            {cameraStatus === "ready"
              ? "Camera OK"
              : "Check Camera"}
          </div>
        </div>
      </div>

      {proctoringWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-5">
          <div className="w-full max-w-lg border border-red-500/50 bg-[#151e2d] p-8 text-center shadow-2xl">
            <div className="font-mono text-xs uppercase tracking-widest text-red-400">
              Proctoring Violation
            </div>

            <h2 className="mt-3 text-2xl font-bold text-white">
              {proctoringWarning === "multiple-faces"
                ? "Multiple Faces Detected"
                : "Candidate Not Detected"}
            </h2>

            <p className="mt-4 text-sm leading-6 text-gray-400">
              {proctoringWarning === "multiple-faces"
                ? "More than one person has been detected in the camera view."
                : "You are no longer visible in the camera view."}
            </p>

            <div className="mt-5 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              Your mock examination will now be terminated.
              <br />
              <span className="font-semibold">
                In an actual examination, this may result in
                immediate cancellation of your exam.
              </span>
            </div>

            <p className="mt-5 font-mono text-xs text-gray-500">
              Returning to examinations...
            </p>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-md border border-[#3b4556] bg-[#151e2d] p-6">
            <h2 className="text-xl font-semibold">
              Submit your exam?
            </h2>

            <p className="mt-3 text-sm text-gray-400">
              You will not be able to change your answers
              after submission.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setShowSubmitModal(false)
                }
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