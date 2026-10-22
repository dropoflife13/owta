# OWTA — UI Design & Frontend Agent Guide

**Owner:** UI/UX & Frontend Lead  
**Product:** Open Water Transparency Architecture (OWTA) for Iloilo City  
**Version:** 1.0  
**Updated:** October 2026

## Mission

Build an authoritative, credible, highly accessible public water-transparency and emergency relief-triage web platform for Iloilo City. Prioritize civic trust, clear spatial workflows, audit-friendly data density, calm visual hierarchy, and mobile-first speed over 3G/4G networks. Aim for **Linear-level clarity** and **Stripe-level consistency**—not a generic AI dashboard, decorative gradients, flashy animations, or oversized cards.

---

## 1. Non-negotiable implementation guardrails

- Use the existing **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict) + Tailwind CSS + shadcn/ui + Supabase** stack. Follow installed versions, routing, styling, Supabase clients, and component conventions. Do not create standalone HTML prototypes.
- Inspect before editing: routes, components, auth/session flow, Supabase queries, generated types, schema, Row Level Security (RLS), `package.json`, Tailwind v4 configuration, and existing `components/ui` files.
- This is a frontend and UI design task. Do not alter Supabase tables, migrations, RLS policies, authentication, server actions, API contracts, views, or business rules to make a screen easier to build.
- Dynamic pages or actions reading cookies/headers must declare `export const instant = false` (Next.js 16 Partial Prerendering compliance).
- Reuse existing Supabase clients and authorized data-access paths. Public pages read through security-invoker views (`v_public_barangay_status`, `v_public_water_index`, `v_relief_priority_queue`). Never expose service-role keys in client code or bypass RLS.
- Do not replace live data with hardcoded demo data, remove features, invent endpoints, or make controls appear functional when they are not. If backend support is missing, report the dependency instead of faking it.
- Never display personal identifiable information (PII) or exact report coordinates in public views or interfaces (Statutory Privacy & Rule WR07).
- Simulated data must always carry a prominent visual indicator (Rule WR12). Stale data (>24h) must display `unknown` with a visible staleness banner (Rule WR02, WR03).

---

## 2. Component implementation: shadcn/ui

**Use shadcn/ui as the default foundation for reusable interface primitives.** Build domain-specific components on top of it rather than creating inconsistent one-off controls.

- Inspect `package.json`, `components.json`, `app/globals.css`, and `components/ui`. Reuse existing shadcn components: `Button`, `Input`, `Label`, `Card`, `Dialog`, `Sheet`, `Table`.
- Add only the primitives needed for current work (e.g. `Badge`, `Select`, `Textarea`, `Tabs`, `DropdownMenu`, `AlertDialog`, `Skeleton`, `Tooltip`, `Separator`, `ScrollArea`).
- Use `Sheet` for mobile navigation drawers; never simply hide navigation without a usable mobile alternative.
- Use `AlertDialog` for destructive or high-impact actions (e.g., executing tanker dispatch, confirming incident resolution).
- Use `lucide-react` consistently for interface icons. Avoid raw emoji as interface icons.
- Customize shadcn components through semantic theme tokens and variants. Avoid scattered inline styles, arbitrary hex codes, and duplicate components that differ only slightly.
- Preserve full accessible behavior: semantic labels, keyboard interaction, visible focus rings, disabled/loading states, and screen-reader names (`aria-label`, `aria-describedby`).
- Do not make every component visually identical by default. Maintain token consistency while choosing suitable layouts for status boards, interactive maps, data tables, triage desks, and citizen forms.

---

## 3. Product roles and canonical workflows

Use one unified design system with role-aware navigation and actions.

- **Public Visitor / Citizen (Resident):**
  - Explores the live Citywide Barangay Status Board and Map (`/`).
  - Submits water outage reports anonymously (`/report`) with device-hashed rate limiting and optional SMS notification opt-in.
  - Tracks report progress and cluster verification status anonymously using a secure ticket token (`/report/[code]`).
  - Views the 7-day Delivery Index scoreboard (`/index`) and audits open scoring methodology (`/methodology`).
- **Barangay Official (`barangay_official`):**
  - Signs in via `/login` and accesses the Barangay Triage Desk (`/staff/reports`).
  - Strictly scoped to their assigned barangay via RLS.
  - Verifies or dismisses incident clusters, reviews citizen reports, marks verification notes.
  - Escalates verified high-severity clusters to CDRRMO for emergency relief.
- **CDRRMO LGU Dispatcher (`lgu_dispatcher`):**
  - Signs in via `/login` and accesses the citywide Relief Priority Queue (`/staff/relief`).
  - Evaluates multi-factor priority ranking (dry hours, hospital proximity, vulnerable population, cluster density).
  - Assigns and dispatches relief water tankers (`relief_dispatches`) with real-time status updates (assigned → dispatched → delivering → completed).
- **Water Utility Operator (`utility_operator`):**
  - Signs in via `/login` and accesses the Schedule Publisher (`/staff/schedules`).
  - Drafts and publishes rotational water schedules across DMA zones with PostGIS GiST non-overlap validation (`WR01`).
  - Issues urgent supply advisories (`supply_advisories`) with geographic district/barangay scoping.
- **Admin / Auditor (`admin`, `auditor`):**
  - Manages verified staff profiles and inspects immutable append-only audit logs (`audit_logs`) (Rule WR08).

### Workflow rules

1. **Anonymous Citizen Ingestion:** Citizens do not register accounts to report outages. Ingestion uses anti-abuse device hashing and CAPTCHA. Never prompt citizens to sign up or create passwords.
2. **Derive, Do Not Store:** Status (`normal`, `intermittent`, `dry`, `rationed`, `unknown`), dry hours, and relief scores are dynamically derived on the server/views—never hardcoded or edited directly as static fields.
3. **Barangay Scoping:** Barangay officials can only triage clusters within their assigned jurisdiction. The UI must clearly reflect this geographic boundary.
4. **Closed-Loop Relief:** Every tanker dispatch must tie directly to an active relief request with recorded completion volume and timestamps.
5. **Transparency & Sourcing:** Every public metric must display its underlying source (Citizen Reports, Utility Schedule, Sensor) and an `as-of` timestamp.

---

## 4. Design tokens

Define tokens centrally in `app/globals.css` using Tailwind v4 `@theme inline`. Map semantic tokens to theme variables.

### Light theme (default)

| Token | Hex / Value | Semantic Usage |
|---|---|---|
| `--color-bg` | `#FFFFFF` | Primary viewport background |
| `--color-surface` | `#F8FAFC` | Subtle card surfaces, table headers, sidebar |
| `--color-surface-hover` | `#F1F5F9` | Subtle hover state for table rows, clickable cards |
| `--color-text` | `#0F172A` | Primary body and heading text |
| `--color-muted` | `#64748B` | Secondary text, captions, metadata |
| `--color-border` | `rgba(15,23,42,0.08)` | Borders, divider lines |
| `--color-primary` | `#0284C7` (Sky-600) | Primary water actions, brand accent |
| `--color-primary-hover` | `#0369A1` (Sky-700) | Solid primary hover; no gradients |
| `--color-primary-soft` | `#E0F2FE` (Sky-100) | Subtle tint for active tabs, selected states |
| `--color-success` | `#10B981` | Normal water supply, operational status |
| `--color-warning` | `#F59E0B` | Intermittent supply, pending triage |
| `--color-danger` | `#DC2626` | Dry outage, emergency relief priority |

### Dark theme

| Token | Hex / Value | Semantic Usage |
|---|---|---|
| `--color-bg` | `#0B1220` | App viewport background |
| `--color-surface` | `#0D1526` | Content containers, card surfaces |
| `--color-surface-hover` | `#17233A` | Subtle hover state on dark UI |
| `--color-sidebar` | `#111A2E` | Navigation drawer and elevated panels |
| `--color-text` | `#F8FAFC` | Primary text |
| `--color-muted` | `#94A3B8` | Secondary text |
| `--color-border` | `rgba(56,189,248,0.15)` | Borders and dividers |
| `--color-primary-text` | `#7DD3FC` (Sky-300) | Readable sky emphasis; never use `#0284C7` as dark-mode text |

### Status color palette

Every status badge must pair its background and border with high-contrast text and a meaningful icon.

| Status | Meaning | Light theme (bg / text / border) | Dark theme (bg / text / border) |
|---|---|---|---|
| `normal` | Full pressure, normal schedule | `#ECFDF5` / `#065F46` / `#A7F3D0` | `rgba(16,185,129,0.15)` / `#34D399` / `rgba(16,185,129,0.3)` |
| `intermittent` | Low pressure, erratic supply | `#FFFBEB` / `#92400E` / `#FDE68A` | `rgba(245,158,11,0.15)` / `#FBBF24` / `rgba(245,158,11,0.3)` |
| `dry` | Zero pressure, severe outage | `#FEF2F2` / `#991B1B` / `#FECACA` | `rgba(220,38,38,0.15)` / `#F87171` / `rgba(220,38,38,0.3)` |
| `rationed` | Rotational supply or tanker active | `#F0F9FF` / `#075985` / `#BAE6FD` | `rgba(2,132,199,0.15)` / `#38BDF8` / `rgba(2,132,199,0.3)` |
| `unknown` | Stale data (>24h without reports) | `#F8FAFC` / `#475569` / `#CBD5E1` | `rgba(100,116,139,0.15)` / `#94A3B8` / `rgba(100,116,139,0.3)` |
| `simulated` | Mock/demonstration data flag | `#FAF5FF` / `#6B21A8` / `#E9D5FF` | `rgba(147,51,234,0.15)` / `#C084FC` / `rgba(147,51,234,0.3)` |

### Contrast & accessibility rules

- Target **WCAG 2.1 AA**: at least 4.5:1 for normal body text and 3:1 for large text and interactive boundaries.
- Never use `#0284C7` directly as text on dark backgrounds; use accessible light sky tint (`#7DD3FC`).
- Never communicate status by color alone; always pair colors with explicit text labels (`Dry`, `Normal`) and accessible icons.
- Focus rings must be clearly visible on keyboard navigation (`outline: 2px solid var(--ring)`).

---

## 5. Typography

| Level | Size / Line-Height | Font Family | Weight & Tracking | Usage |
|---|---|---|---|---|
| **H1** | 30px / 36px (mobile: 24px) | `Inter`, sans-serif | 600, `-0.025em` | Page header, portal titles |
| **H2** | 22px / 28px | `Inter`, sans-serif | 600, `-0.02em` | Section headers, modal titles |
| **H3** | 18px / 24px | `Inter`, sans-serif | 500, `-0.01em` | Card titles, group headers |
| **Body** | 15px / 22px | `Inter`, sans-serif | 400, normal | Primary text, table cells, form labels |
| **Caption** | 13px / 18px | `Inter`, sans-serif | 400, normal | Timestamps, metadata, footnotes |
| **Eyebrow** | 11px / 14px | `Inter`, sans-serif | 600, `0.06em` | Uppercase section badges, categories |
| **Mono / Numbers** | 14px / 20px | `ui-monospace`, JetBrains | 500, tabular-nums | Ticket codes, coordinates, scores, percentages |

- Never use sub-12px text except for short, uppercase eyebrow labels.
- Format all timestamps in `Asia/Manila` (PHT, UTC+8) with clear relative and absolute cues (e.g. `12 mins ago (14:32 PHT)`).

---

## 6. Layout and shell

- **Container:** Maximum content width `1440px`; fluid centered with `px-4 sm:px-6 lg:px-8`.
- **Spacing Scale:** Standard 4px grid: `4, 8, 12, 16, 24, 32, 48, 64px`.
- **Border Radii:** Cards `12px` (`rounded-xl`); buttons/inputs `8px` (`rounded-md`); badges/pills `999px` (`rounded-full`).
- **Elevation:** Subtle borders (`border border-border`) paired with calm shadows (`shadow-sm`). Never use heavy drop shadows.
- **Header & Navigation:**
  - Sticky public header with clear identity, live status summary, and prominent navigation: Status Board, File Report, Delivery Index, Methodology, Staff Portal.
  - Mobile viewport (<820px): Replace horizontal header with an accessible slide-over `Sheet` drawer. No clipped or overlapping menus.
- **Mobile-First Responsive Testing:** Must render seamlessly at `375px` (standard phone), `768px` (tablet), and `1280px+` (desktop). Tables must use horizontal scrolling containers with frozen header rows or stack into card views on small screens.

---

## 7. Shared component requirements

Build on shadcn/ui primitives applying OWTA tokens consistently.

- **Buttons:**
  - Variants: `default` (Sky-600), `secondary` (subtle surface), `outline` (border + surface hover), `destructive` (danger red), `ghost`, `link`.
  - States: default, hover, focus-visible, active, disabled, loading (with spinner and disabled pointer).
  - Hover cue: Solid darkening (`#0284C7` → `#0369A1`). No gradients, glows, scales, or bounces.
- **Form Controls:**
  - Persistent labels, required asterisks, descriptive help text, and actionable inline validation errors via Zod.
  - Minimum touch target: $44 \times 44\text{ px}$ on mobile screens.
- **Status Pills & Badges:**
  - Component `StatusBadge` receiving status prop (`normal`, `intermittent`, `dry`, `rationed`, `unknown`, `simulated`).
  - Displays icon + text with strictly defined theme tokens.
- **Metric Cards (KPIs):**
  - Displays big stat number, metric label, trend or confidence interval, and data source footnote (e.g. `Source: 42 citizen reports | Updated 5m ago`).
- **Data Tables:**
  - Sortable column headers with aria-sort, sticky headers, subtle row hover (`hover:bg-muted/50`), right-aligned numeric data, and empty/loading skeleton states.
- **Alert Banners:**
  - Staleness banner when data is older than 24 hours (`WR02`).
  - Simulation badge when environment or records are flagged as simulated (`WR12`).
  - Urgent supply advisory banners.

---

## 8. Role-specific screen guidance

### 8.1 Public Status Board & Map (`/`)
- **Header Summary:** Citywide operational overview: % barangays normal, intermittent, dry, rationed.
- **District / Barangay Grid:** Searchable, filterable by district (City Proper, Jaro, Molo, Mandurriao, La Paz, Lapuz, Arevalo) and status.
- **Map View:** Accessible MapLibre GL polygon/point visualizer showing district boundaries and status color fills.
- **Call-to-Action:** High-visibility banner prompting affected residents: *"Experiencing an outage? Submit a report in 30 seconds."*

### 8.2 Citizen Report & Token Tracking (`/report`, `/report/[code]`)
- **Step 1:** Select District & Barangay from dropdown.
- **Step 2:** Select Outage Severity (`dry` / `low_pressure` / `dirty_water`).
- **Step 3:** Optional Landmark / Street description (no exact house addresses).
- **Step 4:** Optional Mobile Number for SMS updates (explicit opt-in checkbox, RA 10173 consent disclosure).
- **Outcome:** Displays anonymous Ticket Code (e.g., `OWTA-7X2K9`) with one-click copy and direct link to `/report/[code]`.
- **Tracking View (`/report/[code]`):** Real-time cluster status, verification state (Unverified, Verified by Barangay, Dispatched, Resolved), and estimated restoration schedule.

### 8.3 Barangay Official Triage Desk (`/staff/reports`)
- **Scoping Indicator:** Displays authenticated official's name and assigned barangay banner.
- **Cluster List:** Active DBSCAN spatial clusters ranked by report volume and elapsed dry hours.
- **Triage Actions:**
  - "Verify Incident" button (transitions cluster to `verified`).
  - "Dismiss as Duplicate / False" button (requires confirmation).
  - "Request Relief Tanker" button (escalates to CDRRMO with vulnerable population count).
- **Incident Notes:** Audit-trailed field for official field verification observations.

### 8.4 CDRRMO Relief Priority Matrix (`/staff/relief`)
- **Relief Queue Table:** Ranked by calculated Multi-Factor Severity Score:
  $$\text{Score} = (\text{Dry Hours} \times 0.4) + (\text{Hospital Proximity} \times 0.3) + (\text{Vulnerable Pop} \times 0.2) + (\text{Cluster Reports} \times 0.1)$$
- **Dispatch Action:** Modal dialog to assign water tanker ID, driver contact, allocated capacity (liters), and target dispatch time.
- **Active Dispatches:** Real-time tracking board with step-progress: `Assigned` → `En Route` → `Distributing` → `Completed`.

### 8.5 Utility Schedule Publisher & Delivery Index (`/staff/schedules`, `/index`, `/methodology`)
- **Schedule Publisher:** Interactive table of rotational water supply schedules by DMA zone. Prevents overlapping windows via PostGIS GiST index validation.
- **Delivery Index Scoreboard (`/index`):** Public weekly score (0–100%) tracking actual hours supplied vs. published schedule.
- **Open Methodology (`/methodology`):** Step-by-step mathematical breakdown of scoring formulas and data provenance.

---

## 9. Supabase and data integrity

- All data mutations must execute through typed Server Actions (`app/staff/actions.ts`) or Route Handlers (`app/api/`).
- Enforce Server-Side RBAC: Verify `profiles.role` and `profiles.is_verified` inside Server Actions. Client-side hiding of UI elements is for UX, never for security.
- Public data must strictly flow through security-invoker views (`WITH (security_invoker = true)`).
- Preserve exact database column names: `water_reports`, `report_clusters`, `relief_dispatches`, `water_schedules`, `supply_advisories`.
- Audit Logging: Every staff mutation (verification, dispatch, schedule update) must write an immutable row to `audit_logs` (Rule WR08).

---

## 10. Accessibility and interaction quality

- **Keyboard Navigation:** Full tab order through forms, interactive tables, and modals. Escape closes sheets and dialogs.
- **Hover Transitions:** Use short, restrained transitions (`transition-colors duration-150`). Default to subtle solid darkening; never use scaling, bouncing, or animated glowing borders.
- **Touch Ergonomics:** All touch targets $\ge 44\text{ px}$. Form inputs must have legible 16px font on mobile to prevent iOS Safari auto-zoom.
- **Screen Reader Announcements:** Dynamic state changes (e.g. report submitted, dispatch confirmed) must use `aria-live="polite"` regions.

---

## 11. Definition of done for UI/UX frontend tasks

- [ ] Implemented on the existing Next.js 16 App Router + Tailwind v4 + shadcn/ui codebase.
- [ ] No hardcoded mock data in production paths; connected to Supabase security-invoker views and Server Actions.
- [ ] Role authorization verified on server; unauthorized users redirected or denied cleanly.
- [ ] Responsive layout validated at 375px mobile, 768px tablet, and desktop viewports without horizontal overflow.
- [ ] Status badges conform to the 6-status palette (`normal`, `intermittent`, `dry`, `rationed`, `unknown`, `simulated`).
- [ ] Hover states use restrained solid darkening without gradients or glow effects.
- [ ] Contrast meets WCAG 2.1 AA (4.5:1 text, 3:1 graphical elements).
- [ ] Loading skeletons, empty states, error boundaries, and stale data banners are implemented.
- [ ] `export const instant = false` added to dynamic pages reading cookies/headers.
- [ ] `npm run build` passes with zero TypeScript or linting errors.

