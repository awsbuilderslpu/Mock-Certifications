"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  saveAttemptAnswer,
  submitAttempt,
} from "@/lib/actions/attempts";

type QuestionOption = {
  id: string;
  option_text: string;
  option_order: number;
};

type Question = {
  id: string;
  question_text: string;
  question_type: "single" | "multiple";
  explanation?: string | null;
  difficulty?: string | null;
  category?: string | null;
  options: QuestionOption[];
};

type ExistingAnswer = {
  question_id: string;
  selected_options: string[];
};

type Props = {
  attemptId: string;
  mock: {
    id: string;
    title: string;
    duration_minutes: number;
    settings: Record<string, boolean>;
  };
  questions: Question[];
  existingAnswers: ExistingAnswer[];
  deadline: number;
};

type SecurityState =
  | "checking"
  | "screen_share"
  | "fullscreen"
  | "ready"
  | "failed";

const MAX_VIOLATIONS = 3;
const SECURITY_CHECK_INTERVAL = 5000;

export default function ExamRunner({
  attemptId,
  mock,
  questions,
  existingAnswers,
  deadline,
}: Props) {
  const router = useRouter();

  const [securityState, setSecurityState] =
    useState<SecurityState>("checking");

  const [fullscreenActive, setFullscreenActive] =
    useState(false);

  const [screenShareActive, setScreenShareActive] =
    useState(false);

  const [screenShareSurface, setScreenShareSurface] =
    useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState<
    Record<string, string[]>
  >(() => {
    const initial: Record<string, string[]> = {};

    for (const answer of existingAnswers) {
      initial[answer.question_id] =
        answer.selected_options;
    }

    return initial;
  });

  const [timeLeft, setTimeLeft] = useState(() =>
    Math.max(0, deadline - Date.now()),
  );

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [violationCount, setViolationCount] =
    useState(0);

  const [securityError, setSecurityError] =
    useState<string | null>(null);

  const [watchdogStatus, setWatchdogStatus] =
    useState("Waiting");

  const screenStreamRef =
    useRef<MediaStream | null>(null);

  const securityStartedRef = useRef(false);
  const submittingRef = useRef(false);

  const violationCountRef = useRef(0);

  const fullscreenRequired = true;
  const screenShareRequired = true;

  const currentQuestion = questions[currentIndex];

  const settings = useMemo(
    () => ({
      disable_copy:
        mock.settings?.disable_copy ?? true,

      disable_paste:
        mock.settings?.disable_paste ?? true,

      disable_context_menu:
        mock.settings?.disable_context_menu ?? true,

      detect_tab_switch:
        mock.settings?.detect_tab_switch ?? true,

      auto_submit:
        mock.settings?.auto_submit ?? true,
    }),
    [mock.settings],
  );

  /*
   * ---------------------------------------------------------
   * EVENT TELEMETRY
   * ---------------------------------------------------------
   */

  const recordEvent = useCallback(
    async (
      eventType: string,
      metadata: Record<string, unknown> = {},
    ) => {
      try {
        await fetch("/api/exam/events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attemptId,
            eventType,
            metadata,
          }),
          keepalive: true,
        });
      } catch {
        // Telemetry must never crash the exam.
      }
    },
    [attemptId],
  );

  /*
   * ---------------------------------------------------------
   * STOP SCREEN STREAM
   * ---------------------------------------------------------
   */

  const stopScreenShare = useCallback(() => {
    const stream = screenStreamRef.current;

    if (!stream) return;

    for (const track of stream.getTracks()) {
      track.stop();
    }

    screenStreamRef.current = null;
    setScreenShareActive(false);
    setScreenShareSurface(null);
  }, []);

  /*
   * ---------------------------------------------------------
   * SUBMISSION
   * ---------------------------------------------------------
   */

  const performSubmit = useCallback(
    async (reason?: string) => {
      if (submittingRef.current) return;

      submittingRef.current = true;
      setSubmitting(true);

      if (reason) {
        await recordEvent("auto_submitted", {
          reason,
        });
      }

      try {
        const result = await submitAttempt(attemptId);

        if (result.success) {
          stopScreenShare();

          if (document.fullscreenElement) {
            try {
              await document.exitFullscreen();
            } catch {
              // Ignore fullscreen cleanup errors.
            }
          }

          router.replace(`/results/${attemptId}`);
          router.refresh();

          return;
        }

        setSecurityError(
          result.error ?? "Unable to submit exam.",
        );

        submittingRef.current = false;
        setSubmitting(false);
      } catch {
        setSecurityError(
          "Unable to submit exam. Please try again.",
        );

        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      attemptId,
      recordEvent,
      router,
      stopScreenShare,
    ],
  );

  /*
   * ---------------------------------------------------------
   * REGISTER SECURITY VIOLATION
   * ---------------------------------------------------------
   */

  const registerViolation = useCallback(
    async (
      eventType: string,
      metadata: Record<string, unknown> = {},
    ) => {
      if (!securityStartedRef.current) return;

      violationCountRef.current += 1;

      const count = violationCountRef.current;

      setViolationCount(count);

      await recordEvent(eventType, {
        ...metadata,
        violation_count: count,
      });

      if (
        count >= MAX_VIOLATIONS &&
        settings.auto_submit &&
        !submittingRef.current
      ) {
        await performSubmit(
          `security_violation_limit_reached:${eventType}`,
        );
      }
    },
    [
      performSubmit,
      recordEvent,
      settings.auto_submit,
    ],
  );

  /*
   * ---------------------------------------------------------
   * SCREEN SHARE
   *
   * THIS IS INTENTIONALLY THE FIRST SECURITY ACTION.
   * ---------------------------------------------------------
   */

  const requestScreenShare = useCallback(
    async () => {
      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia
      ) {
        throw new Error(
          "Screen sharing is not supported by this browser.",
        );
      }

      const stream =
        await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: {
              ideal: 5,
              max: 15,
            },
          },
          audio: false,
        });

      const videoTrack =
        stream.getVideoTracks()[0];

      if (!videoTrack) {
        for (const track of stream.getTracks()) {
          track.stop();
        }

        throw new Error(
          "The browser did not provide a screen-sharing video stream.",
        );
      }

      const trackSettings =
        videoTrack.getSettings();

      const displaySurface =
        trackSettings.displaySurface ?? null;

      /*
       * Keep the stream alive.
       */
      screenStreamRef.current = stream;

      setScreenShareActive(true);
      setScreenShareSurface(displaySurface);

      await recordEvent(
        "screen_share_started",
        {
          display_surface: displaySurface,
        },
      );

      /*
       * Candidate clicking "Stop sharing" from the browser
       * must immediately invalidate the secure environment.
       */
      videoTrack.addEventListener(
        "ended",
        () => {
          screenStreamRef.current = null;

          setScreenShareActive(false);
          setScreenShareSurface(null);

          if (!securityStartedRef.current) {
            setSecurityState("failed");

            setSecurityError(
              "Screen sharing was stopped. Screen sharing is required to start the exam.",
            );

            return;
          }

          void registerViolation(
            "screen_share_stopped",
          );

          setSecurityError(
            "Screen sharing has stopped. It is required for this examination.",
          );
        },
      );

      return true;
    },
    [
      recordEvent,
      registerViolation,
    ],
  );

  /*
   * ---------------------------------------------------------
   * FULLSCREEN
   * ---------------------------------------------------------
   */

  const requestFullscreen = useCallback(
    async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen(
            {
              navigationUI: "hide",
            },
          );
        }

        return Boolean(
          document.fullscreenElement,
        );
      } catch {
        return false;
      }
    },
    [],
  );

  /*
   * ---------------------------------------------------------
   * START SECURE EXAM
   *
   * IMPORTANT:
   *
   * 1. Screen share FIRST.
   * 2. Fullscreen SECOND.
   *
   * Some browsers consume the transient user activation
   * while displaying the screen-share picker. Therefore,
   * if fullscreen cannot be entered immediately, we keep
   * the screen stream alive and show an Enter Fullscreen
   * button. The exam still does NOT start.
   * ---------------------------------------------------------
   */

  const startSecureExam = useCallback(
    async () => {
      if (securityStartedRef.current) {
        return;
      }

      setSecurityError(null);
      setSecurityState("screen_share");

      /*
       * STEP 1 — SCREEN SHARE FIRST
       */
      try {
        await requestScreenShare();
      } catch (error) {
        setSecurityState("failed");

        if (
          error instanceof DOMException &&
          error.name === "NotAllowedError"
        ) {
          setSecurityError(
            "Screen sharing is mandatory. Select a screen in the browser dialog and allow sharing.",
          );
        } else if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          setSecurityError(
            "Screen sharing was cancelled. You must share your screen to start the exam.",
          );
        } else {
          setSecurityError(
            error instanceof Error
              ? error.message
              : "Unable to start screen sharing.",
          );
        }

        stopScreenShare();

        return;
      }

      /*
       * STEP 2 — FULLSCREEN
       */
      setSecurityState("fullscreen");

      const fullscreenSuccess =
        await requestFullscreen();

      if (!fullscreenSuccess) {
        /*
         * Screen share stays ACTIVE.
         *
         * We do NOT ask for screen sharing again.
         */
        setFullscreenActive(
          Boolean(document.fullscreenElement),
        );

        setSecurityError(
          "Screen sharing is active. Fullscreen is now required before the exam can begin.",
        );

        return;
      }

      /*
       * STEP 3 — SECURITY ENVIRONMENT READY
       */
      securityStartedRef.current = true;

      setFullscreenActive(true);
      setScreenShareActive(true);
      setSecurityState("ready");

      await recordEvent("exam_started", {
        fullscreen_active: true,
        screen_share_active: true,
        display_surface: screenShareSurface,
      });
    },
    [
      recordEvent,
      requestFullscreen,
      requestScreenShare,
      screenShareSurface,
      stopScreenShare,
    ],
  );

  /*
   * ---------------------------------------------------------
   * RETRY FULLSCREEN
   *
   * Used when browser consumed the first user activation
   * on the screen-share picker.
   * ---------------------------------------------------------
   */

  const activateFullscreen = useCallback(
    async () => {
      setSecurityError(null);
      setSecurityState("fullscreen");

      const success =
        await requestFullscreen();

      if (!success) {
        setSecurityState("fullscreen");

        setSecurityError(
          "Fullscreen could not be activated. Please allow fullscreen and try again.",
        );

        return;
      }

      if (
        !screenStreamRef.current ||
        screenStreamRef.current
          .getVideoTracks()
          .every(
            (track) =>
              track.readyState === "ended",
          )
      ) {
        setSecurityState("failed");

        setScreenShareActive(false);

        setSecurityError(
          "Screen sharing is no longer active. Please restart the secure exam.",
        );

        return;
      }

      securityStartedRef.current = true;

      setFullscreenActive(true);
      setScreenShareActive(true);
      setSecurityState("ready");

      await recordEvent("exam_started", {
        fullscreen_active: true,
        screen_share_active: true,
        display_surface: screenShareSurface,
      });
    },
    [
      recordEvent,
      requestFullscreen,
      screenShareSurface,
    ],
  );

  /*
   * ---------------------------------------------------------
   * CONTINUOUS FULLSCREEN MONITOR
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        const active =
          Boolean(document.fullscreenElement);

        setFullscreenActive(active);

        if (!securityStartedRef.current) {
          return;
        }

        if (!active) {
          void registerViolation(
            "fullscreen_exited",
          );
        } else {
          void recordEvent(
            "fullscreen_entered",
          );
        }
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, [
    recordEvent,
    registerViolation,
  ]);

  /*
   * ---------------------------------------------------------
   * 5 SECOND SECURITY WATCHDOG
   *
   * This continuously verifies:
   *
   * - Fullscreen
   * - Screen share stream
   * - Screen share video track
   * - Document visibility
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (securityState !== "ready") {
      return;
    }

    const runSecurityCheck = () => {
      if (!securityStartedRef.current) {
        return;
      }

      let secure = true;

      /*
       * Fullscreen check.
       */
      const fullscreenOk =
        Boolean(document.fullscreenElement);

      setFullscreenActive(fullscreenOk);

      if (
        fullscreenRequired &&
        !fullscreenOk
      ) {
        secure = false;

        void registerViolation(
          "fullscreen_watchdog_failure",
        );
      }

      /*
       * Screen share stream check.
       */
      const stream =
        screenStreamRef.current;

      const videoTracks =
        stream?.getVideoTracks() ?? [];

      const screenShareOk =
        Boolean(stream) &&
        videoTracks.length > 0 &&
        videoTracks.some(
          (track) =>
            track.readyState === "live" &&
            track.enabled,
        );

      setScreenShareActive(
        screenShareOk,
      );

      if (
        screenShareRequired &&
        !screenShareOk
      ) {
        secure = false;

        void registerViolation(
          "screen_share_watchdog_failure",
        );
      }

      /*
       * Visibility check.
       */
      if (
        settings.detect_tab_switch &&
        document.hidden
      ) {
        secure = false;

        void registerViolation(
          "visibility_watchdog_failure",
        );
      }

      setWatchdogStatus(
        secure
          ? "Secure"
          : "Violation detected",
      );
    };

    runSecurityCheck();

    const interval =
      window.setInterval(
        runSecurityCheck,
        SECURITY_CHECK_INTERVAL,
      );

    return () => {
      window.clearInterval(interval);
    };
  }, [
    registerViolation,
    securityState,
    settings.detect_tab_switch,
    fullscreenRequired,
    screenShareRequired,
  ]);

  /*
   * ---------------------------------------------------------
   * VISIBILITY / WINDOW FOCUS MONITOR
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (securityState !== "ready") {
      return;
    }

    const handleVisibilityChange =
      () => {
        if (document.hidden) {
          if (
            settings.detect_tab_switch
          ) {
            void registerViolation(
              "tab_hidden",
            );
          }
        } else {
          void recordEvent(
            "tab_visible",
          );
        }
      };

    const handleBlur = () => {
      void registerViolation(
        "window_blurred",
      );
    };

    const handleFocus = () => {
      void recordEvent(
        "window_focused",
      );
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    window.addEventListener(
      "blur",
      handleBlur,
    );

    window.addEventListener(
      "focus",
      handleFocus,
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      window.removeEventListener(
        "blur",
        handleBlur,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );
    };
  }, [
    recordEvent,
    registerViolation,
    securityState,
    settings.detect_tab_switch,
  ]);

  /*
   * ---------------------------------------------------------
   * COPY / PASTE / KEYBOARD / CONTEXT MENU
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (securityState !== "ready") {
      return;
    }

    const handleCopy = (
      event: ClipboardEvent,
    ) => {
      if (!settings.disable_copy) {
        return;
      }

      event.preventDefault();

      void registerViolation(
        "copy_attempt",
      );
    };

    const handlePaste = (
      event: ClipboardEvent,
    ) => {
      if (!settings.disable_paste) {
        return;
      }

      event.preventDefault();

      void registerViolation(
        "paste_attempt",
      );
    };

    const handleCut = (
      event: ClipboardEvent,
    ) => {
      if (!settings.disable_copy) {
        return;
      }

      event.preventDefault();

      void registerViolation(
        "cut_attempt",
      );
    };

    const handleContextMenu = (
      event: MouseEvent,
    ) => {
      if (
        !settings.disable_context_menu
      ) {
        return;
      }

      event.preventDefault();

      void registerViolation(
        "context_menu_attempt",
      );
    };

    /*
     * MCQ exam — keyboard input is unnecessary.
     */
    const handleKeyboard = (
      event: KeyboardEvent,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      void registerViolation(
        "keyboard_attempt",
        {
          key: event.key,
          code: event.code,
          ctrl: event.ctrlKey,
          alt: event.altKey,
          shift: event.shiftKey,
          meta: event.metaKey,
        },
      );
    };

    const handleDragStart = (
      event: DragEvent,
    ) => {
      event.preventDefault();

      void registerViolation(
        "drag_attempt",
      );
    };

    const handleDrop = (
      event: DragEvent,
    ) => {
      event.preventDefault();

      void registerViolation(
        "drop_attempt",
      );
    };

    const handleBeforePrint = () => {
      void registerViolation(
        "print_attempt",
      );
    };

    document.addEventListener(
      "copy",
      handleCopy,
      true,
    );

    document.addEventListener(
      "paste",
      handlePaste,
      true,
    );

    document.addEventListener(
      "cut",
      handleCut,
      true,
    );

    document.addEventListener(
      "contextmenu",
      handleContextMenu,
      true,
    );

    document.addEventListener(
      "keydown",
      handleKeyboard,
      true,
    );

    document.addEventListener(
      "dragstart",
      handleDragStart,
      true,
    );

    document.addEventListener(
      "drop",
      handleDrop,
      true,
    );

    window.addEventListener(
      "beforeprint",
      handleBeforePrint,
    );

    return () => {
      document.removeEventListener(
        "copy",
        handleCopy,
        true,
      );

      document.removeEventListener(
        "paste",
        handlePaste,
        true,
      );

      document.removeEventListener(
        "cut",
        handleCut,
        true,
      );

      document.removeEventListener(
        "contextmenu",
        handleContextMenu,
        true,
      );

      document.removeEventListener(
        "keydown",
        handleKeyboard,
        true,
      );

      document.removeEventListener(
        "dragstart",
        handleDragStart,
        true,
      );

      document.removeEventListener(
        "drop",
        handleDrop,
        true,
      );

      window.removeEventListener(
        "beforeprint",
        handleBeforePrint,
      );
    };
  }, [
    registerViolation,
    securityState,
    settings.disable_context_menu,
    settings.disable_copy,
    settings.disable_paste,
  ]);

  /*
   * ---------------------------------------------------------
   * TIMER
   * ---------------------------------------------------------
   */

  useEffect(() => {
    if (securityState !== "ready") {
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        deadline - Date.now(),
      );

      setTimeLeft(remaining);

      if (
        remaining <= 0 &&
        !submittingRef.current
      ) {
        void performSubmit(
          "time_expired",
        );
      }
    };

    updateTimer();

    const interval =
      window.setInterval(
        updateTimer,
        1000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    deadline,
    performSubmit,
    securityState,
  ]);

  /*
   * ---------------------------------------------------------
   * CLEANUP
   * ---------------------------------------------------------
   */

  useEffect(() => {
    return () => {
      const stream =
        screenStreamRef.current;

      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }

        screenStreamRef.current = null;
      }
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * TIMER FORMAT
   * ---------------------------------------------------------
   */

  const formattedTime = useMemo(() => {
    const totalSeconds =
      Math.ceil(timeLeft / 1000);

    const hours =
      Math.floor(totalSeconds / 3600);

    const minutes =
      Math.floor(
        (totalSeconds % 3600) / 60,
      );

    const seconds =
      totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(
        2,
        "0",
      )}:${String(minutes).padStart(
        2,
        "0",
      )}:${String(seconds).padStart(
        2,
        "0",
      )}`;
    }

    return `${String(minutes).padStart(
      2,
      "0",
    )}:${String(seconds).padStart(
      2,
      "0",
    )}`;
  }, [timeLeft]);

  /*
   * ---------------------------------------------------------
   * ANSWER HANDLING
   * ---------------------------------------------------------
   */

  const selectOption = async (
    optionId: string,
  ) => {
    if (
      !currentQuestion ||
      submittingRef.current ||
      !screenShareActive ||
      (fullscreenRequired &&
        !fullscreenActive)
    ) {
      return;
    }

    let selected =
      answers[currentQuestion.id] ?? [];

    if (
      currentQuestion.question_type ===
      "multiple"
    ) {
      if (selected.includes(optionId)) {
        selected = selected.filter(
          (id) => id !== optionId,
        );
      } else {
        selected = [
          ...selected,
          optionId,
        ];
      }
    } else {
      selected = [optionId];
    }

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: selected,
    }));

    setSaving(true);

    try {
      await saveAttemptAnswer(
        attemptId,
        currentQuestion.id,
        selected,
      );
    } finally {
      setSaving(false);
    }
  };

  const goToQuestion = (
    index: number,
  ) => {
    if (
      index < 0 ||
      index >= questions.length
    ) {
      return;
    }

    setCurrentIndex(index);
  };

  const submitExam = async () => {
    if (submittingRef.current) {
      return;
    }

    const confirmed =
      window.confirm(
        "Submit your exam?\n\nYou will not be able to change your answers after submission.",
      );

    if (!confirmed) {
      return;
    }

    await performSubmit(
      "candidate_submitted",
    );
  };

  /*
   * ---------------------------------------------------------
   * SECURITY GATE
   * ---------------------------------------------------------
   */

  if (securityState !== "ready") {
    const screenShareReady = screenShareActive;

    const fullscreenReady =
      fullscreenActive;

    return (
      <main className="min-h-screen bg-[#111827] text-white">
        <div className="aws-grid min-h-screen">
          <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-12">
            <section className="w-full border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#3b4556] px-6 py-5">
                <div className="font-mono text-xs uppercase tracking-[0.25em] text-[#ff9900]">
                  Secure Examination Environment
                </div>

                <h1 className="mt-2 text-2xl font-semibold">
                  {mock.title}
                </h1>
              </div>

              <div className="space-y-6 p-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Security verification
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Screen sharing is mandatory.
                    After screen sharing is active,
                    fullscreen mode must also be
                    enabled before the examination
                    can begin.
                  </p>
                </div>

                <div className="space-y-3">
                  <SecurityRequirement
                    label="Screen Sharing"
                    enabled
                    active={screenShareReady}
                  />

                  <SecurityRequirement
                    label="Fullscreen"
                    enabled
                    active={fullscreenReady}
                  />

                  <SecurityRequirement
                    label="Copy / Paste Blocking"
                    enabled={
                      settings.disable_copy ||
                      settings.disable_paste
                    }
                  />

                  <SecurityRequirement
                    label="Right Click Blocking"
                    enabled={
                      settings.disable_context_menu
                    }
                  />

                  <SecurityRequirement
                    label="Keyboard Blocking"
                    enabled
                  />

                  <SecurityRequirement
                    label="Tab Switch Detection"
                    enabled={
                      settings.detect_tab_switch
                    }
                  />

                  <SecurityRequirement
                    label="Automatic Submission"
                    enabled={
                      settings.auto_submit
                    }
                  />
                </div>

                {screenShareSurface && (
                  <div className="border border-green-500/30 bg-green-500/5 px-4 py-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-green-400">
                      Screen share active
                    </div>

                    <div className="mt-1 text-xs text-gray-400">
                      Display surface:{" "}
                      <span className="text-gray-200">
                        {screenShareSurface}
                      </span>
                    </div>
                  </div>
                )}

                {securityError && (
                  <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {securityError}
                  </div>
                )}

                <div className="border border-[#3b4556] bg-[#111827] px-4 py-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    Current state
                  </div>

                  <div className="mt-1 text-sm text-gray-300">
                    {securityState ===
                      "checking" &&
                      "Ready to begin security verification."}

                    {securityState ===
                      "screen_share" &&
                      "Waiting for screen sharing permission..."}

                    {securityState ===
                      "fullscreen" &&
                      "Screen sharing active. Waiting for fullscreen..."}

                    {securityState ===
                      "failed" &&
                      "Security verification failed."}
                  </div>
                </div>

                {screenShareReady &&
                  !fullscreenReady && (
                    <button
                      type="button"
                      onClick={() =>
                        void activateFullscreen()
                      }
                      className="w-full bg-[#ff9900] px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33]"
                    >
                      Enter Fullscreen
                    </button>
                  )}

                {!screenShareReady && (
                  <button
                    type="button"
                    onClick={() =>
                      void startSecureExam()
                    }
                    disabled={submitting}
                    className="w-full bg-[#ff9900] px-5 py-3 font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-[#ffad33] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {securityState ===
                    "failed"
                      ? "Retry Security Check"
                      : "Start Secure Exam"}
                  </button>
                )}

                <div className="border-t border-[#2d3544] pt-4 text-xs leading-5 text-gray-500">
                  <strong className="text-gray-400">
                    Screen sharing:
                  </strong>{" "}
                  Your browser&apos;s native screen-sharing
                  dialog will appear first. Keep sharing
                  active for the entire examination. The
                  application does not record, upload, or
                  store the screen stream.
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * NO QUESTIONS
   * ---------------------------------------------------------
   */

  if (!currentQuestion) {
    return (
      <main className="min-h-screen bg-[#111827] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="border border-[#3b4556] bg-[#151e2d] px-8 py-6">
            No questions are available for this exam.
          </div>
        </div>
      </main>
    );
  }

  const selectedOptions =
    answers[currentQuestion.id] ?? [];

  /*
   * ---------------------------------------------------------
   * EXAM UI
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#111827] text-white">
      <div className="aws-grid min-h-screen">
        <header className="sticky top-0 z-50 border-b border-[#3b4556] bg-[#111827]/95 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {mock.title}
              </div>

              <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                Question{" "}
                {currentIndex + 1} /{" "}
                {questions.length}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div
                className={`font-mono text-lg font-bold ${
                  timeLeft <= 60_000
                    ? "text-red-400"
                    : "text-[#ff9900]"
                }`}
              >
                {formattedTime}
              </div>

              <div className="hidden border-l border-[#3b4556] pl-4 text-right sm:block">
                <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Security
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400">
                    ACTIVE
                  </span>

                  <span className="text-gray-600">
                    •
                  </span>

                  <span
                    className={
                      screenShareActive
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {screenShareActive
                      ? "SCREEN SHARE"
                      : "SHARE LOST"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="h-1 bg-[#0d1420]">
            <div
              className="h-full bg-[#ff9900] transition-all"
              style={{
                width: `${
                  ((currentIndex + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        </header>

        {(!screenShareActive ||
          !fullscreenActive) && (
          <div className="border-b border-red-500/40 bg-red-500/10 px-5 py-3 text-center text-sm text-red-300">
            <strong>
              Security requirement violated.
            </strong>{" "}
            Screen sharing and fullscreen must remain
            active during the examination.
          </div>
        )}

        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[1fr_280px]">
          <section className="border border-[#3b4556] bg-[#151e2d]">
            <div className="border-b border-[#3b4556] px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">
                {currentQuestion.category && (
                  <span className="border border-[#3b4556] px-2 py-1 font-mono text-[10px] uppercase text-gray-400">
                    {currentQuestion.category}
                  </span>
                )}

                {currentQuestion.difficulty && (
                  <span className="border border-[#3b4556] px-2 py-1 font-mono text-[10px] uppercase text-gray-400">
                    {currentQuestion.difficulty}
                  </span>
                )}

                <span className="border border-[#3b4556] px-2 py-1 font-mono text-[10px] uppercase text-gray-400">
                  {currentQuestion.question_type ===
                  "multiple"
                    ? "Multiple Select"
                    : "Single Select"}
                </span>
              </div>

              <h2 className="mt-5 text-lg font-medium leading-8">
                {currentQuestion.question_text}
              </h2>
            </div>

            <div className="space-y-3 p-6">
              {currentQuestion.options
                .slice()
                .sort(
                  (a, b) =>
                    a.option_order -
                    b.option_order,
                )
                .map(
                  (
                    option,
                    index,
                  ) => {
                    const selected =
                      selectedOptions.includes(
                        option.id,
                      );

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          void selectOption(
                            option.id,
                          )
                        }
                        className={`flex w-full items-start gap-4 border px-4 py-4 text-left transition ${
                          selected
                            ? "border-[#ff9900] bg-[#ff9900]/10"
                            : "border-[#3b4556] bg-[#111827] hover:border-gray-500"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center border font-mono text-xs ${
                            selected
                              ? "border-[#ff9900] bg-[#ff9900] text-black"
                              : "border-[#3b4556] text-gray-400"
                          }`}
                        >
                          {String.fromCharCode(
                            65 + index,
                          )}
                        </span>

                        <span className="pt-1 text-sm leading-6">
                          {
                            option.option_text
                          }
                        </span>
                      </button>
                    );
                  },
                )}
            </div>

            <div className="flex items-center justify-between border-t border-[#3b4556] px-6 py-4">
              <button
                type="button"
                onClick={() =>
                  goToQuestion(
                    currentIndex - 1,
                  )
                }
                disabled={
                  currentIndex === 0
                }
                className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase tracking-wider text-gray-300 hover:border-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Previous
              </button>

              <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                {saving
                  ? "Saving..."
                  : "Answer saved"}
              </div>

              {currentIndex ===
              questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    void submitExam()
                  }
                  disabled={submitting}
                  className="bg-[#ff9900] px-5 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-[#ffad33] disabled:opacity-50"
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Exam"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    goToQuestion(
                      currentIndex + 1,
                    )
                  }
                  className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-black hover:bg-[#ffad33]"
                >
                  Next →
                </button>
              )}
            </div>
          </section>

          <aside className="h-fit border border-[#3b4556] bg-[#151e2d] lg:sticky lg:top-24">
            <div className="border-b border-[#3b4556] px-4 py-3">
              <div className="font-mono text-xs uppercase tracking-wider text-gray-400">
                Question Navigator
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2 p-4">
              {questions.map(
                (
                  question,
                  index,
                ) => {
                  const answered =
                    (
                      answers[
                        question.id
                      ] ?? []
                    ).length > 0;

                  const active =
                    index ===
                    currentIndex;

                  return (
                    <button
                      key={
                        question.id
                      }
                      type="button"
                      onClick={() =>
                        goToQuestion(
                          index,
                        )
                      }
                      className={`h-9 border font-mono text-xs ${
                        active
                          ? "border-[#ff9900] bg-[#ff9900] text-black"
                          : answered
                            ? "border-green-500/50 bg-green-500/10 text-green-400"
                            : "border-[#3b4556] text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                },
              )}
            </div>

            <div className="border-t border-[#3b4556] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">
                  Answered
                </span>

                <span className="font-mono text-gray-300">
                  {
                    questions.filter(
                      (question) =>
                        (
                          answers[
                            question.id
                          ] ?? []
                        ).length > 0,
                    ).length
                  }{" "}
                  /{" "}
                  {questions.length}
                </span>
              </div>

              <div className="mt-4 border border-yellow-500/30 bg-yellow-500/5 p-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-yellow-400">
                  Security
                </div>

                <div className="mt-1 text-xs leading-5 text-gray-400">
                  Violations:{" "}
                  <span className="font-mono text-white">
                    {violationCount} /{" "}
                    {MAX_VIOLATIONS}
                  </span>
                </div>

                <div className="mt-1 text-xs leading-5 text-gray-400">
                  Fullscreen:{" "}
                  <span
                    className={
                      fullscreenActive
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {fullscreenActive
                      ? "ACTIVE"
                      : "EXITED"}
                  </span>
                </div>

                <div className="mt-1 text-xs leading-5 text-gray-400">
                  Screen share:{" "}
                  <span
                    className={
                      screenShareActive
                        ? "text-green-400"
                        : "text-red-400"
                    }
                  >
                    {screenShareActive
                      ? "ACTIVE"
                      : "STOPPED"}
                  </span>
                </div>

                <div className="mt-1 text-xs leading-5 text-gray-400">
                  Watchdog:{" "}
                  <span
                    className={
                      watchdogStatus ===
                      "Secure"
                        ? "text-green-400"
                        : "text-yellow-400"
                    }
                  >
                    {watchdogStatus}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {submitting && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#111827]/95">
            <div className="border border-[#3b4556] bg-[#151e2d] px-8 py-6 text-center">
              <div className="font-mono text-xs uppercase tracking-wider text-[#ff9900]">
                Processing submission
              </div>

              <div className="mt-2 text-sm text-gray-300">
                Please wait...
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SecurityRequirement({
  label,
  enabled,
  active = false,
}: {
  label: string;
  enabled: boolean;
  active?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border border-[#3b4556] bg-[#111827] px-4 py-3">
      <span className="text-sm text-gray-300">
        {label}
      </span>

      <span
        className={`font-mono text-[10px] uppercase ${
          !enabled
            ? "text-gray-600"
            : active
              ? "text-green-400"
              : "text-yellow-400"
        }`}
      >
        {!enabled
          ? "Disabled"
          : active
            ? "Active"
            : "Required"}
      </span>
    </div>
  );
}