import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=auth_callback_failed",
        request.url,
      ),
    );
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(
        "/login?error=auth_callback_failed",
        request.url,
      ),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(
        "/login?error=auth_failed",
        request.url,
      ),
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/access-denied", request.url),
    );
  }

  if (
    profile.role !== "admin" &&
    profile.role !== "core"
  ) {
    await supabase.auth.signOut();

    return NextResponse.redirect(
      new URL("/access-denied", request.url),
    );
  }

  return NextResponse.redirect(
    new URL("/dashboard", request.url),
  );
}