#!/usr/bin/env bash
set -euo pipefail

# --- Docs & Root ---
mkdir -p docs/tickets
for doc in CONTEXT PROBLEM PITCH SPEC LATER METHODOLOGY PRIVACY RUNBOOK; do touch "docs/${doc}.md"; done
touch CLAUDE.md
touch .env.example

# --- Supabase Migrations ---
mkdir -p supabase/migrations supabase/tests
touch supabase/config.toml supabase/seed.sql supabase/tests/rls_and_views.sql
for i in 0001_extensions 0002_geography 0003_identity 0004_monitoring_supply 0005_methodology_index 0006_reports 0007_relief_alerts 0008_governance_audit 0009_views_and_rls; do
  touch "supabase/migrations/${i}.sql"
done

# --- Public Assets ---
mkdir -p public/geo
touch public/geo/iloilo-barangays.geojson

# --- SRC / App Router ---
mkdir -p "src/app/(public)/b/[barangayId]" "src/app/(public)/map" "src/app/(public)/report" "src/app/(public)/methodology" "src/app/(public)/advisories"
touch "src/app/(public)/page.tsx" "src/app/(public)/b/[barangayId]/page.tsx" "src/app/(public)/map/page.tsx" "src/app/(public)/report/page.tsx" "src/app/(public)/methodology/page.tsx" "src/app/(public)/advisories/page.tsx"

mkdir -p "src/app/(auth)/login"
touch "src/app/(auth)/login/page.tsx"

mkdir -p src/app/staff/{reports,relief,schedules,readings,advisories,index}
touch src/app/staff/layout.tsx
touch src/app/staff/reports/page.tsx src/app/staff/relief/page.tsx src/app/staff/schedules/page.tsx src/app/staff/readings/page.tsx src/app/staff/advisories/page.tsx src/app/staff/index/page.tsx

mkdir -p src/app/admin/{users,methodology,audit}
touch src/app/admin/users/page.tsx src/app/admin/methodology/page.tsx src/app/admin/audit/page.tsx

# --- API Routes ---
mkdir -p "src/app/api/public/barangays/[id]" "src/app/api/public/index" "src/app/api/reports/[id]" "src/app/api/schedules/[id]" "src/app/api/readings" "src/app/api/relief/priority" "src/app/api/dispatches" "src/app/api/subscriptions/verify" "src/app/api/webhooks/sms" "src/app/api/cron" "src/app/api/health"
touch "src/app/api/public/barangays/route.ts" "src/app/api/public/barangays/[id]/route.ts" "src/app/api/public/index/route.ts"
touch "src/app/api/reports/route.ts" "src/app/api/reports/[id]/route.ts"
touch "src/app/api/schedules/route.ts" "src/app/api/schedules/[id]/route.ts"
touch "src/app/api/readings/route.ts" "src/app/api/relief/priority/route.ts" "src/app/api/dispatches/route.ts"
touch "src/app/api/subscriptions/route.ts" "src/app/api/subscriptions/verify/route.ts"
touch "src/app/api/webhooks/sms/route.ts" "src/app/api/cron/route.ts" "src/app/api/health/route.ts"

# --- Components & Lib ---
mkdir -p src/components/{ui,map,charts,status,forms}
touch src/components/map/BarangayMap.tsx src/components/charts/PromisedVsDeliveredChart.tsx src/components/charts/PressureTrendChart.tsx src/components/status/StatusPill.tsx src/components/status/StaleBanner.tsx src/components/status/SourceBadge.tsx
touch src/components/forms/ReportForm.tsx src/components/forms/ScheduleForm.tsx src/components/forms/ReadingForm.tsx src/components/forms/TriageForm.tsx

mkdir -p src/lib/{supabase,sms}
touch src/lib/supabase/client.ts src/lib/supabase/server.ts src/lib/supabase/middleware.ts src/lib/supabase/types.ts
touch src/lib/permissions.ts src/lib/validators.ts src/lib/rateLimit.ts src/lib/captcha.ts src/lib/index-method.ts src/lib/sms/provider.ts

echo "✅ OWTA folder structure created successfully!"
