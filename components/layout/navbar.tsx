"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  full_name: string | null;
  email: string | null;
  role: string | null;
};

export default function Navbar() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, role")
        .eq("id", authUser.id)
        .single();

      setUser(
        profile ?? {
          full_name: authUser.user_metadata?.full_name ?? null,
          email: authUser.email ?? null,
          role: null,
        },
      );

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isAdmin = user?.role === "admin";

  const initials =
    user?.full_name
      ?.split(" ")
      .map((name) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "U";

  return (
    <header className="sticky top-0 z-50 border-b border-[#2d3544] bg-[#111827]">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center">
          <Image
            src="/aws_sbg.png"
            alt="AWS Student Builder Group"
            width={180}
            height={52}
            priority
            className="h-11 w-auto object-contain"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center md:flex">
          {!user ? (
            <>
              <NavItem href="/" label="Home" />
              <NavItem href="/#platform" label="Explore" />
            </>
          ) : (
            <>
              <NavItem href="/dashboard" label="Dashboard" />
              <NavItem href="/mocks" label="Mocks" />
              <NavItem href="/results" label="Results" />

              {isAdmin && (
                <NavItem href="/admin" label="Admin" />
              )}
            </>
          )}
        </div>

        {/* Desktop Account */}
        <div className="hidden items-center gap-4 md:flex">
          {!loading && (
            <>
              <div className="h-8 w-px bg-[#2d3544]" />

              {user ? (
                <UserMenu
                  user={user}
                  initials={initials}
                />
              ) : (
                <Link
                  href="/login"
                  className="group flex h-10 items-center gap-3 border border-[#3b4556] px-4 transition-colors hover:border-[#ff9900]"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.15em] text-gray-400 transition-colors group-hover:text-white">
                    Member Login
                  </span>

                  <span className="text-[#ff9900] transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center border border-[#3b4556] text-gray-300 transition-colors hover:border-[#ff9900] hover:text-white md:hidden"
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <div className="space-y-1.5">
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
          </div>
        </button>
      </nav>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="border-t border-[#2d3544] bg-[#111827] md:hidden">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <div className="flex flex-col">
              {!user ? (
                <>
                  <MobileNavItem
                    href="/"
                    label="Home"
                    onClick={() => setMenuOpen(false)}
                  />

                  <MobileNavItem
                    href="/#platform"
                    label="Explore"
                    onClick={() => setMenuOpen(false)}
                  />
                </>
              ) : (
                <>
                  <MobileNavItem
                    href="/dashboard"
                    label="Dashboard"
                    onClick={() => setMenuOpen(false)}
                  />

                  <MobileNavItem
                    href="/mocks"
                    label="Mocks"
                    onClick={() => setMenuOpen(false)}
                  />

                  <MobileNavItem
                    href="/results"
                    label="Results"
                    onClick={() => setMenuOpen(false)}
                  />

                  {isAdmin && (
                    <MobileNavItem
                      href="/admin"
                      label="Admin"
                      onClick={() => setMenuOpen(false)}
                    />
                  )}
                </>
              )}
            </div>

            <div className="mt-5 border-t border-[#2d3544] pt-5">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center border border-[#3b4556] bg-[#151e2d] font-mono text-xs text-[#ff9900]">
                      {initials}
                    </div>

                    <div>
                      <p className="font-mono text-xs text-white">
                        {user.full_name || "Member"}
                      </p>

                      <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
                        {user.role || "Member"}
                      </p>
                    </div>
                  </div>

                  <SignOutButton />
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="flex h-12 items-center justify-between border border-[#ff9900] px-4 font-mono text-xs uppercase tracking-[0.15em] text-white"
                >
                  <span>Member Login</span>
                  <span className="text-[#ff9900]">→</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="group relative px-5 py-3 font-mono text-xs uppercase tracking-[0.15em] text-gray-400 transition-colors hover:text-white"
    >
      {label}

      <span className="absolute bottom-0 left-1/2 h-px w-0 -translate-x-1/2 bg-[#ff9900] transition-all duration-200 group-hover:w-[calc(100%-2.5rem)]" />
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center border-l-2 border-transparent px-4 py-3 font-mono text-xs uppercase tracking-[0.15em] text-gray-400 transition-colors hover:border-[#ff9900] hover:bg-[#151e2d] hover:text-white"
    >
      {label}
    </Link>
  );
}

function UserMenu({
  user,
  initials,
}: {
  user: Profile;
  initials: string;
}) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-[#3b4556] bg-[#151e2d] font-mono text-xs text-[#ff9900] transition-colors group-hover:border-[#ff9900]">
          {initials}
        </div>

        <div className="text-left">
          <p className="max-w-32 truncate font-mono text-xs text-white">
            {user.full_name || "Member"}
          </p>

          <p className="font-mono text-[10px] uppercase tracking-wider text-gray-600">
            {user.role || "Member"}
          </p>
        </div>

        <span className="text-xs text-gray-600">⌄</span>
      </button>

      <div className="invisible absolute right-0 top-full w-52 pt-3 opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        <div className="border border-[#3b4556] bg-[#151e2d]">
          <Link
            href="/profile"
            className="block border-b border-[#2d3544] px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-gray-400 hover:text-white"
          >
            Profile
          </Link>

          <SignOutButton />
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  async function signOut() {
    const supabase = createClient();

    await supabase.auth.signOut();

    window.location.href = "/";
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="block w-full px-4 py-3 text-left font-mono text-[10px] uppercase tracking-wider text-gray-500 transition-colors hover:text-[#ff9900]"
    >
      Sign Out
    </button>
  );
}