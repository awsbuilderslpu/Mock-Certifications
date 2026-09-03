"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        window.location.replace("/dashboard");
        return;
      }

      setCheckingSession(false);
    }

    checkSession();
  }, []);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.replace("/dashboard");
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    const supabase = createClient();

    const { error } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            `${window.location.origin}/auth/google/callback`,
        },
      });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden">
        <div className="aws-grid absolute inset-0 opacity-40" />

        <div className="relative text-center">
          <div className="mx-auto mb-5 h-2 w-2 bg-[#ff9900]" />

          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-[calc(100vh-5rem)] overflow-hidden">
      <div className="aws-grid absolute inset-0 opacity-40" />

      <div className="absolute right-0 top-0 hidden h-64 w-64 border-b border-l border-[#2d3544] lg:block">
        <div className="absolute right-10 top-10 h-20 w-20 bg-[#ff9900]" />
      </div>

      <div className="absolute bottom-0 left-0 hidden h-40 w-40 border-r border-t border-[#2d3544] lg:block">
        <div className="absolute bottom-8 left-8 h-8 w-8 border border-[#ff9900]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl items-center px-6 py-16 lg:px-8">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1fr_420px]">
          <div className="hidden lg:block">
            <div className="mb-8 flex items-center gap-4">
              <span className="h-px w-10 bg-[#ff9900]" />

              <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff9900]">
                AWS STUDENT BUILDER GROUP / LPU
              </span>
            </div>

            <Image
              src="/aws_sbg.png"
              alt="AWS Student Builder Group"
              width={300}
              height={100}
              priority
              className="mb-10 h-auto w-64"
            />

            <h1 className="max-w-xl font-mono text-5xl leading-[1.05] tracking-tight">
              YOUR AWS
              <br />
              <span className="text-[#ff9900]">
                PREPARATION
              </span>
              <br />
              STARTS HERE.
            </h1>

            <p className="mt-7 max-w-lg text-sm leading-7 text-gray-500">
              Access scheduled mock examinations, curated
              questions, and your performance history through
              the AWS LPU Exam Portal.
            </p>

            <div className="mt-10 flex items-center gap-3">
              <span className="h-2 w-2 bg-[#ff9900]" />

              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                AUTHORIZED MEMBERS ONLY
              </span>
            </div>
          </div>

          <div>
            <div className="border border-[#3b4556] bg-[#151e2d]">
              <div className="border-b border-[#2d3544] px-7 py-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
                  AUTHENTICATION
                </p>

                <h2 className="mt-3 font-mono text-2xl">
                  MEMBER LOGIN
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Sign in with your AWS LPU account.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-5 px-7 py-7"
              >
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full border border-[#3b4556] bg-[#111827] px-4 font-mono text-sm text-white outline-none placeholder:text-gray-700 transition-colors focus:border-[#ff9900]"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500"
                    >
                      Password
                    </label>

                    <Link
                      href="/forgot-password"
                      className="font-mono text-[9px] uppercase tracking-wider text-gray-600 transition-colors hover:text-[#ff9900]"
                    >
                      Forgot?
                    </Link>
                  </div>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full border border-[#3b4556] bg-[#111827] px-4 font-mono text-sm text-white outline-none placeholder:text-gray-700 transition-colors focus:border-[#ff9900]"
                  />
                </div>

                {error && (
                  <div className="border-l-2 border-red-500 bg-red-500/5 px-4 py-3">
                    <p className="font-mono text-xs leading-5 text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    loading || googleLoading
                  }
                  className="group flex h-12 w-full items-center justify-center gap-4 bg-[#ff9900] font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#111827] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Authenticating..."
                    : "Sign In"}

                  {!loading && (
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-[#2d3544]" />

                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-700">
                    OR
                  </span>

                  <span className="h-px flex-1 bg-[#2d3544]" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={
                    loading || googleLoading
                  }
                  className="flex h-12 w-full items-center justify-center gap-3 border border-[#3b4556] bg-[#111827] font-mono text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:border-white/30 hover:bg-[#1a2332] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {googleLoading ? (
                    "Connecting..."
                  ) : (
                    <>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          fill="#4285F4"
                          d="M21.35 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.38Z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 21.6c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.6Z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M6.53 13.69A5.86 5.86 0 0 1 6.22 12c0-.59.11-1.16.31-1.69V7.78H3.29A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.04 4.22l3.24-2.53Z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 6.28c1.43 0 2.72.49 3.74 1.46l2.8-2.8C16.84 3.29 14.63 2.4 12 2.4a9.75 9.75 0 0 0-8.71 5.38l3.24 2.53c.77-2.31 2.93-4.03 5.47-4.03Z"
                        />
                      </svg>

                      Continue with Google
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3 pt-2">
                  <span className="h-px flex-1 bg-[#2d3544]" />

                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-700">
                    Secure Access
                  </span>

                  <span className="h-px flex-1 bg-[#2d3544]" />
                </div>

                <p className="text-center text-[11px] leading-5 text-gray-600">
                  Use the account credentials associated
                  with your AWS LPU community profile.
                </p>
              </form>

              <div className="border-t border-[#2d3544] px-7 py-4">
                <Link
                  href="/"
                  className="font-mono text-[10px] uppercase tracking-wider text-gray-600 transition-colors hover:text-[#ff9900]"
                >
                  ← Back to Portal
                </Link>
              </div>
            </div>

            <div className="mt-5 flex gap-3 border border-[#2d3544] p-4">
              <span className="mt-0.5 text-[#ff9900]">
                !
              </span>

              <p className="font-mono text-[10px] leading-5 text-gray-600">
                Access is restricted to authorized AWS LPU
                members with an active portal role.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}