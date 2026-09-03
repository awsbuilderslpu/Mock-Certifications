import { requireCore } from "@/lib/auth";

export default async function MocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireCore();

  return children;
}