import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative flex min-h-[calc(100vh-5rem)] items-center justify-center overflow-hidden px-6">
      <div className="aws-grid absolute inset-0 opacity-40" />

      <div className="absolute right-0 top-0 hidden h-64 w-64 border-b border-l border-[#2d3544] lg:block">
        <div className="absolute right-10 top-10 h-20 w-20 bg-[#ff9900]" />
      </div>

      <div className="absolute bottom-0 left-0 hidden h-40 w-40 border-r border-t border-[#2d3544] lg:block">
        <div className="absolute bottom-8 left-8 h-8 w-8 border border-[#ff9900]" />
      </div>

      <div className="relative w-full max-w-2xl text-center">
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className="h-px w-10 bg-[#ff9900]" />

          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff9900]">
            AWS STUDENT BUILDER GROUP / LPU
          </span>

          <span className="h-px w-10 bg-[#ff9900]" />
        </div>

        <div className="border border-[#3b4556] bg-[#151e2d]">
          <div className="border-b border-[#2d3544] px-7 py-4 text-left">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-600">
              SYSTEM RESPONSE
            </span>
          </div>

          <div className="px-7 py-14 sm:px-12">
            <div className="font-mono text-8xl font-bold leading-none tracking-tight text-[#ff9900] sm:text-9xl">
              404
            </div>

            <h1 className="mt-8 font-mono text-2xl tracking-tight sm:text-3xl">
              PAGE NOT FOUND.
            </h1>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-gray-500">
              The page you&apos;re looking for doesn&apos;t exist, has been
              moved, or the address you entered is incorrect.
            </p>

            <div className="mx-auto mt-8 flex max-w-md items-center gap-3 border border-[#2d3544] bg-[#111827] px-4 py-3 text-left">
              <span className="h-2 w-2 shrink-0 bg-red-500" />

              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-gray-600">
                RESOURCE NOT FOUND
              </span>
            </div>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="flex h-12 items-center justify-center bg-[#ff9900] px-7 font-mono text-xs font-bold uppercase tracking-[0.15em] text-[#111827] transition-colors hover:bg-white"
              >
                Go to Dashboard
                <span className="ml-4">→</span>
              </Link>

              <Link
                href="/"
                className="flex h-12 items-center justify-center border border-[#3b4556] px-7 font-mono text-xs font-bold uppercase tracking-[0.15em] text-gray-400 transition-colors hover:border-[#ff9900] hover:text-[#ff9900]"
              >
                Back to Portal
              </Link>
            </div>
          </div>

          <div className="border-t border-[#2d3544] px-7 py-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-gray-700">
                AWS LPU EXAM PORTAL
              </span>

              <span className="font-mono text-[9px] uppercase tracking-widest text-gray-700">
                ERROR / 404
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}