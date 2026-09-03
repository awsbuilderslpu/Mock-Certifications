import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "core" | "member";

const VALID_ROLES: readonly UserRole[] = [
  "admin",
  "core",
  "member",
];

function isValidRole(
  role: unknown,
): role is UserRole {
  return (
    typeof role === "string" &&
    VALID_ROLES.includes(role as UserRole)
  );
}

export async function getCurrentUser() {
  const supabase = await createClient();

  // ---------------------------------------------------------
  // AUTHENTICATED USER
  // ---------------------------------------------------------

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // ---------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select(
        "id, full_name, email, role",
      )
      .eq("id", user.id)
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    return null;
  }

  // ---------------------------------------------------------
  // PROFILE OWNERSHIP CHECK
  // ---------------------------------------------------------

  if (profile.id !== user.id) {
    return null;
  }

  // ---------------------------------------------------------
  // ROLE VALIDATION
  // ---------------------------------------------------------

  if (!isValidRole(profile.role)) {
    return null;
  }

  return {
    authUser: user,

    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
    },

    role: profile.role,
  };
}

// ---------------------------------------------------------
// AUTHENTICATION
// ---------------------------------------------------------

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

// ---------------------------------------------------------
// CORE ACCESS
// ---------------------------------------------------------

export async function requireCore() {
  const user = await requireAuth();

  if (
    user.role !== "admin" &&
    user.role !== "core"
  ) {
    redirect("/dashboard");
  }

  return user;
}

// ---------------------------------------------------------
// ADMIN ACCESS
// ---------------------------------------------------------

export async function requireAdmin() {
  const user = await requireAuth();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}