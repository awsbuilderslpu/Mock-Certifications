export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl text-center">
        <div className="mb-8 inline-flex items-center gap-2 border border-orange-500/30 bg-orange-500/5 px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-orange-400">
          <span className="h-2 w-2 bg-orange-500" />
          ACCESS DENIED
        </div>

        <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-5xl">
          THIS PORTAL IS
          <br />
          <span className="text-orange-500">RESTRICTED.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-lg text-sm leading-7 text-white/50">
          Your account is authenticated, but you are not authorized
          to access the AWS LPU Mock Exam Portal.
        </p>

        <div className="mx-auto mt-10 max-w-md border border-white/10 bg-white/[0.02] p-5 text-left">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-white/30">
            ACCESS REQUIREMENT
          </div>

          <div className="font-mono text-sm text-white/70">
            AWS Student Builder Group · LPU
          </div>

          <div className="mt-2 text-xs leading-6 text-white/40">
            Access is limited to authorized members and core
            team accounts.
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="/login"
            className="w-full border border-orange-500 bg-orange-500 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-black transition hover:bg-orange-400 sm:w-auto"
          >
            Back to Login
          </a>

          <a
            href="https://awslpu.in"
            className="w-full border border-white/10 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white/60 transition hover:border-white/20 hover:text-white sm:w-auto"
          >
            AWS LPU Website
          </a>
        </div>

        <div className="mt-16 font-mono text-[10px] uppercase tracking-[0.25em] text-white/20">
          AWS LPU EXAM PORTAL
        </div>
      </div>
    </main>
  );
}