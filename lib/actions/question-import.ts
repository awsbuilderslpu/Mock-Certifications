"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ImportRow = {
  question: string;
  opt1: string;
  opt2: string;
  opt3: string;
  opt4: string;
  question_type: "single" | "multiple";
  correct_answers: string;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
};

type ImportResult = {
  success: boolean;
  imported: number;
  errors: string[];
};

function parseCorrectAnswers(
  value: string,
): number[] {
  return value
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) =>
      Number.isInteger(value),
    );
}

function validateRow(
  row: ImportRow,
  index: number,
): string[] {
  const errors: string[] = [];
  const rowNumber = index + 2;

  if (!row.question?.trim()) {
    errors.push(
      `Row ${rowNumber}: question is missing`,
    );
  }

  const options = [
    row.opt1,
    row.opt2,
    row.opt3,
    row.opt4,
  ];

  if (
    options.some(
      (option) => !option?.trim(),
    )
  ) {
    errors.push(
      `Row ${rowNumber}: all four options are required`,
    );
  }

  if (
    row.question_type !== "single" &&
    row.question_type !== "multiple"
  ) {
    errors.push(
      `Row ${rowNumber}: question_type must be "single" or "multiple"`,
    );
  }

  const answers = parseCorrectAnswers(
    row.correct_answers,
  );

  if (answers.length === 0) {
    errors.push(
      `Row ${rowNumber}: correct_answers is missing`,
    );
  }

  if (
    answers.some(
      (answer) => answer < 1 || answer > 4,
    )
  ) {
    errors.push(
      `Row ${rowNumber}: correct_answers must contain numbers between 1 and 4`,
    );
  }

  if (
    new Set(answers).size !== answers.length
  ) {
    errors.push(
      `Row ${rowNumber}: duplicate correct answers`,
    );
  }

  if (
    row.question_type === "single" &&
    answers.length !== 1
  ) {
    errors.push(
      `Row ${rowNumber}: single-choice questions must have exactly one correct answer`,
    );
  }

  if (
    row.question_type === "multiple" &&
    answers.length < 2
  ) {
    errors.push(
      `Row ${rowNumber}: multiple-choice questions must have at least two correct answers`,
    );
  }

  if (
    row.difficulty &&
    !["easy", "medium", "hard"].includes(
      row.difficulty,
    )
  ) {
    errors.push(
      `Row ${rowNumber}: difficulty must be easy, medium, or hard`,
    );
  }

  return errors;
}

export async function importQuestions(
  rows: ImportRow[],
  certificationId: string,
): Promise<ImportResult> {
  await requireAdmin();

  if (!certificationId?.trim()) {
    return {
      success: false,
      imported: 0,
      errors: [
        "Certification is required.",
      ],
    };
  }

  if (!rows.length) {
    return {
      success: false,
      imported: 0,
      errors: [
        "CSV contains no questions.",
      ],
    };
  }

  if (rows.length > 500) {
    return {
      success: false,
      imported: 0,
      errors: [
        "Import cannot contain more than 500 questions.",
      ],
    };
  }

  const errors = rows.flatMap(
    (row, index) =>
      validateRow(row, index),
  );

  if (errors.length > 0) {
    return {
      success: false,
      imported: 0,
      errors,
    };
  }

  const supabase = await createClient();

  const payload = rows.map((row) => ({
    question: row.question.trim(),

    opt1: row.opt1.trim(),
    opt2: row.opt2.trim(),
    opt3: row.opt3.trim(),
    opt4: row.opt4.trim(),

    question_type: row.question_type,

    correct_answers:
      parseCorrectAnswers(
        row.correct_answers,
      ),

    difficulty:
      row.difficulty?.trim() ||
      "medium",

    category:
      row.category?.trim() || null,
  }));

  const { data, error } =
    await supabase.rpc(
      "import_questions_bulk",
      {
        questions_data: payload,
        certification_id_filter:
          certificationId,
      },
    );

  if (error) {
    return {
      success: false,
      imported: 0,
      errors: [
        `Import failed: ${error.message}`,
      ],
    };
  }

  revalidatePath("/admin/questions");

  return {
    success: true,
    imported: Number(data),
    errors: [],
  };
}