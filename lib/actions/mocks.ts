"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_QUESTIONS = 500;

const ALLOWED_SETTINGS = [
  "fullscreen",
  "disable_copy",
  "disable_paste",
  "disable_context_menu",
  "detect_tab_switch",
  "auto_submit",
  "randomize_questions",
  "randomize_options",
] as const;

type SettingKey =
  (typeof ALLOWED_SETTINGS)[number];

type MockSettings = Record<
  SettingKey,
  boolean
>;

const DEFAULT_SETTINGS: MockSettings = {
  fullscreen: true,
  disable_copy: true,
  disable_paste: true,
  disable_context_menu: true,
  detect_tab_switch: true,
  auto_submit: true,
  randomize_questions: true,
  randomize_options: true,
};

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    UUID_REGEX.test(value)
  );
}

function normalizeSettings(
  settings: unknown,
): MockSettings {
  const result: MockSettings = {
    ...DEFAULT_SETTINGS,
  };

  if (
    !settings ||
    typeof settings !== "object" ||
    Array.isArray(settings)
  ) {
    return result;
  }

  const input =
    settings as Record<string, unknown>;

  for (const key of ALLOWED_SETTINGS) {
    if (typeof input[key] === "boolean") {
      result[key] = input[key];
    }
  }

  result.fullscreen = true;

  return result;
}

async function validateQuestions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionIds: string[],
  certificationId: string,
) {
  if (
    !Array.isArray(questionIds) ||
    questionIds.length < 1 ||
    questionIds.length > MAX_QUESTIONS
  ) {
    return {
      valid: false,
      error:
        "A mock must contain between 1 and 500 questions.",
    };
  }

  const uniqueIds = [
    ...new Set(questionIds),
  ];

  if (
    uniqueIds.length !== questionIds.length
  ) {
    return {
      valid: false,
      error:
        "Duplicate questions are not allowed.",
    };
  }

  if (
    uniqueIds.some(
      (id) => !isUuid(id),
    )
  ) {
    return {
      valid: false,
      error: "One or more question IDs are invalid.",
    };
  }

  const { data: questions, error } =
    await supabase
      .from("questions")
      .select(
        "id, certification_id",
      )
      .in("id", uniqueIds);

  if (error) {
    return {
      valid: false,
      error:
        "Failed to validate questions.",
    };
  }

  if (
    !questions ||
    questions.length !== uniqueIds.length
  ) {
    return {
      valid: false,
      error:
        "One or more selected questions do not exist.",
    };
  }

  const invalidCertification =
    questions.some(
      (question) =>
        question.certification_id !==
        certificationId,
    );

  if (invalidCertification) {
    return {
      valid: false,
      error:
        "All questions must belong to the selected certification.",
    };
  }

  return {
    valid: true,
    error: "",
  };
}

async function validateCertification(
  supabase: Awaited<ReturnType<typeof createClient>>,
  certificationId: string,
) {
  if (!isUuid(certificationId)) {
    return {
      valid: false,
      error: "Invalid certification.",
    };
  }

  const { data, error } =
    await supabase
      .from("certifications")
      .select("id")
      .eq("id", certificationId)
      .eq("active", true)
      .maybeSingle();

  if (error || !data) {
    return {
      valid: false,
      error:
        "Certification does not exist or is inactive.",
    };
  }

  return {
    valid: true,
    error: "",
  };
}

export async function createMock({
  title,
  description,
  durationMinutes,
  passingScore,
  settings,
  questionIds,
  certificationId,
}: {
  title: string;
  description?: string;
  durationMinutes: number;
  passingScore?: number | null;
  settings?: unknown;
  questionIds: string[];
  certificationId: string;
}) {
  const user = await requireAdmin();
  const supabase = await createClient();

  const cleanTitle =
    typeof title === "string"
      ? title.trim()
      : "";

  const cleanDescription =
    typeof description === "string"
      ? description.trim()
      : "";

  if (!cleanTitle) {
    return {
      success: false,
      error: "Mock title is required.",
    };
  }

  if (cleanTitle.length > 200) {
    return {
      success: false,
      error:
        "Mock title cannot exceed 200 characters.",
    };
  }

  if (cleanDescription.length > 5000) {
    return {
      success: false,
      error:
        "Description cannot exceed 5,000 characters.",
    };
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    return {
      success: false,
      error:
        "Duration must be between 1 and 1,440 minutes.",
    };
  }

  if (
    passingScore !== null &&
    passingScore !== undefined &&
    (!Number.isFinite(passingScore) ||
      passingScore < 0 ||
      passingScore > 100)
  ) {
    return {
      success: false,
      error:
        "Passing score must be between 0 and 100.",
    };
  }

  const certification =
    await validateCertification(
      supabase,
      certificationId,
    );

  if (!certification.valid) {
    return {
      success: false,
      error: certification.error,
    };
  }

  const questionValidation =
    await validateQuestions(
      supabase,
      questionIds,
      certificationId,
    );

  if (!questionValidation.valid) {
    return {
      success: false,
      error: questionValidation.error,
    };
  }

  const normalizedSettings =
    normalizeSettings(settings);

  const { data: mock, error } =
    await supabase
      .from("mocks")
      .insert({
        title: cleanTitle,
        description:
          cleanDescription || null,
        duration_minutes: durationMinutes,
        passing_score:
          passingScore ?? null,
        settings: normalizedSettings,
        status: "draft",
        certification_id:
          certificationId,
        created_by: user.profile.id,
      })
      .select("id")
      .single();

  if (error || !mock) {
    return {
      success: false,
      error: "Failed to create mock.",
    };
  }

  const mappings = questionIds.map(
    (questionId, index) => ({
      mock_id: mock.id,
      question_id: questionId,
      question_order: index + 1,
    }),
  );

  const { error: mappingError } =
    await supabase
      .from("mock_questions")
      .insert(mappings);

  if (mappingError) {
    await supabase
      .from("mocks")
      .delete()
      .eq("id", mock.id);

    return {
      success: false,
      error:
        "Failed to add questions to the mock.",
    };
  }

  return {
    success: true,
    error: "",
    mockId: mock.id,
  };
}

export async function updateMock({
  mockId,
  title,
  description,
  durationMinutes,
  passingScore,
  settings,
  certificationId,
}: {
  mockId: string;
  title: string;
  description?: string;
  durationMinutes: number;
  passingScore?: number | null;
  settings?: unknown;
  certificationId: string;
}) {
  const user = await requireAdmin();
  const supabase = await createClient();

  if (!isUuid(mockId)) {
    return {
      success: false,
      error: "Invalid mock ID.",
    };
  }

  const cleanTitle =
    typeof title === "string"
      ? title.trim()
      : "";

  const cleanDescription =
    typeof description === "string"
      ? description.trim()
      : "";

  if (!cleanTitle) {
    return {
      success: false,
      error: "Mock title is required.",
    };
  }

  if (cleanTitle.length > 200) {
    return {
      success: false,
      error:
        "Mock title cannot exceed 200 characters.",
    };
  }

  if (cleanDescription.length > 5000) {
    return {
      success: false,
      error:
        "Description cannot exceed 5,000 characters.",
    };
  }

  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < 1 ||
    durationMinutes > 1440
  ) {
    return {
      success: false,
      error:
        "Duration must be between 1 and 1,440 minutes.",
    };
  }

  if (
    passingScore !== null &&
    passingScore !== undefined &&
    (!Number.isFinite(passingScore) ||
      passingScore < 0 ||
      passingScore > 100)
  ) {
    return {
      success: false,
      error:
        "Passing score must be between 0 and 100.",
    };
  }

  const certification =
    await validateCertification(
      supabase,
      certificationId,
    );

  if (!certification.valid) {
    return {
      success: false,
      error: certification.error,
    };
  }

  const { data: existingMock, error: mockError } =
    await supabase
      .from("mocks")
      .select(
        "id, status, certification_id, created_by",
      )
      .eq("id", mockId)
      .maybeSingle();

  if (mockError || !existingMock) {
    return {
      success: false,
      error: "Mock not found.",
    };
  }

  if (existingMock.status !== "draft") {
    return {
      success: false,
      error:
        "Only draft mocks can be edited.",
    };
  }

  if (
    existingMock.certification_id !==
    certificationId
  ) {
    return {
      success: false,
      error:
        "Mock certification cannot be changed.",
    };
  }

  const normalizedSettings =
    normalizeSettings(settings);

  const { data, error } =
    await supabase
      .from("mocks")
      .update({
        title: cleanTitle,
        description:
          cleanDescription || null,
        duration_minutes: durationMinutes,
        passing_score:
          passingScore ?? null,
        settings: normalizedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", mockId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

  if (error || !data) {
    return {
      success: false,
      error: "Failed to update mock.",
    };
  }

  return {
    success: true,
    error: "",
    mockId: data.id,
  };
}

export async function updateMockQuestions({
  mockId,
  questionIds,
}: {
  mockId: string;
  questionIds: string[];
}) {
  await requireAdmin();
  const supabase = await createClient();

  if (!isUuid(mockId)) {
    return {
      success: false,
      error: "Invalid mock ID.",
    };
  }

  const { data: mock, error: mockError } =
    await supabase
      .from("mocks")
      .select(
        "id, status, certification_id",
      )
      .eq("id", mockId)
      .maybeSingle();

  if (mockError || !mock) {
    return {
      success: false,
      error: "Mock not found.",
    };
  }

  if (mock.status !== "draft") {
    return {
      success: false,
      error:
        "Only draft mocks can have their questions changed.",
    };
  }

  if (!mock.certification_id) {
    return {
      success: false,
      error:
        "Mock has no certification assigned.",
    };
  }

  const validation =
    await validateQuestions(
      supabase,
      questionIds,
      mock.certification_id,
    );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
    };
  }

  const { error: deleteError } =
    await supabase
      .from("mock_questions")
      .delete()
      .eq("mock_id", mockId);

  if (deleteError) {
    return {
      success: false,
      error:
        "Failed to update mock questions.",
    };
  }

  const mappings = questionIds.map(
    (questionId, index) => ({
      mock_id: mockId,
      question_id: questionId,
      question_order: index + 1,
    }),
  );

  const { error: insertError } =
    await supabase
      .from("mock_questions")
      .insert(mappings);

  if (insertError) {
    return {
      success: false,
      error:
        "Failed to save mock questions.",
    };
  }

  return {
    success: true,
    error: "",
  };
}

export async function publishMock(
  mockId: string,
) {
  await requireAdmin();
  const supabase = await createClient();

  if (!isUuid(mockId)) {
    return {
      success: false,
      error: "Invalid mock ID.",
    };
  }

  const { data: mock, error } =
    await supabase
      .from("mocks")
      .select(
        "id, status, certification_id",
      )
      .eq("id", mockId)
      .maybeSingle();

  if (error || !mock) {
    return {
      success: false,
      error: "Mock not found.",
    };
  }

  if (mock.status !== "draft") {
    return {
      success: false,
      error:
        "Only draft mocks can be published.",
    };
  }

  if (!mock.certification_id) {
    return {
      success: false,
      error:
        "Mock must have a certification.",
    };
  }

  const { count, error: countError } =
    await supabase
      .from("mock_questions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("mock_id", mockId);

  if (countError) {
    return {
      success: false,
      error:
        "Failed to validate mock questions.",
    };
  }

  if (!count || count < 1) {
    return {
      success: false,
      error:
        "A mock must contain at least one question.",
    };
  }

  const { error: updateError } =
    await supabase
      .from("mocks")
      .update({
        status: "published",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", mockId)
      .eq("status", "draft");

  if (updateError) {
    return {
      success: false,
      error:
        "Failed to publish mock.",
    };
  }

  return {
    success: true,
    error: "",
  };
}

export async function archiveMock(
  mockId: string,
) {
  await requireAdmin();
  const supabase = await createClient();

  if (!isUuid(mockId)) {
    return {
      success: false,
      error: "Invalid mock ID.",
    };
  }

  const { data: mock, error } =
    await supabase
      .from("mocks")
      .select("id, status")
      .eq("id", mockId)
      .maybeSingle();

  if (error || !mock) {
    return {
      success: false,
      error: "Mock not found.",
    };
  }

  if (mock.status === "archived") {
    return {
      success: false,
      error: "Mock is already archived.",
    };
  }

  const now =
    new Date().toISOString();

  const { count, error: slotError } =
    await supabase
      .from("exam_slots")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("mock_id", mockId)
      .eq("status", "scheduled")
      .gt("ends_at", now);

  if (slotError) {
    return {
      success: false,
      error:
        "Failed to validate scheduled slots.",
    };
  }

  if (count && count > 0) {
    return {
      success: false,
      error:
        "Cannot archive a mock with active scheduled slots.",
    };
  }

  const { error: updateError } =
    await supabase
      .from("mocks")
      .update({
        status: "archived",
        updated_at: now,
      })
      .eq("id", mockId)
      .neq("status", "archived");

  if (updateError) {
    return {
      success: false,
      error:
        "Failed to archive mock.",
    };
  }

  return {
    success: true,
    error: "",
  };
}