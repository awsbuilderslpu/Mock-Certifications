"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const CERTIFICATION_TYPES = [
  "foundational",
  "associate",
  "professional",
  "specialty",
] as const;

export type CertificationType =
  (typeof CERTIFICATION_TYPES)[number];

export type CertificationInput = {
  provider: string;
  name: string;
  code: string;
  type: CertificationType;
  description?: string;
  active: boolean;
};

type ActionResult = {
  success: boolean;
  error?: string;
};

const MAX_PROVIDER_LENGTH = 100;
const MAX_NAME_LENGTH = 200;
const MAX_CODE_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 1000;

function normalizeInput(input: CertificationInput) {
  return {
    provider:
      typeof input.provider === "string"
        ? input.provider.trim()
        : "",
    name:
      typeof input.name === "string"
        ? input.name.trim()
        : "",
    code:
      typeof input.code === "string"
        ? input.code.trim().toUpperCase()
        : "",
    type: input.type,
    description:
      typeof input.description === "string"
        ? input.description.trim() || null
        : null,
    active: input.active === true,
  };
}

function validateInput(
  input: CertificationInput,
): string | null {
  const normalized = normalizeInput(input);

  if (!normalized.provider) {
    return "Provider is required.";
  }

  if (!normalized.name) {
    return "Certification name is required.";
  }

  if (!normalized.code) {
    return "Certification code is required.";
  }

  if (
    !CERTIFICATION_TYPES.includes(
      normalized.type,
    )
  ) {
    return "Invalid certification type.";
  }

  if (
    normalized.provider.length >
    MAX_PROVIDER_LENGTH
  ) {
    return `Provider cannot exceed ${MAX_PROVIDER_LENGTH} characters.`;
  }

  if (
    normalized.name.length >
    MAX_NAME_LENGTH
  ) {
    return `Certification name cannot exceed ${MAX_NAME_LENGTH} characters.`;
  }

  if (
    normalized.code.length >
    MAX_CODE_LENGTH
  ) {
    return `Certification code cannot exceed ${MAX_CODE_LENGTH} characters.`;
  }

  if (
    normalized.description &&
    normalized.description.length >
      MAX_DESCRIPTION_LENGTH
  ) {
    return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters.`;
  }

  return null;
}

function isDuplicateError(message: string) {
  return (
    message.includes("duplicate key") ||
    message.includes("23505")
  );
}

async function hasDuplicate(
  supabase: Awaited<
    ReturnType<typeof createClient>
  >,
  values: ReturnType<typeof normalizeInput>,
  excludeId?: string,
) {
  let query = supabase
    .from("certifications")
    .select("id")
    .eq("provider", values.provider)
    .eq("name", values.name)
    .limit(1);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { data, error } =
    await query.maybeSingle();

  return {
    duplicate: Boolean(data),
    error,
  };
}

export async function createCertification(
  input: CertificationInput,
): Promise<ActionResult> {
  await requireAdmin();

  const validationError =
    validateInput(input);

  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  const values = normalizeInput(input);
  const supabase = await createClient();

  const duplicate = await hasDuplicate(
    supabase,
    values,
  );

  if (duplicate.error) {
    return {
      success: false,
      error:
        "Failed to validate certification uniqueness.",
    };
  }

  if (duplicate.duplicate) {
    return {
      success: false,
      error:
        "A certification with this provider and name already exists.",
    };
  }

  const { error } = await supabase
    .from("certifications")
    .insert(values);

  if (error) {
    return {
      success: false,
      error: isDuplicateError(error.message)
        ? "A certification with this code or provider and name already exists."
        : "Failed to create certification.",
    };
  }

  revalidatePath("/admin/certifications");
  revalidatePath("/admin/questions/import");
  revalidatePath("/admin/mocks/new");

  return {
    success: true,
  };
}

export async function updateCertification(
  certificationId: string,
  input: CertificationInput,
): Promise<ActionResult> {
  await requireAdmin();

  if (!certificationId) {
    return {
      success: false,
      error: "Invalid certification ID.",
    };
  }

  const validationError =
    validateInput(input);

  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  const supabase = await createClient();
  const values = normalizeInput(input);

  const duplicate = await hasDuplicate(
    supabase,
    values,
    certificationId,
  );

  if (duplicate.error) {
    return {
      success: false,
      error:
        "Failed to validate certification uniqueness.",
    };
  }

  if (duplicate.duplicate) {
    return {
      success: false,
      error:
        "A certification with this provider and name already exists.",
    };
  }

  const { error } = await supabase
    .from("certifications")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificationId);

  if (error) {
    return {
      success: false,
      error: isDuplicateError(error.message)
        ? "A certification with this code or provider and name already exists."
        : "Failed to update certification.",
    };
  }

  revalidatePath("/admin/certifications");
  revalidatePath("/admin/questions/import");
  revalidatePath("/admin/mocks/new");

  return {
    success: true,
  };
}

export async function toggleCertificationStatus(
  certificationId: string,
  active: boolean,
): Promise<ActionResult> {
  await requireAdmin();

  if (!certificationId) {
    return {
      success: false,
      error: "Invalid certification ID.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("certifications")
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", certificationId);

  if (error) {
    return {
      success: false,
      error:
        "Failed to update certification status.",
    };
  }

  revalidatePath("/admin/certifications");
  revalidatePath("/admin/questions/import");
  revalidatePath("/admin/mocks/new");

  return {
    success: true,
  };
}

export async function deleteCertification(
  certificationId: string,
): Promise<ActionResult> {
  await requireAdmin();

  if (!certificationId) {
    return {
      success: false,
      error: "Invalid certification ID.",
    };
  }

  const supabase = await createClient();

  const [
    { count: questionCount, error: questionError },
    { count: mockCount, error: mockError },
  ] = await Promise.all([
    supabase
      .from("questions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "certification_id",
        certificationId,
      ),

    supabase
      .from("mocks")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq(
        "certification_id",
        certificationId,
      ),
  ]);

  if (questionError || mockError) {
    return {
      success: false,
      error:
        "Failed to check certification references.",
    };
  }

  if (
    (questionCount ?? 0) > 0 ||
    (mockCount ?? 0) > 0
  ) {
    return {
      success: false,
      error:
        "Certification is in use by questions or mocks. Deactivate it instead of deleting it.",
    };
  }

  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("id", certificationId);

  if (error) {
    return {
      success: false,
      error:
        "Failed to delete certification.",
    };
  }

  revalidatePath("/admin/certifications");

  return {
    success: true,
  };
}