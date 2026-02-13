import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Haven — Automate Your SDA Business",
  description: "The management platform built for Australian SDA providers. Automated billing, contract tracking, NDIS claims — all in one place.",
}

/* ────────────────────────────────────────────
   Shared style constants
   ──────────────────────────────────────────── */
const SECTION_PADDING = "px-6 md:px-12 lg:px-20"

/* ────────────────────────────────────────────
   Feature data
   ──────────────────────────────────────────── */
const FEATURES = [
  {
    icon: (
      <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    title: "Automated Billing",
    description: "Set billing frequency per contract — daily, weekly, or fortnightly. Haven creates transactions automatically while you sleep.",
  },
  {
    icon: (
      <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: "Real-Time Dashboards",
    description: "See your entire portfolio at a glance — occupancy, revenue, contract balances, and upcoming billing all in one view.",
  },
  {
    icon: (
      <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
    title: "NDIS Claims Management",
    description: "Package transactions into claims, track submission status, and reconcile payments — all from one screen.",
  },
  {
    icon: (
      <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
      </svg>
    ),
    title: "Portfolio Management",
    description: "Houses, residents, contracts, suppliers, and owners — manage your entire SDA portfolio with occupancy tracking and room-level detail.",
  },
  {
    icon: (
      <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    title: "Team Management",
    description: "Invite staff, control access with roles, and keep a complete audit trail of every action taken in the system.",
  },
  {
    icon: (
      <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: "Secure & Compliant",
    description: "Bank-level encryption, row-level security, and comprehensive audit logs. Your data stays in Australia.",
  },
]

const STEPS = [
  {
    number: "01",
    title: "Set Up Your Portfolio",
    description: "Add your houses, residents, and funding contracts. Import existing data or start fresh — you'll be up and running in under 15 minutes.",
  },
  {
    number: "02",
    title: "Enable Automation",
    description: "Toggle automated billing on each contract. Choose daily, weekly, or fortnightly. Haven creates transactions and sends you a morning summary.",
  },
  {
    number: "03",
    title: "Review & Claim",
    description: "Approve draft transactions, package them into NDIS claims, and submit. Track payment status and reconcile — all from one dashboard.",
  },
]

const PRICING = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "For solo operators getting started",
    features: [
      "Up to 5 houses",
      "Unlimited residents",
      "Automated billing",
      "Dashboard & reporting",
      "Email support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$249",
    period: "/month",
    description: "For growing SDA providers",
    features: [
      "Up to 25 houses",
      "Unlimited residents",
      "Automated billing",
      "NDIS claims management",
      "Team management (5 users)",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Growth",
    price: "$499",
    period: "/month",
    description: "For established providers scaling up",
    features: [
      "Unlimited houses",
      "Unlimited residents",
      "Automated billing",
      "NDIS claims management",
      "Unlimited team members",
      "Dedicated onboarding",
      "Phone support",
    ],
    cta: "Contact Us",
    highlighted: false,
  },
]

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ───── Navigation ───── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${SECTION_PADDING} py-4 bg-[#0b1225]/80 backdrop-blur-md border-b border-white/10`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/assets/haven-logo.svg" alt="Haven" width={32} height={32} />
            <span className="text-xl font-semibold text-white">Haven</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm text-gray-300 hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors px-5 py-2.5 rounded-lg"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero Section ───── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image
            src="/assets/haven-welcome.png"
            alt=""
            fill
            className="object-cover"
            priority
            unoptimized
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b1225]/90 via-[#0b1225]/70 to-[#0b1225]/40" />
        </div>

        <div className={`relative z-10 ${SECTION_PADDING} py-32 w-full`}>
          <div className="max-w-7xl mx-auto">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8">
                <span className="size-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-gray-200">Built for Australian SDA Providers</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
                Automate Your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
                  SDA Business
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed max-w-xl">
                Manage houses, residents, and funding contracts. Automate NDIS billing. 
                Submit claims in minutes. All in one system built for how you actually work.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25"
                >
                  Start Your Free Trial
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-white border border-white/25 hover:bg-white/10 rounded-xl transition-colors"
                >
                  See How It Works
                </a>
              </div>

              {/* Trust signals */}
              <div className="mt-12 flex flex-wrap items-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="size-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  30-day free trial
                </div>
                <div className="flex items-center gap-2">
                  <svg className="size-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <svg className="size-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                  Set up in 15 minutes
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Problem Statement ───── */}
      <section className={`${SECTION_PADDING} py-20 bg-gray-50`}>
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            You&apos;re Spending Too Much Time on Admin
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Most SDA providers we talk to are drowning in manual processes.
            Sound familiar?
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { emoji: "📝", pain: "Manual transaction entry", detail: "Hours spent keying in the same data every day" },
              { emoji: "📊", pain: "Spreadsheet juggling", detail: "Multiple files, no single source of truth" },
              { emoji: "💰", pain: "Lost contract balances", detail: "No idea what's been billed vs. what's remaining" },
              { emoji: "⏰", pain: "Claims taking hours", detail: "Manually packaging transactions for NDIA submission" },
            ].map((item) => (
              <div
                key={item.pain}
                className="bg-white rounded-2xl p-6 border border-gray-200 text-left hover:shadow-md transition-shadow"
              >
                <span className="text-3xl">{item.emoji}</span>
                <h3 className="mt-3 text-base font-semibold text-gray-900">{item.pain}</h3>
                <p className="mt-1 text-sm text-gray-500">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className={`${SECTION_PADDING} py-20 bg-white scroll-mt-20`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Everything You Need</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              One Platform. Your Whole Business.
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Haven replaces your spreadsheets, manual billing, and disconnected tools 
              with a single system built specifically for SDA providers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group relative bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center size-12 rounded-xl bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  {feature.icon}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className={`${SECTION_PADDING} py-20 bg-[#0b1225] scroll-mt-20`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Simple Setup</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-white">
              Up and Running in Three Steps
            </h2>
            <p className="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
              No complex onboarding. No consultants needed. Just sign up and go.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => (
              <div key={step.number} className="relative">
                {/* Connector line (hidden on mobile, hidden after last) */}
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-px bg-gradient-to-r from-blue-500/50 to-blue-500/10" />
                )}
                <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-colors">
                  <div className="inline-flex items-center justify-center size-16 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 text-white text-xl font-bold mb-5">
                    {step.number}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm text-gray-400 leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Social Proof / Trust ───── */}
      <section className={`${SECTION_PADDING} py-16 bg-white border-y border-gray-100`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "🇦🇺", label: "Australian Made" },
              { value: "🔒", label: "Bank-Level Security" },
              { value: "⚡", label: "15 Min Setup" },
              { value: "📊", label: "NDIS Compliant" },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-4xl">{item.value}</span>
                <p className="mt-2 text-sm font-medium text-gray-700">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className={`${SECTION_PADDING} py-20 bg-gray-50 scroll-mt-20`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Simple Pricing</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
              Plans That Grow With You
            </h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
              Start with a 30-day free trial on any plan. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 ${
                  plan.highlighted
                    ? "bg-[#0b1225] text-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]"
                    : "bg-white text-gray-900 border border-gray-200"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>
                  {plan.name}
                </h3>
                <p className={`mt-1 text-sm ${plan.highlighted ? "text-gray-400" : "text-gray-500"}`}>
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? "text-gray-400" : "text-gray-500"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <svg
                        className={`size-5 flex-shrink-0 ${plan.highlighted ? "text-blue-400" : "text-green-500"}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className={plan.highlighted ? "text-gray-300" : "text-gray-600"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`mt-8 block w-full text-center py-3 px-6 rounded-xl text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-blue-600 text-white hover:bg-blue-500"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/assets/haven-login-bg.png"
            alt=""
            fill
            className="object-cover"
            unoptimized
          />
          <div className="absolute inset-0 bg-[#0b1225]/85" />
        </div>

        <div className={`relative z-10 ${SECTION_PADDING}`}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Ready to Stop Managing Billing and Start Growing Your Business?
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              Join SDA providers who&apos;ve reclaimed hours every week with automated billing. 
              Start your free trial today — no credit card, no commitment.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25"
              >
                Start Your Free Trial
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-white border border-white/25 hover:bg-white/10 rounded-xl transition-colors"
              >
                Sign In to Existing Account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className={`${SECTION_PADDING} py-12 bg-[#0b1225] border-t border-white/10`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <Image src="/assets/haven-logo.svg" alt="Haven" width={28} height={28} />
                <span className="text-lg font-semibold text-white">Haven</span>
              </div>
              <p className="mt-3 text-sm text-gray-400 max-w-sm">
                The SDA business management platform built for Australian disability accommodation providers.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="text-sm text-gray-400 hover:text-white transition-colors">How It Works</a></li>
              </ul>
            </div>

            {/* Account links */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Account</h4>
              <ul className="space-y-2.5">
                <li><Link href="/signup" className="text-sm text-gray-400 hover:text-white transition-colors">Start Free Trial</Link></li>
                <li><Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Haven. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>🇦🇺</span>
              <span>Made in Australia</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
