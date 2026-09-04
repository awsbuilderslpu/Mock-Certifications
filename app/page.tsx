import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    title: "2000+ QUESTIONS",
    description:
      "A growing certification-focused question bank covering AWS services, domains, difficulty levels, and real exam-style scenarios.",
  },
  {
    number: "02",
    title: "FULL MOCK EXAMS",
    description:
      "Structured, timed mock examinations designed to turn your preparation into measurable exam readiness.",
  },
  {
    number: "03",
    title: "DETAILED EXPLANATIONS",
    description:
      "Review your answers after submission and understand why each option is correct or incorrect.",
  },
  {
    number: "04",
    title: "PERFORMANCE TRACKING",
    description:
      "Track scores, attempts, accuracy, and results so you know exactly where your preparation stands.",
  },
  {
    number: "05",
    title: "SCHEDULED SESSIONS",
    description:
      "Take controlled examination sessions with fixed time windows and automatic submission.",
  },
  {
    number: "06",
    title: "CERTIFICATION TRACKS",
    description:
      "Prepare across multiple AWS certification paths as the platform continues to expand.",
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
      "Select an available mock examination and review its details.",
  },
  {
    number: "03",
    title: "ATTEMPT",
    description:
      "Enter the scheduled session and complete your examination under a controlled timer.",
  },
  {
    number: "04",
    title: "IMPROVE",
    description:
      "Review your result, understand your mistakes, and prepare for the next attempt.",
  },
];

const certifications = [
  "SOLUTIONS ARCHITECT",
  "DEVELOPER",
  "SYSOPS ADMINISTRATOR",
  "CLOUD PRACTITIONER",
];

const advantages = [
  "2000+ certification-focused questions",
  "Full-length timed mock examinations",
  "Detailed post-exam explanations",
  "Performance and attempt history",
  "Scheduled internal examination sessions",
  "Multiple AWS certification tracks",
  "Built specifically for LPU students",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#111827] text-white">

      <section className="relative overflow-hidden border-b border-[#2d3544]">
        <div className="aws-grid absolute inset-0 opacity-50" />

        <div className="absolute right-0 top-0 hidden h-full w-[28%] border-l border-[#2d3544] lg:block">
          <div className="absolute right-12 top-12 h-24 w-24 bg-[#ff9900]" />
          <div className="absolute bottom-24 right-24 h-16 w-16 border border-[#ff9900]" />

          <div className="absolute bottom-12 right-12 font-mono text-[10px] tracking-[0.3em] text-gray-600">
            AWS / LPU
          </div>
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.5fr_1fr]">

            <div>
              <div className="mb-6 flex items-center gap-4">
                <span className="h-px w-10 bg-[#ff9900]" />

                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#ff9900]">
                  AWS STUDENT BUILDER GROUP / LPU
                </span>
              </div>

              <h1 className="max-w-4xl font-mono text-4xl font-medium leading-[1.02] tracking-tight sm:text-5xl lg:text-7xl">
                PREPARE FOR
                <br />
                <span className="text-[#ff9900]">
                  AWS CERTIFICATIONS.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-400 sm:text-base">
                The dedicated AWS certification preparation platform for the
                AWS Student Builder Group at LPU. Practice with a growing
                question bank, full mock examinations, scheduled sessions,
                and detailed performance insights.
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

              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-600">
                <span>2000+ QUESTIONS</span>
                <span>•</span>
                <span>FULL MOCKS</span>
                <span>•</span>
                <span>LPU EXCLUSIVE</span>
              </div>
            </div>

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

                <div className="space-y-6 p-6">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                      PLATFORM
                    </p>

                    <p className="mt-1 font-mono text-lg text-white">
                      AWS LPU EXAM PORTAL
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-5 border-t border-[#2d3544] pt-5">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                        QUESTION BANK
                      </p>

                      <p className="mt-2 font-mono text-2xl text-[#ff9900]">
                        2000+
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-gray-600">
                        MOCK EXAMS
                      </p>

                      <p className="mt-2 font-mono text-2xl text-[#ff9900]">
                        20+
                      </p>
                    </div>
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
                      YOUR COMMUNITY. YOUR GROWTH. YOUR ADVANTAGE.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">

          <Stat
            value="2000+"
            label="CURATED QUESTIONS"
          />

          <Stat
            value="20+"
            label="FULL MOCK EXAMS"
          />

          <Stat
            value="4"
            label="AWS CERTIFICATION TRACKS"
          />

          <Stat
            value="100%"
            label="LPU EXCLUSIVE"
          />

        </div>
      </section>

      <section className="border-b border-[#2d3544]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <SectionHeader
            eyebrow="// THE QUESTION BANK"
            title="2000+ QUESTIONS. ONE PLACE."
            description="Stop jumping between random question websites. Build your preparation around a growing bank of certification-focused AWS questions."
          />

          <div className="mt-12 grid border-l border-t border-[#2d3544] sm:grid-cols-2 lg:grid-cols-4">

            <Metric
              value="2000+"
              label="QUESTIONS"
            />

            <Metric
              value="4"
              label="CERTIFICATION TRACKS"
            />

            <Metric
              value="3"
              label="DIFFICULTY LEVELS"
            />

            <Metric
              value="2"
              label="QUESTION TYPES"
            />

          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">

            <div className="border border-[#2d3544] bg-[#151e2d] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9900]">
                EASY
              </p>

              <p className="mt-4 font-mono text-xl">
                BUILD THE BASE
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Strengthen your understanding of fundamental AWS concepts.
              </p>
            </div>

            <div className="border border-[#2d3544] bg-[#151e2d] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9900]">
                MEDIUM
              </p>

              <p className="mt-4 font-mono text-xl">
                TEST YOUR DEPTH
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Practice scenarios that require more than simple recall.
              </p>
            </div>

            <div className="border border-[#2d3544] bg-[#151e2d] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ff9900]">
                HARD
              </p>

              <p className="mt-4 font-mono text-xl">
                PUSH YOUR LIMITS
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-500">
                Challenge yourself with complex certification-style scenarios.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section id="platform" className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <SectionHeader
            eyebrow="// PLATFORM"
            title="MORE THAN A QUESTION BANK"
            description="Everything required to turn individual practice into structured certification preparation."
          />

          <div className="mt-12 grid border-l border-t border-[#2d3544] sm:grid-cols-2 lg:grid-cols-3">

            {features.map((feature) => (
              <div
                key={feature.number}
                className="group min-h-64 border-b border-r border-[#2d3544] p-7 transition-colors hover:bg-[#111827]"
              >
                <div className="flex items-start justify-between">
                  <span className="font-mono text-xs text-[#ff9900]">
                    {feature.number}
                  </span>

                  <span className="font-mono text-xs text-gray-700 transition-colors group-hover:text-[#ff9900]">
                    ↗
                  </span>
                </div>

                <h3 className="mt-14 font-mono text-base tracking-wider">
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

      <section className="border-b border-[#2d3544]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <SectionHeader
            eyebrow="// MOCK EXAMINATIONS"
            title="PRACTICE LIKE IT'S THE REAL THING"
            description="A question bank tells you what you know. A timed mock tells you whether you can perform under pressure."
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-[1.2fr_1fr]">

            <div className="border border-[#2d3544] bg-[#151e2d] p-8 sm:p-10">
              <div className="flex items-center justify-between border-b border-[#2d3544] pb-6">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-500">
                  MOCK EXAMINATION
                </span>

                <span className="font-mono text-[10px] uppercase text-[#ff9900]">
                  TIMED
                </span>
              </div>

              <div className="mt-10">
                <p className="font-mono text-4xl sm:text-5xl">
                  TEST.
                  <br />
                  <span className="text-[#ff9900]">
                    SUBMIT.
                  </span>
                  <br />
                  IMPROVE.
                </p>

                <p className="mt-6 max-w-xl text-sm leading-7 text-gray-500">
                  Enter scheduled sessions, work through your questions under
                  a timer, submit your attempt, and immediately get the data
                  needed to improve your next attempt.
                </p>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-px bg-[#2d3544]">
                <div className="bg-[#151e2d] p-5">
                  <p className="font-mono text-lg text-[#ff9900]">
                    TIMER
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Controlled examination window
                  </p>
                </div>

                <div className="bg-[#151e2d] p-5">
                  <p className="font-mono text-lg text-[#ff9900]">
                    RESULTS
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Detailed post-exam review
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-[#2d3544] sm:grid-cols-2 lg:grid-cols-1">

              <div className="bg-[#111827] p-7">
                <span className="font-mono text-xs text-[#ff9900]">
                  01
                </span>

                <h3 className="mt-5 font-mono text-sm tracking-wider">
                  CONTROLLED SESSIONS
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Fixed examination windows keep the experience structured.
                </p>
              </div>

              <div className="bg-[#111827] p-7">
                <span className="font-mono text-xs text-[#ff9900]">
                  02
                </span>

                <h3 className="mt-5 font-mono text-sm tracking-wider">
                  AUTOMATIC SUBMISSION
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  When the examination ends, your attempt is submitted.
                </p>
              </div>

              <div className="bg-[#111827] p-7">
                <span className="font-mono text-xs text-[#ff9900]">
                  03
                </span>

                <h3 className="mt-5 font-mono text-sm tracking-wider">
                  POST-EXAM REVIEW
                </h3>

                <p className="mt-3 text-sm leading-6 text-gray-500">
                  Review answers and explanations after submission.
                </p>
              </div>

            </div>

          </div>
        </div>
      </section>

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
                className="min-h-56 border-b border-r border-[#2d3544] p-6"
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
                Start with the fundamentals, prepare for an associate-level
                certification, or keep progressing as new certification tracks
                are added to the platform.
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

                  <span className="font-mono text-xs text-gray-700 transition-colors group-hover:text-[#ff9900]">
                    →
                  </span>
                </div>
              ))}

            </div>

          </div>
        </div>
      </section>

      <section className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <div className="relative overflow-hidden border border-[#3b4556]">

            <div className="absolute right-0 top-0 h-full w-1/3 bg-[#111827]">
              <div className="aws-grid h-full opacity-40" />
            </div>

            <div className="relative grid lg:grid-cols-[1.2fr_1fr]">

              <div className="border-b border-[#3b4556] p-8 sm:p-12 lg:border-b-0 lg:border-r">

                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
                  // THE ADVANTAGE
                </p>

                <h2 className="mt-5 font-mono text-3xl leading-tight sm:text-5xl">
                  WHY PREPARE
                  <br />
                  <span className="text-[#ff9900]">
                    ALONE?
                  </span>
                </h2>

                <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                  You can find AWS questions anywhere. What you cannot find
                  everywhere is a preparation system built specifically around
                  your community, your certification goals, and your progress.
                </p>

              </div>

              <div className="relative p-8 sm:p-12">

                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-gray-600">
                  WHAT YOU GET
                </p>

                <div className="mt-6 space-y-4">

                  {advantages.map((advantage) => (
                    <div
                      key={advantage}
                      className="flex items-start gap-4"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-[#ff9900]" />

                      <span className="font-mono text-xs leading-5 text-gray-300">
                        {advantage}
                      </span>
                    </div>
                  ))}

                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      <section className="border-b border-[#2d3544]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <div className="grid gap-10 md:grid-cols-4">

            <div className="border-l-2 border-[#ff9900] pl-5">
              <p className="font-mono text-3xl text-[#ff9900]">
                2000+
              </p>

              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                QUESTIONS
              </p>
            </div>

            <div className="border-l border-[#2d3544] pl-5">
              <p className="font-mono text-3xl">
                20+
              </p>

              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                MOCKS
              </p>
            </div>

            <div className="border-l border-[#2d3544] pl-5">
              <p className="font-mono text-3xl">
                4
              </p>

              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                TRACKS
              </p>
            </div>

            <div className="border-l border-[#2d3544] pl-5">
              <p className="font-mono text-3xl">
                1
              </p>

              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gray-500">
                COMMUNITY
              </p>
            </div>

          </div>

        </div>
      </section>

      <section className="border-b border-[#2d3544] bg-[#151e2d]">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

          <div className="relative overflow-hidden border border-[#3b4556]">

            <div className="absolute right-0 top-0 hidden h-full w-1/3 bg-[#111827] lg:block">
              <div className="aws-grid h-full opacity-40" />

              <div className="absolute right-12 top-12 font-mono text-7xl text-[#ff9900]/10">
                AWS
              </div>
            </div>

            <div className="relative max-w-3xl p-8 sm:p-12">

              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#ff9900]">
                // COMMUNITY ACCESS
              </p>

              <h2 className="mt-5 font-mono text-3xl leading-tight sm:text-5xl">
                THE PLATFORM IS PUBLIC.
                <br />
                <span className="text-[#ff9900]">
                  THE ADVANTAGE ISN'T.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-gray-500 sm:text-base">
                Anyone can learn AWS. But members of the AWS Student Builder
                Group at LPU get access to an internal examination platform
                built specifically for their certification preparation.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">

                {[
                  "2000+ question bank",
                  "Internal mock examinations",
                  "Scheduled exam sessions",
                  "Detailed post-exam review",
                  "Performance history",
                  "Certification-specific preparation",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 border border-[#2d3544] px-4 py-3"
                  >
                    <span className="h-1.5 w-1.5 bg-[#ff9900]" />

                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                      {item}
                    </span>
                  </div>
                ))}

              </div>

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

      <section className="bg-[#ff9900] text-[#111827]">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">

            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em]">
                AWS STUDENT BUILDER GROUP / LPU
              </p>

              <h2 className="mt-5 max-w-4xl font-mono text-4xl font-bold leading-tight sm:text-6xl">
                YOUR CERTIFICATION
                <br />
                IS THE GOAL.
                <br />
                <span className="text-white">
                  PRACTICE IS THE ADVANTAGE.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-6 text-[#111827]/70">
                500+ questions. Timed mocks. Detailed results. One platform
                built around your AWS preparation at LPU.
              </p>
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
    <div className="border-r border-[#2d3544] px-5 py-7 last:border-r-0">
      <p className="font-mono text-2xl text-[#ff9900] sm:text-3xl">
        {value}
      </p>

      <p className="mt-2 font-mono text-[9px] leading-4 tracking-[0.15em] text-gray-500">
        {label}
      </p>
    </div>
  );
}

function Metric({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="group border-b border-r border-[#2d3544] p-7 transition-colors hover:bg-[#151e2d]">
      <p className="font-mono text-4xl text-[#ff9900] transition-transform group-hover:translate-x-1 sm:text-5xl">
        {value}
      </p>

      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-gray-500">
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