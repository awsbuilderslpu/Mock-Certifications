import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();

  return NextResponse.json({
    authenticated: !!user,
    userId: user?.profile.id ?? null,
    email: user?.profile.email ?? null,
    role: user?.role ?? null,
  });
}