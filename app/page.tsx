import { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"

export const metadata: Metadata = {
  title: "Haven — Automate Your SDA Business",
  description:
    "The management platform built for Australian SDA providers. Automated billing, contract tracking, NDIS claims — all in one place.",
}

/* ────────────────────────────────────────────
   Feature data
   ──────────────────────────────────────────── */
const FEATURES = [
  {
    title: "Automated Billing",
    description:
      "Set billing frequency per contract — daily, weekly, or fortnightly. Haven creates transactions automatically while you sleep.",
  },
  {
    title: "Real-Time Dashboards",
    description:
      "See your entire portfolio at a glance — occupancy, revenue, contract balances, and upcoming billing all in one view.",
  },
  {
    title: "NDIS Claims Management",
    description:
      "Package transactions into claims, track submission status, and reconcile payments — all from one screen.",
  },
  {
    title: "Portfolio Management",
    description:
      "Houses, residents, contracts, suppliers, and owners — manage your entire SDA portfolio with occupancy tracking and room-level detail.",
  },
  {
    title: "Team Management",
    description:
      "Invite staff, control access with roles, and keep a complete audit trail of every action taken in the system.",
  },
  {
    title: "Secure & Compliant",
    description:
      "Bank-level encryption, row-level security, and comprehensive audit logs. Your data stays in Australia.",
  },
]

const STEPS = [
  {
    number: "1",
    title: "Set up your portfolio",
    description:
      "Add your houses, residents, and funding contracts. Import existing data or start fresh — you'll be up and running in under 15 minutes.",
  },
  {
    number: "2",
    title: "Enable automation",
    description:
      "Toggle automated billing on each contract. Choose daily, weekly, or fortnightly. Haven creates transactions and sends you a morning summary.",
  },
  {
    number: "3",
    title: "Review & claim",
    description:
      "Approve draft transactions, package them into NDIS claims, and submit. Track payment status and reconcile — all from one dashboard.",
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
   Inline SVG of the concentric rings logo
   (avoids an extra network request in the hero)
   ──────────────────────────────────────────── */
function RingsLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="100" cy="100" r="84" stroke="#1AAF4F" strokeWidth="20" />
      <circle cx="100" cy="100" r="57" stroke="#F0932B" strokeWidth="17" />
      <circle cx="100" cy="100" r="33" stroke="#EF4060" strokeWidth="15" />
    </svg>
  )
}

/* ────────────────────────────────────────────
   Page Component
   ──────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900 antialiased">
      {/* ───── Navigation ───── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <RingsLogo className="size-8" />
            <span className="text-xl font-semibold tracking-tight">Haven</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Pricing
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors px-5 py-2.5 rounded-full"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section className="pt-40 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          {/* Floating rings logo as brand hero element */}
          <div className="flex justify-center mb-10">
            <RingsLogo className="size-20 md:size-24" />
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08]">
            Stop managing spreadsheets.
            <br />
            <span className="text-gray-400">Start growing your SDA business.</span>
          </h1>

          <p className="mt-8 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Haven automates billing, tracks contracts, and packages NDIS claims — so you can spend less time on admin and more time on what matters.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-full transition-all duration-200"
            >
              Start Your Free Trial
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-full transition-colors"
            >
              See How It Works
            </a>
          </div>

          {/* Trust signals — minimal */}
          <div className="mt-14 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-sm text-gray-400">
            <span>30-day free trial</span>
            <span className="hidden sm:inline text-gray-200">·</span>
            <span>No credit card required</span>
            <span className="hidden sm:inline text-gray-200">·</span>
            <span>Set up in 15 minutes</span>
          </div>
        </div>
      </section>

      {/* ───── Divider with rings accent ───── */}
      <div className="flex justify-center py-4">
        <div className="w-16 h-px bg-gradient-to-r from-[#1AAF4F] via-[#F0932B] to-[#EF4060] rounded-full" />
      </div>

      {/* ───── Problem Statement ───── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            You&apos;re spending too much time on admin.
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Most SDA providers we talk to are drowning in manual processes. Sound familiar?
          </p>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto text-left">
            {[
              { pain: "Manual transaction entry", detail: "Hours spent keying in the same data every billing cycle." },
              { pain: "Spreadsheet juggling", detail: "Multiple files, no single source of truth for your portfolio." },
              { pain: "Lost contract balances", detail: "No clear view of what's been billed vs. what's remaining." },
              { pain: "Claims taking hours", detail: "Manually packaging transactions for NDIA submission." },
            ].map((item) => (
              <div
                key={item.pain}
                className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6"
              >
                <h3 className="text-base font-semibold text-gray-900">{item.pain}</h3>
                <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="py-24 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#1AAF4F]">
              Everything You Need
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              One platform. Your whole business.
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Haven replaces your spreadsheets, manual billing, and disconnected tools with a single system built specifically for SDA providers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-gray-100 rounded-3xl overflow-hidden border border-gray-100">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-8 lg:p-10"
              >
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className="py-24 px-6 bg-gray-50 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#F0932B]">
              Simple Setup
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Up and running in three steps.
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              No complex onboarding. No consultants needed. Just sign up and go.
            </p>
          </div>

          <div className="space-y-8">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex gap-6 items-start bg-white rounded-2xl border border-gray-100 p-8"
              >
                <div className="flex-shrink-0 flex items-center justify-center size-12 rounded-full bg-gray-900 text-white text-lg font-bold">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Social Proof ───── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "🇦🇺", label: "Australian Made" },
              { value: "🔒", label: "Bank-Level Security" },
              { value: "⚡", label: "15 Min Setup" },
              { value: "📊", label: "NDIS Compliant" },
            ].map((item) => (
              <div key={item.label}>
                <span className="text-3xl">{item.value}</span>
                <p className="mt-2 text-sm font-medium text-gray-600">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Pricing ───── */}
      <section id="pricing" className="py-24 px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#EF4060]">
              Simple Pricing
            </p>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">
              Plans that grow with you.
            </h2>
            <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
              Start with a 30-day free trial on any plan. No credit card required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-8 ${
                  plan.highlighted
                    ? "bg-gray-900 text-white ring-2 ring-gray-900"
                    : "bg-white border border-gray-200"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#1AAF4F] text-white text-xs font-semibold rounded-full">
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
                        className={`size-5 flex-shrink-0 ${plan.highlighted ? "text-[#1AAF4F]" : "text-[#1AAF4F]"}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      <span className={plan.highlighted ? "text-gray-300" : "text-gray-600"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={`mt-8 block w-full text-center py-3 px-6 rounded-full text-sm font-semibold transition-colors ${
                    plan.highlighted
                      ? "bg-white text-gray-900 hover:bg-gray-100"
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
      <section className="py-24 px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <RingsLogo className="size-14 mx-auto mb-8" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Ready to automate your SDA business?
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Join SDA providers who&apos;ve reclaimed hours every week. Start your free trial today — no credit card, no commitment.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-full transition-all duration-200"
            >
              Start Your Free Trial
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-white rounded-full transition-colors"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="border-t border-gray-100 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5">
                <RingsLogo className="size-7" />
                <span className="text-lg font-semibold tracking-tight">Haven</span>
              </div>
              <p className="mt-3 text-sm text-gray-500 max-w-sm">
                The SDA business management platform built for Australian disability accommodation providers.
              </p>
            </div>

            {/* Product links */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    How It Works
                  </a>
                </li>
              </ul>
            </div>

            {/* Account links */}
            <div>
              <h4 className="text-sm font-semibold mb-4">Account</h4>
              <ul className="space-y-2.5">
                <li>
                  <Link href="/signup" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    Start Free Trial
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-400">
              © {new Date().getFullYear()} Haven. All rights reserved.
            </p>
            <p className="text-sm text-gray-400">
              Made in Australia 🇦🇺
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
