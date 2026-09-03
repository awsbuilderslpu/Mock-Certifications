"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="relative flex min-h-[calc(100vh-5rem)] overflow-hidden">
      {/* Background */}
      <div className="aws-grid absolute inset-0 opacity-40" />

      {/* Decorative geometry */}
      <div className="absolute right-0 top-0 hidden h-64 w-64 border-b border-l border-[#2d3544] lg:block">
        <div className="absolute right-10 top-10 h-20 w-20 bg-[#ff9900]" />
      </div>

      <div className="absolute bottom-0 left-0 hidden h-40 w-40 border-r border-t border-[#2d3544] lg:block">
        <div className="absolute bottom-8 left-8 h-8 w-8 border border-[#ff9900]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl items-center px-6 py-16 lg:px-8">
        <div className="grid w-full items-center gap-16 lg:grid-cols-[1fr_420px]">
          {/* Left */}
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
              <span className="text-[#ff9900]">PREPARATION</span>
              <br />
              STARTS HERE.
            </h1>

            <p className="mt-7 max-w-lg text-sm leading-7 text-gray-500">
              Access scheduled mock examinations, curated questions, and your
              performance history through the AWS LPU Exam Portal.
            </p>

            <div className="mt-10 flex items-center gap-3">
              <span className="h-2 w-2 bg-[#ff9900]" />

              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
                AUTHORIZED MEMBERS ONLY
              </span>
            </div>
          </div>

          {/* Login */}
          <div>
            <div className="border border-[#3b4556] bg-[#151e2d]">
              {/* Header */}
              <div className="border-b border-[#2d3544] px-7 py-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
                  // AUTHENTICATION
                </p>

                <h2 className="mt-3 font-mono text-2xl">
                  MEMBER LOGIN
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Sign in with your AWS LPU account.
                </p>
              </div>

              {/* Form */}
              <form
                onSubmit={handleLogin}
                className="space-y-5 px-7 py-7"
              >
                {/* Email */}
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
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-12 w-full border border-[#3b4556] bg-[#111827] px-4 font-mono text-sm text-white outline-none placeholder:text-gray-700 transition-colors focus:border-[#ff9900]"
                  />
                </div>

                {/* Password */}
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
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full border border-[#3b4556] bg-[#111827] px-4 font-mono text-sm text-white outline-none placeholder:text-gray-700 transition-colors focus:border-[#ff9900]"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="border-l-2 border-red-500 bg-red-500/5 px-4 py-3">
                    <p className="font-mono text-xs leading-5 text-red-400">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="group flex h-12 w-full items-center justify-center gap-4 bg-[#ff9900] font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#111827] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Authenticating..." : "Sign In"}

                  {!loading && (
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  )}
                </button>

                {/* Security indicator */}
                <div className="flex items-center gap-3 pt-2">
                  <span className="h-px flex-1 bg-[#2d3544]" />

                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-700">
                    Secure Access
                  </span>

                  <span className="h-px flex-1 bg-[#2d3544]" />
                </div>

                <p className="text-center text-[11px] leading-5 text-gray-600">
                  Use the account credentials associated with your AWS LPU
                  community profile.
                </p>
              </form>

              {/* Footer */}
              <div className="border-t border-[#2d3544] px-7 py-4">
                <Link
                  href="/"
                  className="font-mono text-[10px] uppercase tracking-wider text-gray-600 transition-colors hover:text-[#ff9900]"
                >
                  ← Back to Portal
                </Link>
              </div>
            </div>

            {/* Access notice */}
            <div className="mt-5 flex gap-3 border border-[#2d3544] p-4">
              <span className="mt-0.5 text-[#ff9900]">!</span>

              <p className="font-mono text-[10px] leading-5 text-gray-600">
                Access is restricted to authorized AWS LPU members with an
                active portal role.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}