1) Summary / Decision

Build a deterministic, low-cost HTML/React → PDF contract generator for Haven. Contracts are rendered from a typed JSON payload into a React-based template and exported as PDF, saved to Supabase Storage, and returned as a signed URL.

Default renderer: @react-pdf/renderer (Vercel-friendly, no headless Chrome needed).
Fallback (optional later): Playwright/Chromium for pixel-perfect CSS print.

Why: Deterministic output for legal docs, simple developer workflow, no third-party SaaS fees.


2) Goals & Non‑Goals
Goals

Generate downloadable PDFs for contracts from internal Haven data.
Support versioned templates authored as React components.
Enforce schema validation (Zod) for template variables to avoid missing fields.
Store outputs with audit trail (who/when/which template version/data hash).
Return signed URL with short TTL; access logged.

Non‑Goals (Phase 1)
WYSIWYG template editor for non-devs (future).
DOCX generation (separate track).
Multi-language content (en‑AU only for Phase 1).


Users & Permissions

Admins/Finance (same role in Haven): Can render/download contracts for their organisation.
Auth model: Supabase Auth JWT. Every request must include a valid session tied to organisation_id.

# Haven — Contract PDF Generator (HTML/React ➜ PDF)



## 4) Scope (Phase 1)

**In scope**

* One canonical contract template (e.g., **SDA Tenancy/Service Agreement v1**).
* React template with page header/footer, page numbers, and simple tables.
* Dates and currency formatted en‑AU; timezone Australia/Adelaide.
* API endpoint to render/store/return a signed URL.
* Basic retries + error messages mapped to user-friendly toasts.

**Out of scope**

* Template CRUD UI (devs can ship PRs to update templates).
* HTML email of PDF (link only in Phase 1).

---

## 4.1) Phase 1 User Experience (UX)

> **Principle:** 1–click from the Funding & Contracts section within the residents page. No template editing in-app for Phase 1; users pick from pre-installed templates (shipped by devs) and get a signed URL to download. and the system knows how to fill in the variables/

### Where it lives

* **Entry point:** Contract detail page (e.g., `/contracts/:id`).
* **Primary action:** `Generate PDF Contract` button in the page header.

### Happy path (default)

1. **User clicks `Generate PDF`**

   * If there is only one active template/version for this contract type, **no dialog** appears.
   * If multiple are active, show a lightweight **Template Picker** modal with:

     * Template select (e.g., *SDA Contract v1*, *Service Agreement v1.1*)
     * Version read-only label (e.g., `v1`)
     * Render button: `Generate`

2. **System auto-fills variables**

   * Pulls all fields from backend contract context (joined view), e.g.:
     `provider.name`, `tenant.fullName`, `property.address`, `agreement.startDate`, `agreement.endDate`, `agreement.weeklyRent`, and any totals.
   * Applies **en‑AU** formatting (currency, dates) and **Australia/Adelaide** timezone.

3. **Render & store**

   * Button shows loading state: `Rendering…`
   * On success (<3s p95):

     * Toast: `PDF ready` with **Download** and **Copy link**.
     * The file also appears under a **“Documents” panel** on the Contract page with timestamp, template name, and a `Get link` action (regenerates a 15‑min signed URL).

4. **Download**

   * Clicking **Download** streams the PDF to the browser.
   * The signed URL expires after **15 minutes**; users can always re‑generate a fresh link from the Documents panel.

### Edge cases & guidance

* **Missing data:**
  If required fields fail validation (e.g., `agreement.startDate` missing), show inline error toast:
  `Can't generate: Missing 'Agreement start date'. Open Contract → Edit to fix.`
  Provide a link back to the Contract edit form.

* **Storage hiccup:**
  Toast: `Temporary issue saving the file. Please try again.` The primary button becomes `Try again` (one automatic retry in background).

* **Multiple attempts:**
  Users can render repeatedly. Each render creates a new file entry with timestamp. Prior files remain listed for audit.

* **Permissions:**
  Only authenticated users in the contract’s `organisation_id` see the button, list, or signed links.

* **No template choice (future-proofing):**
  If later we add more templates, the picker appears automatically—no UX change needed for the single-template case.

### What “easy” looks like (Phase 1)

* **Single button → file appears**, using **pre-installed** templates maintained by developers.
* All contract-specific details are **auto‑merged** from the system; **no manual field entry** required.
* The user never sees merge variables—only the final PDF and friendly errors if something’s missing.

### Out-of-scope reminders (so we don’t overbuild)

* No in-app template editor/CRUD in Phase 1.
* No HTML email attachment. Provide a **Copy link** to share instead.

---

## 5) Functional Requirements

1. **Trigger**
   From Contract detail page → “Generate PDF”. Backend loads contract data, validates against template schema, renders PDF, uploads to Storage, returns signed URL.

2. **Template System**

   * Templates live under `src/contracts/templates/<templateId>/<version>/Contract.tsx` (React PDF).
   * Each template exports:

     ```ts
     export type ContractVarsV1 = {/* zod-inferred type */}
     export const contractVarsV1Schema = z.object({
       provider: z.object({ name: z.string(), abn: z.string().optional() }),
       tenant: z.object({ fullName: z.string(), address: z.string().optional() }),
       agreement: z.object({ startDate: z.string(), endDate: z.string().optional(), weeklyRent: z.number() }),
       property: z.object({ name: z.string(), address: z.string() }),
       totals: z.object({ txns7d: z.number().default(0), txns30d: z.number().default(0), txns12m: z.number().default(0) })
     })
     ```
   * Strong typing ensures deterministic fills.

3. **Rendering**

   * Default engine: `@react-pdf/renderer` using a dedicated server route (Edge not required).
   * Page size A4, margins 24mm, fonts embedded (Inter + fallback).
   * Header with Haven branding; footer with page X of Y and document ID.

4. **Storage**

   * Bucket: `exports/contracts/`
   * Path: `exports/contracts/${organisationId}/${contractId}/${templateId}-${version}-${timestamp}.pdf`
   * Metadata: JSON with `templateId`, `version`, `dataHash(sha256)`, `render_ms`, `actor_user_id`.

5. **Linking**

   * Signed URL (TTL 15 minutes).
   * UI surfaces a toast + download button; also persist file URL in `rendered_documents` table.

6. **Observability**

   * Log: `render_started`, `render_succeeded`, `render_failed` with correlation id.
   * Metric: p50/p95 render time, error rate.

---

## 6) Non‑Functional Requirements

* p95 render < **3s** for typical 3–6 page contract.
* 0 known mismatches between numbers on screen and PDF (±1% tolerance only for currency rounding).
* Compatible with Vercel serverless (Node 18/20). Avoid native deps.

---

## 7) Data Model Changes

### Table: `templates`

* `id` (text) – e.g., `sda_contract`
* `version` (text) – e.g., `v1`
* `status` (enum: active, deprecated)
* `created_at`, `created_by`

### Table: `rendered_documents`

* `id` (uuid)
* `organisation_id` (uuid)
* `contract_id` (uuid)
* `template_id` (text)
* `template_version` (text)
* `storage_path` (text)
* `signed_url_last` (text, nullable)
* `data_hash_sha256` (text)
* `render_ms` (int)
* `rendered_by_user_id` (uuid)
* `created_at` (timestamptz)

**Note:** You can derive `templates` from code; table remains useful for flags/rollouts.

---

## 8) API Contracts

### POST `/api/contracts/:id/pdf`

**Auth:** Required (Supabase JWT).
**Body (optional):**

```json
{
  "templateId": "sda_contract",
  "version": "v1"
}
```

If omitted, use the contract’s default template + active version.

**Response 200:**

```json
{
  "documentId": "7e1…",
  "storagePath": "exports/contracts/org/ctr/…pdf",
  "signedUrl": "https://…",
  "expiresAt": "2025-10-09T04:15:00Z",
  "renderMs": 1180
}
```

**Response 4xx/5xx:**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "agreement.startDate missing" } }
```

### GET `/api/rendered-documents/:documentId`

Returns latest signed URL if the caller has access to the file’s `organisation_id`.

---

## 9) Architecture (text)

UI (Contract page button) → API route `/api/contracts/:id/pdf` → loads contract view (`contracts_view`) → builds `vars` and validate (Zod) → render ReactPDF → write to Storage → insert `rendered_documents` row → return signed URL.

Fallback path (Phase 2): API flag `?engine=playwright` to use headless Chromium print for perfect CSS.

---

## 10) Security & Compliance

* Authorise every call against `organisation_id`.
* Signed URLs short‑lived (≤15 min) and created on-demand.
* PII in logs: **never** store raw payload; store only `data_hash` + counts.
* PDF metadata stripped; include Haven doc id + timestamp in footer only.

---

## 11) Error Handling

* Validation errors → 400 with field path(s).
* Render failures → 500 with correlation id; one retry.
* Storage failures → 503; user‑facing toast “Temporary issue saving file”.

---

## 12) Testing & Acceptance Criteria

### Unit

* Zod schema rejects missing required fields.
* Currency/Date formatting snapshots (en‑AU).

### Integration

* API returns 200 with valid signed URL for seeded contract.
* Storage object exists and is downloadable; hash logged.

### Visual

* Pixel diffs for template across two known payloads (jest-image-snapshot for PNG render via ReactPDF test util).

### Acceptance

* Generate PDF from Contract page in ≤3s p95.
* Output totals match UI within ±1% rounding.
* QA signs off on typography, margins, page numbers.

---

## 13) Implementation Plan & Milestones

**M1 (Day 1–2):**

* Scaffold API route, add Zod schema, wire `contracts_view` query.
* Create minimal ReactPDF template (1–2 pages).

**M2 (Day 3–4):**

* Branding header/footer, page numbers, table component.
* Upload to Storage, insert `rendered_documents` rows.

**M3 (Day 5):**

* UI button + toast + download modal; error states.
* Tests (unit + integration) and basic metrics.

**M4 (Day 6–7):**

* Polish typography, spacing, currency/date utils.
* Doc: “How to add a new template”.

---

## 14) Developer Notes (Code Skeletons)

**API route (App Router)**

```ts
// app/api/contracts/[id]/pdf/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { contractVarsV1Schema } from "@/contracts/templates/sda_contract/v1/schema";
import { renderContractPdf } from "@/contracts/renderers/reactpdf";
import { createHash } from "crypto";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // 1) Load contract + joins via a view
  const { data: row, error } = await supabase.rpc("contracts_view_one", { contract_id: params.id });
  if (error || !row) return new Response(JSON.stringify({ error: { code: "NOT_FOUND" } }), { status: 404 });

  // 2) Build vars and validate
  const varsCandidate = buildVarsFromRow(row); // local util mapping
  const parsed = contractVarsV1Schema.safeParse(varsCandidate);
  if (!parsed.success) return new Response(JSON.stringify({ error: { code: "VALIDATION_ERROR", issues: parsed.error.issues } }), { status: 400 });

  // 3) Render PDF (Uint8Array)
  const t0 = Date.now();
  const pdfBytes = await renderContractPdf({ templateId: "sda_contract", version: "v1", vars: parsed.data });
  const renderMs = Date.now() - t0;

  // 4) Persist to Storage
  const orgId = row.organisation_id;
  const path = `exports/contracts/${orgId}/${params.id}/sda_contract-v1-${Date.now()}.pdf`;
  const { error: upErr } = await supabase.storage.from("exports").upload(path, new Blob([pdfBytes]), { upsert: true, contentType: "application/pdf" });
  if (upErr) return new Response(JSON.stringify({ error: { code: "STORAGE_WRITE_FAILED" } }), { status: 503 });

  // 5) Audit row
  const dataHash = createHash("sha256").update(JSON.stringify(parsed.data)).digest("hex");
  await supabase.from("rendered_documents").insert({
    organisation_id: orgId,
    contract_id: params.id,
    template_id: "sda_contract",
    template_version: "v1",
    storage_path: path,
    data_hash_sha256: dataHash,
    render_ms: renderMs,
  });

  // 6) Signed URL
  const { data: signed } = await supabase.storage.from("exports").createSignedUrl(path, 60 * 15);
  return new Response(JSON.stringify({ documentId: undefined, storagePath: path, signedUrl: signed?.signedUrl, renderMs }), { status: 200, headers: { "Content-Type": "application/json" } });
}
```

**ReactPDF Renderer**

```ts
// src/contracts/renderers/reactpdf.tsx
import { pdf, Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { Contract } from "@/contracts/templates/sda_contract/v1/Contract";

export async function renderContractPdf({ templateId, version, vars }: { templateId: string; version: string; vars: any }) {
  Font.register({ family: "Inter", fonts: [
    { src: "https://fonts.gstatic.com/s/inter/v12/Inter-Regular.ttf" },
    { src: "https://fonts.gstatic.com/s/inter/v12/Inter-Bold.ttf", fontWeight: 700 },
  ]});

  const styles = StyleSheet.create({ page: { padding: 40 } });

  const node = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Contract vars={vars} />
      </Page>
    </Document>
  );

  const blob = await pdf(node).toBuffer();
  return new Uint8Array(blob);
}
```

**Template example**

```tsx
// src/contracts/templates/sda_contract/v1/Contract.tsx
import { Text, View } from "@react-pdf/renderer";

export function Contract({ vars }: { vars: any }) {
  const { provider, tenant, property, agreement } = vars;
  return (
    <View>
      <Text>Haven — SDA Contract</Text>
      <Text>Provider: {provider.name}</Text>
      <Text>Tenant: {tenant.fullName}</Text>
      <Text>Property: {property.name} — {property.address}</Text>
      <Text>Agreement Start: {agreement.startDate}</Text>
      <Text>Weekly Rent: ${agreement.weeklyRent.toFixed(2)}</Text>
    </View>
  );
}
```

14.1 - Settings Update to make this feel Tangible and self serviceable for organisations

Within settings, checnge the "Integrations Tile" to be "Contract Templates"
with a contracty image
and text that says - View and manage contract templates
When the user clicks on this, they can see the templates that have been loaded into the backedn - will enrich later.


## 15) Risks & Mitigations

* **Typography/layout drift:** lock fonts; snapshot tests for key pages.
* **Large payloads:** keep vars lean; avoid embedding large images.
* **Storage errors:** retry with exponential backoff; surface graceful UI retry.

---

## 16) Future Enhancements

* Template Registry UI (activate/deprecate versions; preview with sample data).
* Multi-template bundle (service agreement + house rules appendix).
* Watermarking, redaction layers, digital signing.
* Playwright engine flag for pixel-perfect CSS print.
