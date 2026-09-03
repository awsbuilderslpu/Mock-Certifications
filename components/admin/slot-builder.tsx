"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExamSlot } from "@/lib/actions/exam-slots";

type Mock = {
  id: string;
  title: string;
  duration_minutes: number;
  status: string;
};

export default function SlotBuilder({
  mocks,
}: {
  mocks: Mock[];
}) {
  const router = useRouter();

  const [mockId, setMockId] = useState(
    mocks[0]?.id ?? "",
  );

  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedMock = mocks.find(
    (mock) => mock.id === mockId,
  );

  const handleCreate = async () => {
    setError("");

    if (!mockId) {
      setError("Select a mock.");
      return;
    }

    if (!startsAt || !endsAt) {
      setError(
        "Start and end time are required.",
      );
      return;
    }

    setSaving(true);

    const result = await createExamSlot({
      mockId,
      startsAt,
      endsAt,
    });

    setSaving(false);

    if (!result.success) {
      setError(
        result.error ||
          "Failed to create exam slot.",
      );
      return;
    }

    router.push(
      `/admin/slots/${result.slotId}`,
    );
    router.refresh();
  };

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10">
      <div className="mx-auto max-w-3xl">

        <button
          onClick={() =>
            router.push("/admin/slots")
          }
          className="font-mono text-xs uppercase tracking-wider text-gray-500 hover:text-[#ff9900]"
        >
          ← Exam Slots
        </button>

        <div className="mb-8 mt-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
            Admin / Scheduling
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Create Exam Slot
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Schedule a published mock for candidates.
          </p>
        </div>

        {error && (
          <div className="mb-5 border border-red-500/40 bg-red-500/5 px-5 py-4">
            <p className="font-mono text-xs text-red-400">
              {error}
            </p>
          </div>
        )}

        <section className="border border-[#2d3544] bg-[#151e2d]">

          <div className="border-b border-[#2d3544] px-6 py-4">
            <p className="font-mono text-xs uppercase tracking-wider text-gray-300">
              Session Configuration
            </p>
          </div>

          <div className="space-y-6 p-6">

            <label className="block">
              <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-gray-500">
                Examination
              </span>

              <select
                value={mockId}
                onChange={(e) =>
                  setMockId(e.target.value)
                }
                className="input"
              >
                <option value="">
                  Select published mock
                </option>

                {mocks.map((mock) => (
                  <option
                    key={mock.id}
                    value={mock.id}
                  >
                    {mock.title} —{" "}
                    {mock.duration_minutes} min
                  </option>
                ))}
              </select>
            </label>

            {selectedMock && (
              <div className="border border-[#2d3544] bg-[#111827] px-4 py-4">
                <p className="font-mono text-[10px] uppercase text-gray-500">
                  Selected Mock
                </p>

                <p className="mt-2 text-sm font-medium text-white">
                  {selectedMock.title}
                </p>

                <p className="mt-1 font-mono text-xs text-[#ff9900]">
                  {selectedMock.duration_minutes} MINUTES
                </p>
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Starts At
                </span>

                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) =>
                    setStartsAt(e.target.value)
                  }
                  className="input"
                />
              </label>

              <label className="block">
                <span className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-gray-500">
                  Ends At
                </span>

                <input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) =>
                    setEndsAt(e.target.value)
                  }
                  className="input"
                />
              </label>

            </div>

            <div className="border-t border-[#2d3544] pt-5">
              <div className="flex items-start gap-3">
                <span className="text-[#ff9900]">
                  !
                </span>

                <p className="text-xs leading-5 text-gray-500">
                  Candidates will only be able to start
                  an attempt while the slot is active.
                  The examination itself will still be
                  limited by the mock&apos;s configured duration.
                </p>
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full bg-[#ff9900] px-5 py-4 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400 disabled:opacity-40"
            >
              {saving
                ? "Creating..."
                : "Schedule Exam"}
            </button>

          </div>
        </section>
      </div>
    </main>
  );
}