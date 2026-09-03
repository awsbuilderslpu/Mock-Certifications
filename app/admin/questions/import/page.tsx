"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Papa from "papaparse";

import { createClient } from "@/lib/supabase/client";
import { importQuestions } from "@/lib/actions/question-import";

type Certification = {
  id: string;
  provider: string;
  name: string;
  code: string;
};

type CSVRow = {
  question: string;
  opt1: string;
  opt2: string;
  opt3: string;
  opt4: string;
  question_type: "single" | "multiple";
  correct_answers: string;
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
  explanation?: string;
};

type ParsedRow = CSVRow & {
  rowNumber: number;
  errors: string[];
};

type ImportResult = {
  success: boolean;
  imported: number;
  errors: string[];
};

const REQUIRED_HEADERS = [
  "question",
  "opt1",
  "opt2",
  "opt3",
  "opt4",
  "question_type",
  "correct_answers",
  "difficulty",
  "category",
  "explanation",
] as const;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const MAX_QUESTION_LENGTH = 5000;
const MAX_OPTION_LENGTH = 1000;
const MAX_CATEGORY_LENGTH = 100;
const MAX_EXPLANATION_LENGTH = 5000;
const MAX_FIELD_LENGTH = 5000;

function normalizeString(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function validateRow(
  row: Record<string, unknown>,
  rowNumber: number,
): ParsedRow {
  const errors: string[] = [];

  const question = normalizeString(row.question);
  const opt1 = normalizeString(row.opt1);
  const opt2 = normalizeString(row.opt2);
  const opt3 = normalizeString(row.opt3);
  const opt4 = normalizeString(row.opt4);
  const questionType = normalizeString(
    row.question_type,
  );
  const correctAnswers = normalizeString(
    row.correct_answers,
  );
  const difficulty = normalizeString(
    row.difficulty,
  );
  const category = normalizeString(row.category);
  const explanation = normalizeString(row.explanation);

  if (!question) {
    errors.push("Question is missing");
  } else if (
    question.length > MAX_QUESTION_LENGTH
  ) {
    errors.push(
      `Question exceeds ${MAX_QUESTION_LENGTH} characters`,
    );
  }

  const options = [
    opt1,
    opt2,
    opt3,
    opt4,
  ];

  if (options.some((option) => !option)) {
    errors.push("All four options are required");
  }

  if (
    options.some(
      (option) =>
        option.length > MAX_OPTION_LENGTH,
    )
  ) {
    errors.push(
      `Options cannot exceed ${MAX_OPTION_LENGTH} characters`,
    );
  }

  if (
    questionType !== "single" &&
    questionType !== "multiple"
  ) {
    errors.push("Invalid question type");
  }

  const rawAnswers = correctAnswers
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const answers = rawAnswers.map((value) =>
    Number(value),
  );

  if (!rawAnswers.length) {
    errors.push("Correct answer is missing");
  } else if (
    answers.some(
      (answer, index) =>
        rawAnswers[index] !== String(answer) ||
        !Number.isInteger(answer) ||
        answer < 1 ||
        answer > 4,
    )
  ) {
    errors.push(
      "Answers must be integers between 1 and 4",
    );
  } else if (
    new Set(answers).size !== answers.length
  ) {
    errors.push(
      "Duplicate correct answers are not allowed",
    );
  } else if (
    questionType === "single" &&
    answers.length !== 1
  ) {
    errors.push(
      "Single question needs exactly one answer",
    );
  } else if (
    questionType === "multiple" &&
    answers.length < 2
  ) {
    errors.push(
      "Multiple question needs 2+ answers",
    );
  }

  if (
    difficulty &&
    !["easy", "medium", "hard"].includes(
      difficulty,
    )
  ) {
    errors.push("Invalid difficulty");
  }

  if (
    category.length > MAX_CATEGORY_LENGTH
  ) {
    errors.push(
      `Category exceeds ${MAX_CATEGORY_LENGTH} characters`,
    );
  }

  if (
    difficulty.length > MAX_FIELD_LENGTH
  ) {
    errors.push("Difficulty value is too long");
  }

  if (
    category.length > MAX_FIELD_LENGTH
  ) {
    errors.push("Category value is too long");
  }

  if (explanation.length > MAX_EXPLANATION_LENGTH) {
    errors.push(
      `Explanation exceeds ${MAX_EXPLANATION_LENGTH} characters`,
    );
  }

  return {
    question,
    opt1,
    opt2,
    opt3,
    opt4,
    question_type:
      questionType === "multiple"
        ? "multiple"
        : "single",
    correct_answers: answers.join(","),
    difficulty:
      difficulty === "easy" ||
      difficulty === "medium" ||
      difficulty === "hard"
        ? difficulty
        : undefined,
    category: category || undefined,
    explanation: explanation || undefined,
    rowNumber,
    errors,
  };
}

function validateHeaders(
  fields: string[] | undefined,
): string[] {
  if (
    !fields ||
    fields.length !==
      REQUIRED_HEADERS.length
  ) {
    return [
      "CSV headers do not match the required format.",
    ];
  }

  const normalized = fields.map((field) =>
    field.trim().toLowerCase(),
  );

  const matches = REQUIRED_HEADERS.every(
    (header, index) =>
      normalized[index] === header,
  );

  if (!matches) {
    return [
      `Invalid CSV headers. Required order: ${REQUIRED_HEADERS.join(", ")}`,
    ];
  }

  return [];
}

export default function ImportQuestionsPage() {
  const fileInputRef =
    useRef<HTMLInputElement>(null);

  const [certifications, setCertifications] =
    useState<Certification[]>([]);
  const [
    certificationsLoading,
    setCertificationsLoading,
  ] = useState(true);
  const [certificationId, setCertificationId] =
    useState("");

  const [rows, setRows] = useState<
    ParsedRow[]
  >([]);
  const [fileName, setFileName] =
    useState("");
  const [parsing, setParsing] =
    useState(false);
  const [importing, setImporting] =
    useState(false);
  const [result, setResult] =
    useState<ImportResult | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadCertifications = async () => {
      setCertificationsLoading(true);

      const supabase = createClient();

      const { data, error } =
        await supabase
          .from("certifications")
          .select(
            "id, provider, name, code",
          )
          .eq("active", true)
          .order("provider", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          });

      if (!mounted) {
        return;
      }

      if (error) {
        setCertifications([]);
        setResult({
          success: false,
          imported: 0,
          errors: [
            "Failed to load certifications.",
          ],
        });
      } else {
        setCertifications(data ?? []);
      }

      setCertificationsLoading(false);
    };

    void loadCertifications();

    return () => {
      mounted = false;
    };
  }, []);

  const processFile = (file: File) => {
    if (parsing || importing) {
      return;
    }

    setParsing(true);
    setResult(null);
    setRows([]);
    setFileName("");

    if (file.size === 0) {
      setParsing(false);
      setResult({
        success: false,
        imported: 0,
        errors: [
          "The CSV file is empty.",
        ],
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setParsing(false);
      setResult({
        success: false,
        imported: 0,
        errors: [
          `CSV file is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
        ],
      });
      return;
    }

    Papa.parse<Record<string, unknown>>(
      file,
      {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
        transformHeader: (header) =>
          header.trim().toLowerCase(),

        complete: (parseResults) => {
          const headerErrors =
            validateHeaders(
              parseResults.meta.fields,
            );

          if (headerErrors.length > 0) {
            setParsing(false);
            setResult({
              success: false,
              imported: 0,
              errors: headerErrors,
            });
            return;
          }

          if (
            parseResults.errors.length > 0
          ) {
            const errors =
              parseResults.errors
                .slice(0, 10)
                .map(
                  (error) =>
                    `CSV row ${(error.row ?? 0) + 2}: ${error.message}`,
                );

            setParsing(false);
            setResult({
              success: false,
              imported: 0,
              errors,
            });
            return;
          }

          if (
            parseResults.data.length === 0
          ) {
            setParsing(false);
            setResult({
              success: false,
              imported: 0,
              errors: [
                "The CSV contains no questions.",
              ],
            });
            return;
          }

          if (
            parseResults.data.length >
            MAX_ROWS
          ) {
            setParsing(false);
            setResult({
              success: false,
              imported: 0,
              errors: [
                `Too many questions. Maximum batch size is ${MAX_ROWS}.`,
              ],
            });
            return;
          }

          const parsed =
            parseResults.data.map(
              (row, index) =>
                validateRow(
                  row,
                  index + 2,
                ),
            );

          setRows(parsed);
          setFileName(file.name);
          setParsing(false);
        },

        error: (error) => {
          setRows([]);
          setFileName("");
          setParsing(false);

          setResult({
            success: false,
            imported: 0,
            errors: [
              error.message ||
                "Failed to read CSV file.",
            ],
          });
        },
      },
    );
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      setRows([]);
      setFileName("");
      setResult({
        success: false,
        imported: 0,
        errors: [
          "Please select a CSV file.",
        ],
      });

      event.target.value = "";
      return;
    }

    processFile(file);
    event.target.value = "";
  };

  const validRows = rows.filter(
    (row) => row.errors.length === 0,
  );

  const invalidRows = rows.filter(
    (row) => row.errors.length > 0,
  );

  const handleImport = async () => {
    if (
      parsing ||
      importing ||
      rows.length === 0 ||
      invalidRows.length > 0 ||
      rows.length > MAX_ROWS
    ) {
      return;
    }

    if (!certificationId) {
      setResult({
        success: false,
        imported: 0,
        errors: [
          "Select a certification before importing.",
        ],
      });
      return;
    }

    const selectedCertification =
      certifications.find(
        (certification) =>
          certification.id ===
          certificationId,
      );

    if (!selectedCertification) {
      setResult({
        success: false,
        imported: 0,
        errors: [
          "The selected certification is invalid.",
        ],
      });
      return;
    }

    setImporting(true);
    setResult(null);

    const cleanRows: CSVRow[] =
      validRows.map(
        ({
          question,
          opt1,
          opt2,
          opt3,
          opt4,
          question_type,
          correct_answers,
          difficulty,
          category,
          explanation,
        }) => ({
          question,
          opt1,
          opt2,
          opt3,
          opt4,
          question_type,
          correct_answers,
          difficulty,
          category,
          explanation,
        }),
      );

    try {
      const response =
        await importQuestions(
          cleanRows,
          certificationId,
        );

      setResult(response);

      if (response.success) {
        setRows([]);
        setFileName("");
      }
    } catch {
      setResult({
        success: false,
        imported: 0,
        errors: [
          "Import failed. Please try again.",
        ],
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = [
      [
        "question",
        "opt1",
        "opt2",
        "opt3",
        "opt4",
        "question_type",
        "correct_answers",
        "difficulty",
        "category",
        "explanation",
      ],
      [
        "What is AWS Lambda?",
        "Compute service",
        "Storage service",
        "Database service",
        "Networking service",
        "single",
        "1",
        "easy",
        "Compute",
        "Lambda runs code without provisioning servers.",
      ],
      [
        "Which are AWS compute services?",
        "EC2",
        "S3",
        "Lambda",
        "RDS",
        "multiple",
        "1,3",
        "medium",
        "Compute",
        "EC2 and Lambda are compute services; S3 and RDS are not.",
      ],
    ];

    const blob = new Blob(
      [
        csv
          .map((row) =>
            row
              .map(
                (value) =>
                  `"${value.replace(
                    /"/g,
                    '""',
                  )}"`,
              )
              .join(","),
          )
          .join("\n"),
      ],
      {
        type: "text/csv;charset=utf-8;",
      },
    );

    const url =
      URL.createObjectURL(blob);
    const link =
      document.createElement("a");

    link.href = url;
    link.download =
      "question-bank-template.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <a
            href="/admin/questions"
            className="font-mono text-xs uppercase tracking-wider text-gray-500 transition hover:text-[#ff9900]"
          >
            ← Question Bank
          </a>

          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
            Admin / Import
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Import Question Bank
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Upload a CSV containing your
            questions and assign them to a
            certification in bulk.
          </p>
        </div>

        <section className="border border-[#2d3544] bg-[#151e2d]">
          <div className="border-b border-[#2d3544] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                  Import Configuration
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Certification is required for
                  every imported question
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[1fr_2fr]">
            <div>
              <label
                htmlFor="certification"
                className="font-mono text-xs uppercase tracking-wider text-gray-400"
              >
                Certification
              </label>

              <select
                id="certification"
                value={certificationId}
                onChange={(event) => {
                  setCertificationId(
                    event.target.value,
                  );
                  setResult(null);
                }}
                disabled={
                  certificationsLoading ||
                  parsing ||
                  importing
                }
                className="mt-2 w-full border border-[#3b4556] bg-[#111827] px-4 py-3 text-sm text-gray-200 outline-none transition focus:border-[#ff9900] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {certificationsLoading
                    ? "Loading certifications..."
                    : "Select certification"}
                </option>

                {certifications.map(
                  (certification) => (
                    <option
                      key={certification.id}
                      value={certification.id}
                    >
                      {certification.provider} —{" "}
                      {certification.name} (
                      {certification.code})
                    </option>
                  ),
                )}
              </select>

              {certifications.length ===
                0 &&
                !certificationsLoading && (
                  <p className="mt-2 text-xs text-red-400">
                    No active certifications
                    are available.
                  </p>
                )}
            </div>

            <div className="border border-[#3b4556] bg-[#111827] px-4 py-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                Selected Certification
              </p>

              <p className="mt-2 text-sm text-gray-200">
                {certificationId
                  ? (() => {
                      const certification =
                        certifications.find(
                          (item) =>
                            item.id ===
                            certificationId,
                        );

                      return certification
                        ? `${certification.provider} — ${certification.name}`
                        : "Invalid certification";
                    })()
                  : "No certification selected"}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 border border-[#2d3544] bg-[#151e2d]">
          <div className="border-b border-[#2d3544] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                  CSV Upload
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Maximum 500 questions / 5 MB
                  per batch
                </p>
              </div>

              <button
                type="button"
                onClick={downloadTemplate}
                disabled={
                  parsing || importing
                }
                className="border border-[#3b4556] px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Download Template
              </button>
            </div>
          </div>

          <div className="p-6">
            <label
              htmlFor="csv-upload"
              className="flex min-h-52 cursor-pointer flex-col items-center justify-center border border-dashed border-[#3b4556] bg-[#111827] px-6 text-center transition hover:border-[#ff9900]"
            >
              <div className="mb-4 text-3xl text-[#ff9900]">
                ↑
              </div>

              <p className="font-mono text-sm uppercase tracking-wider text-gray-300">
                {fileName ||
                  "Drop CSV file here"}
              </p>

              <p className="mt-2 text-xs text-gray-500">
                or click to browse
              </p>

              <input
                ref={fileInputRef}
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={
                  parsing || importing
                }
                className="hidden"
              />
            </label>
          </div>
        </section>

        {parsing && (
          <div className="mt-6 border border-[#2d3544] bg-[#151e2d] px-6 py-5">
            <p className="font-mono text-xs uppercase tracking-wider text-[#ff9900]">
              Parsing CSV...
            </p>
          </div>
        )}

        {result && (
          <div
            className={`mt-6 border px-6 py-5 ${
              result.success
                ? "border-[#ff9900] bg-[#ff9900]/5"
                : "border-red-500/40 bg-red-500/5"
            }`}
          >
            <p
              className={`font-mono text-xs uppercase tracking-wider ${
                result.success
                  ? "text-[#ff9900]"
                  : "text-red-400"
              }`}
            >
              {result.success
                ? "Import Successful"
                : "Import Failed"}
            </p>

            {result.success ? (
              <p className="mt-2 text-sm text-gray-300">
                {result.imported} questions
                imported successfully.
              </p>
            ) : (
              <div className="mt-3 space-y-1">
                {result.errors.map(
                  (error, index) => (
                    <p
                      key={`${error}-${index}`}
                      className="font-mono text-xs text-red-400"
                    >
                      {error}
                    </p>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <section className="mt-6 border border-[#2d3544] bg-[#151e2d]">
            <div className="border-b border-[#2d3544] px-6 py-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
                    Import Preview
                  </p>

                  <div className="mt-3 flex gap-5 font-mono text-xs">
                    <span className="text-[#ff9900]">
                      ✓ {validRows.length} VALID
                    </span>

                    <span className="text-red-400">
                      ✕ {invalidRows.length} ERRORS
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    parsing ||
                    importing ||
                    !certificationId ||
                    validRows.length === 0 ||
                    invalidRows.length > 0
                  }
                  onClick={handleImport}
                  className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {importing
                    ? "Importing..."
                    : `Import ${rows.length} Questions`}
                </button>
              </div>

              {!certificationId && (
                <p className="mt-4 border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 font-mono text-xs text-yellow-400">
                  Select a certification before
                  importing.
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-250 text-left">
                <thead>
                  <tr className="border-b border-[#2d3544] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-4">
                      Row
                    </th>
                    <th className="px-5 py-4">
                      Question
                    </th>
                    <th className="px-5 py-4">
                      Type
                    </th>
                    <th className="px-5 py-4">
                      Answers
                    </th>
                    <th className="px-5 py-4">
                      Difficulty
                    </th>
                    <th className="px-5 py-4">
                      Category
                    </th>
                    <th className="px-5 py-4">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className="border-b border-[#2d3544] last:border-0"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">
                        {row.rowNumber}
                      </td>

                      <td className="max-w-md px-5 py-4 text-sm text-gray-200">
                        <div className="truncate">
                          {row.question || "—"}
                        </div>

                        {row.errors.length >
                          0 && (
                          <div className="mt-2 space-y-1">
                            {row.errors.map(
                              (
                                error,
                                index,
                              ) => (
                                <p
                                  key={`${error}-${index}`}
                                  className="font-mono text-[10px] text-red-400"
                                >
                                  {error}
                                </p>
                              ),
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {row.question_type ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {row.correct_answers ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-400">
                        {row.difficulty ||
                          "medium"}
                      </td>

                      <td className="px-5 py-4 text-xs text-gray-400">
                        {row.category || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {row.errors.length ===
                        0 ? (
                          <span className="font-mono text-[10px] uppercase text-[#ff9900]">
                            Valid
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] uppercase text-red-400">
                            Error
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {invalidRows.length > 0 && (
              <div className="border-t border-red-500/20 bg-red-500/5 px-6 py-4">
                <p className="font-mono text-xs text-red-400">
                  Import is disabled until every
                  row is valid.
                </p>
              </div>
            )}
          </section>
        )}

        <section className="mt-6 border border-[#2d3544] bg-[#151e2d]">
          <div className="border-b border-[#2d3544] px-6 py-4">
            <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
              CSV Format
            </p>
          </div>

          <div className="overflow-x-auto p-6">
            <code className="block min-w-max font-mono text-xs leading-7 text-gray-400">
              question,opt1,opt2,opt3,opt4,question_type,correct_answers,difficulty,category
              <br />
              {'"What is AWS Lambda?","Compute","Storage","Database","Network","single","1","easy","Compute"'}
              <br />
              {'"Which are compute services?","EC2","S3","Lambda","RDS","multiple","1,3","medium","Compute"'}
            </code>
          </div>
        </section>
      </div>
    </main>
  );
}