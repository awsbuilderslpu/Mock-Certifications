import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSlotsPage() {
  await requireAdmin();

  const supabase = await createClient();

  const { data: slots, error } = await supabase
    .from("exam_slots")
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      created_at,
      mocks (
        id,
        title,
        duration_minutes
      )
    `)
    .order("starts_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-[#111827] px-6 py-10">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ff9900]">
              Admin / Examination
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Exam Slots
            </h1>

            <p className="mt-2 text-sm text-gray-400">
              Schedule and manage examination sessions.
            </p>
          </div>

          <Link
            href="/admin/slots/new"
            className="bg-[#ff9900] px-5 py-3 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] hover:bg-orange-400"
          >
            + Create Slot
          </Link>
        </div>

        {!slots?.length ? (
          <div className="border border-[#2d3544] bg-[#151e2d] px-6 py-20 text-center">
            <p className="font-mono text-sm text-gray-500">
              NO EXAM SLOTS
            </p>

            <p className="mt-2 text-sm text-gray-400">
              Schedule a published mock to create an exam session.
            </p>
          </div>
        ) : (
          <div className="border border-[#2d3544] bg-[#151e2d]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left">
                <thead>
                  <tr className="border-b border-[#2d3544] font-mono text-[10px] uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-4">
                      Examination
                    </th>

                    <th className="px-5 py-4">
                      Starts
                    </th>

                    <th className="px-5 py-4">
                      Ends
                    </th>

                    <th className="px-5 py-4">
                      Duration
                    </th>

                    <th className="px-5 py-4">
                      Status
                    </th>

                    <th className="px-5 py-4">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {slots.map((slot) => {
                    const mock = Array.isArray(slot.mocks)
                      ? slot.mocks[0]
                      : slot.mocks;

                    return (
                      <tr
                        key={slot.id}
                        className="border-b border-[#2d3544] last:border-0"
                      >
                        <td className="px-5 py-5">
                          <p className="text-sm font-medium text-white">
                            {mock?.title ?? "Unknown Mock"}
                          </p>
                        </td>

                        <td className="px-5 py-5 font-mono text-xs text-gray-400">
                          {formatDate(slot.starts_at)}
                        </td>

                        <td className="px-5 py-5 font-mono text-xs text-gray-400">
                          {formatDate(slot.ends_at)}
                        </td>

                        <td className="px-5 py-5 font-mono text-xs text-gray-500">
                          {mock?.duration_minutes ?? "—"} min
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`font-mono text-[10px] uppercase ${
                              slot.status === "scheduled"
                                ? "text-[#ff9900]"
                                : slot.status === "active"
                                  ? "text-green-400"
                                  : slot.status === "cancelled"
                                    ? "text-red-400"
                                    : "text-gray-500"
                            }`}
                          >
                            {slot.status}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <Link
                            href={`/admin/slots/${slot.id}`}
                            className="font-mono text-[10px] uppercase text-gray-500 hover:text-[#ff9900]"
                          >
                            Manage →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}