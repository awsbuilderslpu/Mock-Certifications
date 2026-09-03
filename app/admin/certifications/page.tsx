"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";
import {
  createCertification,
  deleteCertification,
  toggleCertificationStatus,
  updateCertification,
  type CertificationInput,
  type CertificationType,
} from "@/lib/actions/certifications";

type Certification = CertificationInput & {
  id: string;
  created_at: string;
  updated_at: string;
};

type SortKey = "provider" | "name" | "type" | "updated_at";
type StatusFilter = "all" | "active" | "inactive";

const TYPES: {
  value: CertificationType;
  label: string;
}[] = [
  {
    value: "foundational",
    label: "Foundational",
  },
  {
    value: "associate",
    label: "Associate",
  },
  {
    value: "professional",
    label: "Professional",
  },
  {
    value: "specialty",
    label: "Specialty",
  },
];

const emptyForm: CertificationInput = {
  provider: "",
  name: "",
  code: "",
  type: "foundational",
  description: "",
  active: true,
};

async function loadCertifications(): Promise<
  Certification[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("certifications")
    .select(
      "id, provider, name, code, type, description, active, created_at, updated_at",
    )
    .order("provider", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Certification[];
}

export default function CertificationsPage() {
  const [certifications, setCertifications] =
    useState<Certification[]>([]);

  const [selected, setSelected] =
    useState<Certification | null>(null);

  const [editing, setEditing] =
    useState<Certification | null>(null);

  const [form, setForm] =
    useState<CertificationInput>({
      ...emptyForm,
    });

  const [formOpen, setFormOpen] =
    useState(false);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState<CertificationType | "all">(
      "all",
    );

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [sortKey, setSortKey] =
    useState<SortKey>("updated_at");

  const [sortAscending, setSortAscending] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  async function refresh() {
    setLoading(true);
    setError("");

    try {
      setCertifications(
        await loadCertifications(),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load certifications.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const filteredCertifications =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      return certifications
        .filter((certification) => {
          const matchesSearch =
            !normalizedSearch ||
            [
              certification.provider,
              certification.name,
              certification.code,
            ].some((value) =>
              value
                .toLowerCase()
                .includes(normalizedSearch),
            );

          const matchesType =
            typeFilter === "all" ||
            certification.type === typeFilter;

          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active"
              ? certification.active
              : !certification.active);

          return (
            matchesSearch &&
            matchesType &&
            matchesStatus
          );
        })
        .sort((a, b) => {
          const left =
            sortKey === "updated_at"
              ? a.updated_at
              : a[sortKey];

          const right =
            sortKey === "updated_at"
              ? b.updated_at
              : b[sortKey];

          const result =
            left.localeCompare(right);

          return sortAscending
            ? result
            : -result;
        });
    }, [
      certifications,
      search,
      typeFilter,
      statusFilter,
      sortKey,
      sortAscending,
    ]);

  const counts = useMemo(
    () => ({
      total: certifications.length,
      active: certifications.filter(
        (item) => item.active,
      ).length,
      inactive: certifications.filter(
        (item) => !item.active,
      ).length,
      foundational:
        certifications.filter(
          (item) =>
            item.type === "foundational",
        ).length,
      associate: certifications.filter(
        (item) => item.type === "associate",
      ).length,
      professional:
        certifications.filter(
          (item) =>
            item.type === "professional",
        ).length,
      specialty: certifications.filter(
        (item) => item.type === "specialty",
      ).length,
    }),
    [certifications],
  );

  function clearFilters() {
    setSearch("");
    setTypeFilter("all");
    setStatusFilter("all");
  }

  function openCreate() {
    setSelected(null);
    setEditing(null);
    setForm({ ...emptyForm });
    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function openEdit(
    certification: Certification,
  ) {
    setSelected(null);
    setEditing(certification);

    setForm({
      provider: certification.provider,
      name: certification.name,
      code: certification.code,
      type: certification.type,
      description:
        certification.description ?? "",
      active: certification.active,
    });

    setMessage("");
    setError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (submitting) {
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitting(true);
    setMessage("");
    setError("");

    const currentEditing = editing;

    const result = currentEditing
      ? await updateCertification(
          currentEditing.id,
          form,
        )
      : await createCertification(form);

    if (!result.success) {
      setError(
        result.error ??
          "Unable to save certification.",
      );
      setSubmitting(false);
      return;
    }

    setFormOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });

    setMessage(
      currentEditing
        ? "Certification updated successfully."
        : "Certification created successfully.",
    );

    await refresh();

    setSubmitting(false);
  }

  async function toggle(
    certification: Certification,
  ) {
    const nextState =
      !certification.active;

    const action = nextState
      ? "Activate"
      : "Deactivate";

    const confirmed = window.confirm(
      `${action} ${certification.name}?`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    const result =
      await toggleCertificationStatus(
        certification.id,
        nextState,
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to update certification status.",
      );
    } else {
      setMessage(
        nextState
          ? "Certification activated."
          : "Certification deactivated.",
      );

      await refresh();

      if (
        selected?.id === certification.id
      ) {
        setSelected({
          ...certification,
          active: nextState,
        });
      }
    }

    setSubmitting(false);
  }

  async function remove(
    certification: Certification,
  ) {
    const confirmed = window.confirm(
      `Delete ${certification.name}?\n\nThis action cannot be undone. Certifications referenced by questions or mocks cannot be deleted.`,
    );

    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    setMessage("");
    setError("");

    const result =
      await deleteCertification(
        certification.id,
      );

    if (!result.success) {
      setError(
        result.error ??
          "Unable to delete certification.",
      );
    } else {
      setMessage(
        "Certification deleted successfully.",
      );

      if (
        selected?.id === certification.id
      ) {
        setSelected(null);
      }

      if (
        editing?.id === certification.id
      ) {
        setFormOpen(false);
        setEditing(null);
        setForm({ ...emptyForm });
      }

      await refresh();
    }

    setSubmitting(false);
  }

  function changeSort(
    nextKey: SortKey,
  ) {
    if (sortKey === nextKey) {
      setSortAscending(
        (current) => !current,
      );
      return;
    }

    setSortKey(nextKey);
    setSortAscending(true);
  }

  return (
    <main className="min-h-screen bg-[#111827] px-5 py-8 text-white sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5 border-b border-[#2d3544] pb-7">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ff9900]">
              Admin / Catalog
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Certifications
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-gray-400">
              Manage the certification catalog
              used across questions, mocks, and
              historical results.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            disabled={submitting}
            className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Certification
          </button>
        </header>

        {(message || error) && (
          <div
            className={`mb-6 border px-5 py-4 font-mono text-xs ${
              error
                ? "border-red-500/40 bg-red-500/5 text-red-400"
                : "border-[#ff9900]/40 bg-[#ff9900]/5 text-[#ff9900]"
            }`}
          >
            {error || message}
          </div>
        )}

        <section className="mb-6 grid gap-px border border-[#2d3544] bg-[#2d3544] sm:grid-cols-3 lg:grid-cols-7">
          <Stat
            label="Total"
            value={counts.total}
          />

          <Stat
            label="Active"
            value={counts.active}
            tone="green"
          />

          <Stat
            label="Inactive"
            value={counts.inactive}
            tone="muted"
          />

          <Stat
            label="Foundational"
            value={counts.foundational}
          />

          <Stat
            label="Associate"
            value={counts.associate}
          />

          <Stat
            label="Professional"
            value={counts.professional}
          />

          <Stat
            label="Specialty"
            value={counts.specialty}
          />
        </section>

        <section className="mb-6 border border-[#2d3544] bg-[#151e2d] p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]">
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Search provider, name, or code"
              className="input"
            />

            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(
                  event.target
                    .value as
                    | CertificationType
                    | "all",
                )
              }
              className="input"
            >
              <option value="all">
                All Types
              </option>

              {TYPES.map((type) => (
                <option
                  key={type.value}
                  value={type.value}
                >
                  {type.label}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="input"
            >
              <option value="all">
                All Statuses
              </option>
              <option value="active">
                Active
              </option>
              <option value="inactive">
                Inactive
              </option>
            </select>

            <button
              type="button"
              onClick={clearFilters}
              className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900]"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase text-gray-500">
            <span>Sort:</span>

            {(
              [
                "provider",
                "name",
                "type",
                "updated_at",
              ] as SortKey[]
            ).map((key) => (
              <button
                type="button"
                key={key}
                onClick={() =>
                  changeSort(key)
                }
                className={`border px-2 py-1 ${
                  sortKey === key
                    ? "border-[#ff9900] text-[#ff9900]"
                    : "border-[#2d3544] text-gray-500"
                }`}
              >
                {key === "updated_at"
                  ? "Last Updated"
                  : key}

                {sortKey === key
                  ? sortAscending
                    ? " ↑"
                    : " ↓"
                  : ""}
              </button>
            ))}

            <span className="ml-auto">
              {filteredCertifications.length}{" "}
              of {certifications.length} shown
            </span>
          </div>
        </section>

        <section className="overflow-hidden border border-[#2d3544] bg-[#151e2d]">
          <div className="border-b border-[#2d3544] px-5 py-4">
            <h2 className="font-mono text-xs uppercase tracking-wider text-gray-300">
              Certification Catalog
            </h2>
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center font-mono text-xs uppercase text-gray-500">
              Loading certifications...
            </div>
          ) : filteredCertifications.length ===
            0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-mono text-sm uppercase text-gray-400">
                No certifications found.
              </p>

              <p className="mt-2 text-sm text-gray-600">
                {certifications.length > 0
                  ? "Try clearing or changing your filters."
                  : "Add your first certification to begin."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-[#2d3544] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-5 py-4">
                      Provider
                    </th>

                    <th className="px-5 py-4">
                      Certification
                    </th>

                    <th className="px-5 py-4">
                      Code
                    </th>

                    <th className="px-5 py-4">
                      Type
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Last Updated
                    </th>

                    <th className="px-5 py-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#2d3544]">
                  {filteredCertifications.map(
                    (certification) => (
                      <tr
                        key={certification.id}
                        className="transition hover:bg-[#192233]"
                      >
                        <td className="px-5 py-4 font-medium text-gray-200">
                          {
                            certification.provider
                          }
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected(
                                certification,
                              )
                            }
                            className="text-left"
                          >
                            <span className="font-medium text-gray-300 transition hover:text-[#ff9900]">
                              {
                                certification.name
                              }
                            </span>

                            {certification.description && (
                              <span className="mt-1 block max-w-xs truncate text-xs text-gray-600">
                                {
                                  certification.description
                                }
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="px-5 py-4 font-mono text-xs text-gray-400">
                          {certification.code}
                        </td>

                        <td className="px-5 py-4">
                          <Badge>
                            {labelForType(
                              certification.type,
                            )}
                          </Badge>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            active={
                              certification.active
                            }
                          />
                        </td>

                        <td className="px-5 py-4 text-xs text-gray-500">
                          {formatDate(
                            certification.updated_at,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-3 font-mono text-[10px] uppercase">
                            <button
                              type="button"
                              onClick={() =>
                                setSelected(
                                  certification,
                                )
                              }
                              className="text-gray-300 transition hover:text-white"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openEdit(
                                  certification,
                                )
                              }
                              disabled={submitting}
                              className="text-[#ff9900] transition hover:text-orange-300 disabled:opacity-50"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void toggle(
                                  certification,
                                )
                              }
                              disabled={submitting}
                              className="text-gray-300 transition hover:text-white disabled:opacity-50"
                            >
                              {certification.active
                                ? "Deactivate"
                                : "Activate"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void remove(
                                  certification,
                                )
                              }
                              disabled={submitting}
                              className="text-red-400 transition hover:text-red-300 disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <Modal
          title={
            editing
              ? "Edit Certification"
              : "Add Certification"
          }
          onClose={closeForm}
        >
          <form
            onSubmit={(event) =>
              void submit(event)
            }
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Provider"
                value={form.provider}
                maxLength={100}
                onChange={(provider) =>
                  setForm((current) => ({
                    ...current,
                    provider,
                  }))
                }
              />

              <Field
                label="Certification Name"
                value={form.name}
                maxLength={200}
                onChange={(name) =>
                  setForm((current) => ({
                    ...current,
                    name,
                  }))
                }
              />

              <Field
                label="Certification Code"
                value={form.code}
                maxLength={50}
                onChange={(code) =>
                  setForm((current) => ({
                    ...current,
                    code,
                  }))
                }
              />

              <label className="block text-xs text-gray-400">
                Certification Type

                <select
                  required
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target
                        .value as CertificationType,
                    }))
                  }
                  className="input mt-2"
                >
                  {TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block text-xs text-gray-400">
              Description

              <textarea
                value={form.description ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description:
                      event.target.value,
                  }))
                }
                maxLength={5000}
                rows={5}
                className="input mt-2 resize-y"
                placeholder="Describe the certification..."
              />

              <span className="mt-1 block text-right font-mono text-[10px] text-gray-600">
                {(form.description ?? "")
                  .length}{" "}
                / 5000
              </span>
            </label>

            <label className="flex items-center gap-3 text-xs uppercase tracking-wider text-gray-400">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active:
                      event.target.checked,
                  }))
                }
              />

              Active certification
            </label>

            <div className="flex justify-end gap-3 border-t border-[#2d3544] pt-4">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase text-gray-300 transition hover:border-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold uppercase text-[#111827] transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : editing
                    ? "Save Changes"
                    : "Create Certification"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selected && (
        <Modal
          title="View Certification"
          onClose={() => setSelected(null)}
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-[#ff9900]">
                  {selected.provider}
                </p>

                <h2 className="mt-1 text-xl font-semibold text-white">
                  {selected.name}
                </h2>
              </div>

              <StatusBadge
                active={selected.active}
              />
            </div>

            <div className="grid gap-4 border-y border-[#2d3544] py-5 sm:grid-cols-2">
              <Detail
                label="Code"
                value={selected.code}
              />

              <Detail
                label="Type"
                value={labelForType(
                  selected.type,
                )}
              />

              <Detail
                label="Created"
                value={formatDate(
                  selected.created_at,
                )}
              />

              <Detail
                label="Last Updated"
                value={formatDate(
                  selected.updated_at,
                )}
              />
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                Description
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                {selected.description ||
                  "No description provided."}
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-[#2d3544] pt-4">
              <button
                type="button"
                onClick={() =>
                  void toggle(selected)
                }
                disabled={submitting}
                className="border border-[#3b4556] px-4 py-2 font-mono text-xs uppercase text-gray-300 transition hover:border-[#ff9900] hover:text-[#ff9900] disabled:opacity-50"
              >
                {selected.active
                  ? "Deactivate"
                  : "Activate"}
              </button>

              <button
                type="button"
                onClick={() =>
                  openEdit(selected)
                }
                disabled={submitting}
                className="bg-[#ff9900] px-4 py-2 font-mono text-xs font-bold uppercase text-[#111827] transition hover:bg-orange-400 disabled:opacity-50"
              >
                Edit Certification
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone = "orange",
}: {
  label: string;
  value: number;
  tone?: "orange" | "green" | "muted";
}) {
  const colors = {
    orange: "text-[#ff9900]",
    green: "text-green-400",
    muted: "text-gray-500",
  };

  return (
    <div className="bg-[#151e2d] p-4">
      <p className="font-mono text-[9px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${colors[tone]}`}
      >
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-gray-400">
      {label}

      <input
        required
        value={value}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="input mt-2"
      />
    </label>
  );
}

function Badge({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <span className="inline-block border border-[#ff9900]/40 bg-[#ff9900]/5 px-2 py-1 font-mono text-[10px] uppercase text-[#ff9900]">
      {children}
    </span>
  );
}

function StatusBadge({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`inline-block border px-2 py-1 font-mono text-[10px] uppercase ${
        active
          ? "border-green-500/40 bg-green-500/5 text-green-400"
          : "border-gray-500/40 bg-gray-500/5 text-gray-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-sm text-gray-200">
        {value}
      </p>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-2xl border border-[#3b4556] bg-[#151e2d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#2d3544] px-5 py-4">
          <h2 className="font-mono text-xs uppercase tracking-wider text-gray-300">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-xl leading-none text-gray-500 transition hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function labelForType(
  type: CertificationType,
) {
  return (
    TYPES.find(
      (item) => item.value === type,
    )?.label ?? type
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "en-IN",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(value));
}