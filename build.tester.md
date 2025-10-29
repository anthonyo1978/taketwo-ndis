Build Tester (Vercel Pre-Build)

Goal: run the same checks Vercel will run before pushing, so we ship once instead of build→fail loops.

What this does

Ensures tooling parity (Node 20.x, pnpm 10).

Pulls Vercel envs for local builds.

Runs TypeScript typecheck and next build locally.

(Optional) Runs vercel build to mirror Vercel’s CI exactly.

Guides an AI agent (Cursor) to auto-fix common Next 15 issues (notably json() typed as unknown) and server/client boundary mistakes.

1) Prerequisites

Node: 20.x (use asdf, nvm, or Volta to pin).

pnpm: 10.x

Vercel CLI: npm i -g vercel

package.json (enforce parity)

{
  "packageManager": "pnpm@10.0.0",
  "engines": { "node": "20.x" },
  "scripts": {
    "dev": "next dev",
    "typecheck": "tsc --noEmit",
    "build": "next build",
    "start": "next start",
    "preflight": "pnpm typecheck && pnpm build"
  }
}


Vercel Project → Build & Output Settings

Install Command: pnpm install --frozen-lockfile

Build Command: pnpm build

Output Directory: .next

2) One-time setup (local)
# link to Vercel project & pull envs (creates .vercel dir & .env.*)
vercel link
vercel pull

# install deps with locked versions
pnpm install --frozen-lockfile


If you use multiple environments, vercel pull lets you choose Production or Preview to mirror.

3) Run the pre-flight (before every push)
# quick pass (same as Vercel's next build)
pnpm run preflight

# deeper parity (runs Vercel’s full build pipeline locally)
vercel build


Fix until both commands complete without errors.

Only then push or open a PR.

4) Add a tiny helper to fix the common Next 15 pitfall

Create lib/http.ts:

// lib/http.ts
export async function safeJson<T>(res: Response | { json: () => Promise<unknown> }): Promise<T> {
  return (await res.json()) as T; // swap to a Zod parse when you have schemas
}


Use it (example):

import { safeJson } from "@/lib/http";

type SettingsResult =
  | { success: true;  data: AutomationSettings }
  | { success: false; error: string };

const result = await safeJson<SettingsResult>(response);
if (result.success) setSettings(result.data);
else console.error(result.error);


For API routes, validate requests (Zod):

import { z } from "zod";
const Body = z.object({
  contractId: z.string(),
  amount: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  frequency: z.enum(["weekly","fortnightly","monthly","once"]),
  action: z.enum(["calculate","save"])
});

export async function POST(req: Request) {
  const body = Body.parse(await req.json()); // narrows unknown safely
  // ...
  return Response.json({ ok: true });
}

5) Guardrails (optional but recommended)
a) Pre-push hook (stop bad pushes)
pnpm dlx husky-init && pnpm install


Replace the generated hook with .husky/pre-push:

#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
pnpm typecheck && pnpm build || { echo "❌ typecheck/build failed"; exit 1; }

b) CI to mirror Vercel (GitHub Actions)

Create .github/workflows/ci.yml:

name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm build

6) Cursor / AI Agent Prompt (paste into your agent)

Role: Pre-deploy Build Doctor (Next.js 15 + Vercel + Supabase)
Objective: Ensure pnpm typecheck, pnpm build, and vercel build pass locally with Node 20.x and pnpm 10.
Steps:

Verify package.json has "packageManager": "pnpm@10.x" and "engines": { "node": "20.x" }.

Run pnpm install --frozen-lockfile, pnpm typecheck, pnpm build.

List all errors grouped by file/line, propose minimal edits.

Auto-patch all await res.json() / await req.json() sites to use safeJson<T>() or Zod schemas before property access.

Ensure React state setters don’t receive undefined when state is Foo | null (use ?? null or stricter API result types with discriminated unions).

Add export const runtime = 'nodejs' to any route using Node APIs or service-role keys.

Confirm no server-only envs appear in client/imported-by-client files. Move those to lib/server/*.

(Optional) Run vercel build and summarize any remaining gaps.
Acceptance: No remaining type errors; builds succeed locally; no unsafe JSON access remains.

7) Health checks & env sanity

Create app/api/health/route.ts:

import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV,
    hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    hasService: !!process.env.SUPABASE_SERVICE_ROLE_KEY
  });
}


After deploy: visit /api/health to confirm env wiring.

8) Repo conventions (to avoid future landmines)

One package manager (pnpm). Don’t keep package-lock.json.

Pin Node major: "20.x" (avoid ">=20" drift).

Keep a fresh .env.example with all required keys.

For Vercel Hobby: cron jobs once/day only. Use GitHub Actions or Supabase Scheduler for hourly.

9) Troubleshooting quickies

Type error: usually json() → unknown. Use safeJson<T>() or Zod.

State setter mismatch: coalesce undefined to null or tighten API types.

Server/client mixup: add runtime = 'nodejs'; keep secrets in server-only modules.

Vercel uses npm but repo has pnpm lock: set Install Command to pnpm install --frozen-lockfile.

Workflow

vercel pull → pnpm i --frozen-lockfile

pnpm typecheck → pnpm build (fix)

vercel build (optional parity)

Push/PR → Vercel goes green ✅