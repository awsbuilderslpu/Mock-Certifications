import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "MOCK EXAMS",
    description:
      "Practice through structured AWS-focused mock examinations created for the LPU community.",
  },
  {
    number: "02",
    title: "QUESTION BANK",
    description:
      "A growing collection of curated questions organized around AWS services and certification domains.",
  },
  {
    number: "03",
    title: "TIMED SESSIONS",
    description:
      "Take scheduled examinations inside controlled time windows with automatic submission.",
  },
  {
    number: "04",
    title: "PERFORMANCE",
    description:
      "Review your score, answers, attempts, and performance after completing a mock.",
  },
];

const steps = [
  {
    number: "01",
    title: "LOGIN",
    description:
      "Sign in using your existing AWS LPU account.",
  },
  {
    number: "02",
    title: "CHOOSE",
    description:
      "View the mock examinations available to you.",
  },
  {
    number: "03",
    title: "ATTEMPT",
    description:
      "Enter the scheduled session and complete your examination.",
  },
  {
    number: "04",
    title: "IMPROVE",
    description:
      "Analyze your result and use it to prepare for the real certification.",
  },
];

const certifications = [
  "SOLUTIONS ARCHITECT",
  "DEVELOPER",
  "SYSOPS ADMINISTRATOR",
  "CLOUD PRACTITIONER",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#111827] text-white">

      {/* ===================================================== */}
      {/* HERO */}
      {/* ===================================================== */}

      <section className="relative overflow-hidden border-b border-[#2d3544]">
        <div className="aws-grid absolute inset-0 opacity-50" />

        <div className="absolute right-0 top-0 hidden h-full w-[28%] border-l border-[#2d3544] lg:block">
          <div className="absolute right-12 top-12 h-24 w-24 bg-[#ff9900]" />

          <div className="absolute bottom-24 right-24 h-16 w-16 border border-[#ff9900]" />

          <div className="absolute bottom-12 right-12 font-mono text-[10px] tracking-[0.3em] text-gray-600">
            AWS / LPU
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.5fr_1fr]">

            <div>
              <div className="mb-6 flex items-center gap-4">
                <span className="h-px w-10 bg-[#ff9900]" />

                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff9900]">
                  AWS STUDENT BUILDER GROUP / LPU
                </span>
              </div>

              <h1 className="max-w-3xl font-mono text-4xl font-medium leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                PREPARE FOR
                <br />
                <span className="text-[#ff9900]">
                  AWS CERTIFICATIONS.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
                A dedicated mock examination platform built exclusively for
                the AWS Student Builder Group at LPU. Practice with curated
                questions, scheduled mocks, and detailed performance insights.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="group inline-flex h-12 items-center justify-center gap-4 bg-[#ff9900] px-7 font-mono text-xs font-bold uppercase tracking-wider text-[#111827] transition-colors hover:bg-white"
                >
                  Enter Portal

                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>

                <Link
                  href="#platform"
                  className="inline-flex h-12 items-center justify-center border border-[#3b4556] px-7 font-mono text-xs uppercase tracking-wider text-gray-300 transition-colors hover:border-[#ff9900] hover:text-white"
                >
                  Explore Platform
                </Link>
              </div>
            </div>

            {/* Hero information panel */}

            <div className="hidden lg:block">
              <div className="border border-[#2d3544] bg-[#151e2d]">
                <div className="flex items-center justify-between border-b border-[#2d3544] px-5 py-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                    PLATFORM STATUS
                  </span>

                  <span className="flex items-center gap-2 font-mono text-[10px] uppercase text-[#ff9900]">
                    <span className="h-1.5 w-1.5 bg-[#ff9900]" />
                    ACTIVE
                  </span>
                </div>

                <div className="space-y-5 p-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                      PLATFORM
                    </p>

                    <p className="mt-1 font-mono text-lg text-white">
                      AWS LPU EXAM PORTAL
                    </p>
                  </div>

                  <div className="grid grid-cols-2 border-t border-[#2d3544] pt-5">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                        ACCESS
                      </p>

                      <p className="mt-1 font-mono text-sm text-gray-300">
                        MEMBERS ONLY
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                        FOCUS
                      </p>

                      <p className="mt-1 font-mono text-sm text-gray-300">
                        AWS CERTIFICATIONS
                      </p>
                    </div>
                  </div>

                  <div className="border-l-2 border-[#ff9900] pl-4">
                    <p className="font-mono text-xs text-gray-400">
                      YOUR COMMUNITY.
                    </p>

                    <p className="mt-1 font-mono text-xs text-white">
                      YOUR PREPARATION ADVANTAGE.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* QUICK STATS */}
      {/* ===================================================== */}

      <section className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">

          <Stat value="AWS" label="CERTIFICATION FOCUS" />
          <Stat value="MCQ" label="QUESTION FORMAT" />
          <Stat value="LIVE" label="SCHEDULED SESSIONS" />
          <Stat value="LPU" label="COMMUNITY ACCESS" />

        </div>
      </section>

      {/* ===================================================== */}
      {/* PLATFORM */}
      {/* ===================================================== */}

      <section id="platform" className="border-b border-[#2d3544]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <SectionHeader
            eyebrow="// PLATFORM"
            title="EVERYTHING YOU NEED TO PREPARE"
            description="A focused examination environment without the noise of a traditional learning platform."
          />

          <div className="mt-12 grid border-l border-t border-[#2d3544] sm:grid-cols-2">

            {features.map((feature) => (
              <div
                key={feature.number}
                className="group min-h-56 border-b border-r border-[#2d3544] p-7 transition-colors hover:bg-[#151e2d]"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-[#ff9900]">
                    {feature.number}
                  </span>

                  <span className="font-mono text-xs text-gray-700 transition-colors group-hover:text-[#ff9900]">
                    ↗
                  </span>
                </div>

                <h3 className="mt-12 font-mono text-base tracking-wider">
                  {feature.title}
                </h3>

                <p className="mt-3 max-w-lg text-sm leading-6 text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* HOW IT WORKS */}
      {/* ===================================================== */}

      <section className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <SectionHeader
            eyebrow="// HOW IT WORKS"
            title="FOUR STEPS. THAT'S IT."
            description="No complicated setup. Log in, take the mock, understand your result, and improve."
          />

          <div className="mt-12 grid border-l border-t border-[#2d3544] md:grid-cols-4">

            {steps.map((step) => (
              <div
                key={step.number}
                className="min-h-52 border-b border-r border-[#2d3544] p-6"
              >
                <span className="font-mono text-xs text-[#ff9900]">
                  {step.number}
                </span>

                <h3 className="mt-12 font-mono text-sm tracking-wider">
                  {step.title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  {step.description}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* CERTIFICATIONS */}
      {/* ===================================================== */}

      <section className="border-b border-[#2d3544]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
                // PREPARATION
              </p>

              <h2 className="mt-4 font-mono text-3xl leading-tight sm:text-4xl">
                BUILT AROUND
                <br />
                AWS.
              </h2>

              <p className="mt-6 max-w-md text-sm leading-6 text-gray-500">
                Whether you're starting with the fundamentals or preparing for
                an associate-level certification, the platform grows with the
                community.
              </p>
            </div>

            <div className="grid border-l border-t border-[#2d3544] sm:grid-cols-2">

              {certifications.map((certification, index) => (
                <div
                  key={certification}
                  className="group flex min-h-32 items-end justify-between border-b border-r border-[#2d3544] p-6 transition-colors hover:bg-[#151e2d]"
                >
                  <div>
                    <span className="font-mono text-[10px] text-[#ff9900]">
                      0{index + 1}
                    </span>

                    <p className="mt-5 max-w-[180px] font-mono text-xs leading-5 tracking-wider text-gray-300">
                      AWS {certification}
                    </p>
                  </div>

                  <span className="font-mono text-xs text-gray-700 group-hover:text-[#ff9900]">
                    →
                  </span>
                </div>
              ))}

            </div>

          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* EXCLUSIVITY */}
      {/* ===================================================== */}

      <section className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <div className="relative overflow-hidden border border-[#3b4556]">

            <div className="absolute right-0 top-0 h-full w-1/3 bg-[#111827]">
              <div className="aws-grid h-full opacity-40" />
            </div>

            <div className="relative max-w-3xl p-8 sm:p-12">

              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
                // COMMUNITY ACCESS
              </p>

              <h2 className="mt-5 font-mono text-3xl leading-tight sm:text-5xl">
                NOT EVERYONE
                <br />
                GETS ACCESS.
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                The exam portal is an exclusive perk for members of the AWS
                Student Builder Group at LPU. Curated mocks, internal
                examination sessions, and performance tracking — built for the
                people building with AWS at LPU.
              </p>

              <div className="mt-8 flex items-center gap-3">
                <span className="h-2 w-2 bg-[#ff9900]" />

                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gray-400">
                  AWS SBG / LPU MEMBERS
                </span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ===================================================== */}
      {/* FINAL CTA */}
      {/* ===================================================== */}

      <section className="bg-[#ff9900] text-[#111827]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]">
                AWS STUDENT BUILDER GROUP / LPU
              </p>

              <h2 className="mt-5 max-w-3xl font-mono text-4xl font-bold leading-tight sm:text-6xl">
                READY TO TAKE
                <br />
                YOUR NEXT MOCK?
              </h2>
            </div>

            <Link
              href="/login"
              className="group inline-flex h-14 shrink-0 items-center justify-center gap-5 border-2 border-[#111827] px-8 font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-[#111827] hover:text-white"
            >
              Enter Portal

              <span className="text-lg transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>

          </div>
        </div>
      </section>

      {/* ===================================================== */}
      {/* FOOTER */}
      {/* ===================================================== */}

      <footer className="border-t border-[#2d3544] bg-[#111827]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:flex-row sm:items-center sm:justify-between lg:px-8">

          <div className="flex items-center gap-4">
            <Image
              src="/aws_sbg.png"
              alt="AWS Student Builder Group"
              width={150}
              height={45}
              className="h-8 w-auto object-contain"
            />

            <span className="h-5 w-px bg-[#2d3544]" />

            <span className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              Exam Portal
            </span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
            AWS SBG · LPU
          </p>

        </div>
      </footer>
    </main>
  );
}

function Stat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="border-r border-[#2d3544] px-5 py-6 last:border-r-0">
      <p className="font-mono text-xl text-[#ff9900]">
        {value}
      </p>

      <p className="mt-2 font-mono text-[9px] leading-4 tracking-[0.15em] text-gray-500">
        {label}
      </p>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
          {eyebrow}
        </p>

        <h2 className="mt-4 font-mono text-3xl leading-tight sm:text-4xl">
          {title}
        </h2>
      </div>

      <p className="max-w-lg text-sm leading-6 text-gray-500 lg:justify-self-end">
        {description}
      </p>
    </div>
  );
}